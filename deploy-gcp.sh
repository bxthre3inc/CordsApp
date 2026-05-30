#!/bin/bash
# Cords — one-shot GCP setup and first deployment script.
# Run this once to provision infrastructure; after that, Cloud Build handles CI/CD.
#
# Prerequisites: gcloud CLI, docker, psql (for migrations).
# Install gcloud: https://cloud.google.com/sdk/docs/install

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}$*${NC}"; }
success() { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
die()     { echo -e "${RED}✗ $*${NC}"; exit 1; }

echo -e "${CYAN}  Cords — GCP Deployment Script${NC}"; echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────────
info "Checking prerequisites..."
command -v gcloud >/dev/null || die "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
command -v docker  >/dev/null || die "Docker not found. Install: https://docs.docker.com/get-docker/"
success "Prerequisites OK"

# ── Configuration ──────────────────────────────────────────────────────────────
echo ""; info "Configuration"
PROJECT_ID="${GCP_PROJECT_ID:-ai-studio-applet-webapp-b7f1b}"
echo "  GCP Project : $PROJECT_ID"
read -rp "  Region [us-central1]: " REGION; REGION="${REGION:-us-central1}"

INSTANCE_NAME="cords-postgres"
DB_NAME="cords_db"
DB_USER="postgres"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/cords-repo"
CLOUDSQL_CONN="$PROJECT_ID:$REGION:$INSTANCE_NAME"

# ── GCP project setup ──────────────────────────────────────────────────────────
echo ""; info "Configuring GCP project..."
gcloud config set project "$PROJECT_ID" --quiet
gcloud config set compute/region "$REGION" --quiet

info "Enabling APIs (first time takes ~1 min)..."
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com cloudresourcemanager.googleapis.com \
  --quiet
success "APIs enabled"

# ── Artifact Registry ──────────────────────────────────────────────────────────
echo ""; info "Artifact Registry..."
if ! gcloud artifacts repositories describe cords-repo --location="$REGION" &>/dev/null; then
  gcloud artifacts repositories create cords-repo \
    --repository-format=docker --location="$REGION" --quiet
fi
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
success "Artifact Registry ready"

# ── Cloud SQL ──────────────────────────────────────────────────────────────────
echo ""; info "Cloud SQL (PostgreSQL 15)..."
DB_PASSWORD=""
if ! gcloud sql instances describe "$INSTANCE_NAME" &>/dev/null; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)
  info "Creating instance (3–5 min)..."
  gcloud sql instances create "$INSTANCE_NAME" \
    --database-version=POSTGRES_15 --tier=db-g1-small \
    --region="$REGION" --storage-size=20GB --storage-auto-increase \
    --backup-start-time=04:00 --quiet
  gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME" --quiet
  gcloud sql users set-password "$DB_USER" --instance="$INSTANCE_NAME" \
    --password="$DB_PASSWORD" --quiet
  success "Cloud SQL created"
else
  success "Cloud SQL already exists"
  read -rsp "  Existing DB password: " DB_PASSWORD; echo
fi

# ── Secret Manager ─────────────────────────────────────────────────────────────
echo ""; info "Storing secrets in Secret Manager..."

put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" &>/dev/null; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --quiet
  fi
  success "secret: $name"
}

JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')
put_secret "db-password"  "$DB_PASSWORD"
put_secret "jwt-secret"   "$JWT_SECRET"

echo ""
warn "Stripe keys — use TEST keys now, swap to live when ready."
warn "Get them at: https://dashboard.stripe.com/test/apikeys"
read -rsp "  Stripe Secret Key (sk_test_...): "      STRIPE_SK; echo
read -rsp "  Stripe Publishable Key (pk_test_...): " STRIPE_PK; echo
put_secret "stripe-secret"          "$STRIPE_SK"
put_secret "stripe-publishable-key" "$STRIPE_PK"
# Webhook secret is set after deploy — store a placeholder now
put_secret "stripe-webhook-secret"  "placeholder_update_after_deploy"

echo ""
warn "Gmail SMTP — requires an App Password (not your login password)."
warn "Enable at: https://myaccount.google.com/apppasswords  (needs 2FA on)"
read -rp  "  Gmail address: "                        GMAIL_USER
read -rsp "  Gmail App Password (16 chars): "        GMAIL_PASS; echo
put_secret "smtp-user" "$GMAIL_USER"
put_secret "smtp-pass" "$GMAIL_PASS"
put_secret "smtp-from" "Cords <${GMAIL_USER}>"

# ── Cloud Build IAM permissions ────────────────────────────────────────────────
echo ""; info "Granting Cloud Build service account permissions..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
for role in roles/run.admin roles/iam.serviceAccountUser roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CB_SA" --role="$role" --quiet
done
success "Cloud Build permissions set"

# ── Build and push Docker images ───────────────────────────────────────────────
echo ""; info "Building Docker images..."
docker build -t "$REGISTRY/backend:latest"  -f backend/Dockerfile  ./backend
docker build -t "$REGISTRY/frontend:latest" -f frontend/Dockerfile ./frontend
info "Pushing to Artifact Registry..."
docker push "$REGISTRY/backend:latest"
docker push "$REGISTRY/frontend:latest"
success "Images built and pushed"

# ── Deploy backend ─────────────────────────────────────────────────────────────
echo ""; info "Deploying backend to Cloud Run..."
gcloud run deploy cords-backend \
  --image="$REGISTRY/backend:latest" \
  --region="$REGION" --platform=managed \
  --memory=512Mi --cpu=1 \
  --min-instances=0 --max-instances=10 \
  --timeout=60 --concurrency=100 \
  --set-cloudsql-instances="$CLOUDSQL_CONN" \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=8080,\
DB_HOST=/cloudsql/$CLOUDSQL_CONN,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,\
SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_SECURE=false" \
  --update-secrets="\
DB_PASSWORD=db-password:latest,\
JWT_SECRET=jwt-secret:latest,\
STRIPE_SECRET_KEY=stripe-secret:latest,\
STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
SMTP_USER=smtp-user:latest,\
SMTP_PASS=smtp-pass:latest,\
SMTP_FROM=smtp-from:latest" \
  --quiet

BACKEND_URL=$(gcloud run services describe cords-backend \
  --region="$REGION" --format='value(status.url)')
success "Backend: $BACKEND_URL"

# ── Deploy frontend ────────────────────────────────────────────────────────────
echo ""; info "Deploying frontend to Cloud Run..."
gcloud run deploy cords-frontend \
  --image="$REGISTRY/frontend:latest" \
  --region="$REGION" --platform=managed \
  --memory=256Mi --cpu=1 \
  --min-instances=0 --max-instances=5 \
  --timeout=30 --allow-unauthenticated \
  --set-env-vars="BACKEND_URL=$BACKEND_URL" \
  --quiet

FRONTEND_URL=$(gcloud run services describe cords-frontend \
  --region="$REGION" --format='value(status.url)')
success "Frontend: $FRONTEND_URL"

# ── Database migrations ────────────────────────────────────────────────────────
echo ""; info "Running database migrations via Cloud SQL Auth Proxy..."
warn "This step requires psql to be installed (brew install postgresql / apt install postgresql-client)."

PROXY_BIN="/tmp/cloud-sql-proxy"
if [ ! -f "$PROXY_BIN" ]; then
  info "Downloading Cloud SQL Auth Proxy..."
  curl -sSL \
    "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.9.0/cloud-sql-proxy.linux.amd64" \
    -o "$PROXY_BIN" && chmod +x "$PROXY_BIN"
fi

"$PROXY_BIN" --port=15432 "$CLOUDSQL_CONN" &
PROXY_PID=$!
sleep 4

for sql_file in database/schema.sql database/migration_*.sql; do
  [ -f "$sql_file" ] || continue
  info "  $sql_file"
  PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 15432 -U "$DB_USER" -d "$DB_NAME" -f "$sql_file" -q
done

kill "$PROXY_PID" 2>/dev/null || true
success "Migrations complete"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  App  : $FRONTEND_URL"
echo "  API  : $BACKEND_URL"
echo "  Test : curl $BACKEND_URL/api/health"
echo ""
echo -e "${YELLOW}Required next step — register Stripe webhook:${NC}"
echo "  1. Go to https://dashboard.stripe.com/test/webhooks"
echo "  2. Add endpoint: $BACKEND_URL/api/payments/webhook"
echo "  3. Select events: payment_intent.succeeded, customer.subscription.*"
echo "  4. Copy the signing secret (whsec_...) then run:"
echo ""
echo "     echo 'whsec_YOUR_SECRET' | \\"
echo "       gcloud secrets versions add stripe-webhook-secret --data-file=-"
echo "     gcloud run services update cords-backend --region=$REGION \\"
echo "       --update-secrets=STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest"
echo ""
echo -e "${YELLOW}Wire up CI/CD (push-to-deploy):${NC}"
echo "  https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
echo "  → Create trigger → GitHub → Branch: main → Config: cloudbuild.yaml"
echo ""
echo -e "${YELLOW}Save securely (already in Secret Manager):${NC}"
echo "  DB Password : $DB_PASSWORD"
