# Deploy Cords to Google Cloud Platform

Complete guide to deploy Cords marketplace to Google Cloud for production.

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Users (Internet)                        │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │  Cloud   │          │  Cloud   │
    │  CDN     │          │   Run    │
    │(Frontend)│          │ (Backend)│
    └────┬─────┘          └─────┬────┘
         │                      │
         │      ┌──────────────┐│
         │      │  Cloud SQL   ││
         │      │ (PostgreSQL) ││
         │      └──────────────┘│
         │                      │
    ┌────▼──────────────────────▼─┐
    │   Cloud Storage             │
    │   (Assets & Backups)        │
    └─────────────────────────────┘
```

## Prerequisites

- Google Cloud Platform account
- `gcloud` CLI installed
- Docker installed (for building images)
- Project billing enabled

## Step 1: Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Ubuntu/Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize
gcloud init
gcloud auth login
```

## Step 2: Create GCP Project

```bash
# Set project ID
export PROJECT_ID="cords-marketplace"

# Create project
gcloud projects create $PROJECT_ID

# Set as default
gcloud config set project $PROJECT_ID

# Enable billing
gcloud billing projects link $PROJECT_ID --billing-account=<BILLING_ACCOUNT_ID>
```

## Step 3: Enable Required APIs

```bash
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudresourcemanager.googleapis.com
```

## Step 4: Set Up Cloud SQL (PostgreSQL)

### Create Cloud SQL Instance

```bash
# Set variables
export INSTANCE_NAME="cords-postgres"
export REGION="us-central1"
export DB_NAME="cords_db"
export DB_USER="postgres"
export DB_PASSWORD="$(openssl rand -base64 32)"

# Create instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=$REGION \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --availability-type=REGIONAL

# Create database
gcloud sql databases create $DB_NAME \
  --instance=$INSTANCE_NAME

# Create user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password=$DB_PASSWORD

# Get connection name
export CLOUDSQL_CONNECTION=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)')

echo "Save this connection name: $CLOUDSQL_CONNECTION"
echo "Database password: $DB_PASSWORD"
```

### Initialize Database Schema

```bash
# Get instance IP
export INSTANCE_IP=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(ipAddresses[0].ipAddress)')

# Run migration (from local)
PGPASSWORD=$DB_PASSWORD psql \
  -h $INSTANCE_IP \
  -U $DB_USER \
  -d $DB_NAME \
  -f database/schema.sql

# Verify
PGPASSWORD=$DB_PASSWORD psql \
  -h $INSTANCE_IP \
  -U $DB_USER \
  -d $DB_NAME \
  -c "\dt"
```

## Step 5: Build and Push Docker Images

### Create Artifact Registry

```bash
# Create repository
gcloud artifacts repositories create cords-repo \
  --repository-format=docker \
  --location=$REGION

# Configure Docker authentication
gcloud auth configure-docker $REGION-docker.pkg.dev
```

### Build Backend Image

```bash
# Navigate to backend
cd backend

# Build image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest .

# Push to registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest
```

### Build Frontend Image

```bash
# Create Dockerfile for frontend
cat > frontend/Dockerfile << 'EOF'
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create nginx.conf
cat > frontend/nginx.conf << 'EOF'
events { worker_connections 1024; }

http {
  server {
    listen 80;
    location / {
      root /usr/share/nginx/html;
      try_files $uri $uri/ /index.html;
    }
    location /api/ {
      proxy_pass https://backend.example.com/api/;
    }
  }
}
EOF

# Navigate to frontend
cd frontend

# Build image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest .

# Push to registry
docker push $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest
```

## Step 6: Deploy Backend to Cloud Run

### Create Secret for Environment Variables

```bash
# Create .env.production for backend
cat > /tmp/backend-env.txt << 'EOF'
NODE_ENV=production
PORT=8080
DB_HOST=/cloudsql/CONNECTION_NAME
DB_PORT=5432
DB_NAME=cords_db
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
JWT_SECRET=YOUR_JWT_SECRET_CHANGE_THIS
STRIPE_SECRET_KEY=sk_live_your_key
MAPBOX_TOKEN=your_token
APP_URL=https://your-domain.com
API_URL=https://api.your-domain.com
EOF

# Create secret
gcloud secrets create backend-env --data-file=/tmp/backend-env.txt

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding backend-env \
  --member=serviceAccount:PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Deploy Backend

```bash
gcloud run deploy cords-backend \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest \
  --region=$REGION \
  --platform=managed \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --set-cloudsql-instances=$CLOUDSQL_CONNECTION \
  --allow-unauthenticated \
  --set-env-vars="DB_HOST=/cloudsql/$CLOUDSQL_CONNECTION" \
  --update-secrets="DB_PASSWORD=backend-env:latest" \
  --update-secrets="JWT_SECRET=backend-env:latest" \
  --update-secrets="STRIPE_SECRET_KEY=backend-env:latest" \
  --update-secrets="MAPBOX_TOKEN=backend-env:latest"

# Get backend URL
export BACKEND_URL=$(gcloud run services describe cords-backend \
  --region=$REGION \
  --format='value(status.url)')

echo "Backend deployed to: $BACKEND_URL"
```

## Step 7: Deploy Frontend to Cloud Run or Cloud Storage

### Option A: Cloud Run (Recommended for SPA)

```bash
# Update frontend .env with backend URL
cat > frontend/.env.production << EOF
REACT_APP_API_URL=$BACKEND_URL/api
REACT_APP_MAPBOX_TOKEN=your_token
REACT_APP_STRIPE_KEY=pk_live_your_key
EOF

# Build and push frontend
cd frontend
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest

# Deploy to Cloud Run
gcloud run deploy cords-frontend \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest \
  --region=$REGION \
  --platform=managed \
  --memory=256Mi \
  --allow-unauthenticated

# Get frontend URL
export FRONTEND_URL=$(gcloud run services describe cords-frontend \
  --region=$REGION \
  --format='value(status.url)')

echo "Frontend deployed to: $FRONTEND_URL"
```

### Option B: Cloud Storage + CDN

```bash
# Build frontend
cd frontend
npm run build

# Create bucket
gsutil mb -l $REGION gs://$PROJECT_ID-frontend

# Upload build
gsutil -m cp -r build/* gs://$PROJECT_ID-frontend/

# Make public
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-frontend

# Setup website
gsutil web set -m index.html -e index.html gs://$PROJECT_ID-frontend

# Get storage URL
echo "Frontend URL: https://storage.googleapis.com/$PROJECT_ID-frontend/index.html"
```

## Step 8: Setup Custom Domain

### Register Domain and Configure DNS

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create cords-cert \
  --domains=cords.example.com,www.cords.example.com

# Create backend load balancer
gcloud compute backend-services create cords-backend-service \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTPS

# Create forwarding rule
gcloud compute forwarding-rules create cords-https-rule \
  --global \
  --target-https-proxy=cords-proxy \
  --address=cords-ip \
  --ports=443

# Update DNS records at registrar
# A record: cords.example.com -> [IP from forwarding rule]
```

## Step 9: Setup Monitoring and Logging

### Enable Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Create log sink
gcloud logging sinks create cords-logs \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/cords_logs \
  --log-filter='resource.type="cloud_run_revision"'
```

### Setup Alerts

```bash
# Create notification channel
gcloud alpha monitoring channels create \
  --display-name="Email Alert" \
  --type=email \
  --channel-labels=email_address=your-email@example.com

# Create alert policy (via Console recommended)
```

## Step 10: Setup CI/CD with Cloud Build

### Create cloudbuild.yaml

```yaml
# Save as: cloudbuild.yaml
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:$SHORT_SHA'
      - '-t'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest'
      - '-f'
      - 'backend/Dockerfile'
      - './backend'

  # Push backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest'

  # Deploy backend
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/'
      - '--image=$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest'
      - '--location=$_REGION'

  # Build and deploy frontend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest'
      - './frontend'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest'

images:
  - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest'
  - '$_REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest'

substitutions:
  _REGION: 'us-central1'
```

### Connect GitHub Repository

```bash
# Create GitHub connection
gcloud builds connect --repository-name=CordsApp \
  --repository-owner=your-github-username \
  --region=$REGION

# Create build trigger
gcloud builds triggers create github \
  --repo-name=CordsApp \
  --repo-owner=your-github-username \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --name=cords-deploy
```

## Step 11: Setup Database Backups

```bash
# Enable automated backups
gcloud sql instances patch $INSTANCE_NAME \
  --backup-start-time=03:00 \
  --retained-backups-count=30 \
  --transaction-log-retention-days=7

# Create manual backup
gcloud sql backups create --instance=$INSTANCE_NAME

# Export to Cloud Storage
gcloud sql export sql $INSTANCE_NAME \
  gs://$PROJECT_ID-backups/backup-$(date +%Y%m%d).sql \
  --database=$DB_NAME
```

## Step 12: Environment Configuration

### Update .env for Production

**Backend (.env.production):**
```env
NODE_ENV=production
PORT=8080
DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE
DB_PORT=5432
DB_NAME=cords_db
DB_USER=postgres
DB_PASSWORD=secure_password
JWT_SECRET=long_random_secret_key
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY
MAPBOX_TOKEN=your_token
APP_URL=https://cords.example.com
API_URL=https://api.cords.example.com
SENDGRID_API_KEY=SG.YOUR_KEY
```

**Frontend (.env.production):**
```env
REACT_APP_API_URL=https://api.cords.example.com/api
REACT_APP_MAPBOX_TOKEN=your_token
REACT_APP_STRIPE_KEY=pk_live_YOUR_KEY
```

## Step 13: Verify Deployment

```bash
# Check backend service
curl $BACKEND_URL/api/health

# Check frontend
curl $FRONTEND_URL

# Check database connection
gcloud sql connect $INSTANCE_NAME --user=$DB_USER

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cords-backend" --limit=50 --format=json
```

## Step 14: Setup Custom Domain

```bash
# Create DNS record pointing to load balancer IP
# Option: Use Cloud DNS

# Create DNS zone
gcloud dns managed-zones create cords-zone \
  --dns-name=cords.example.com. \
  --description="Cords marketplace DNS"

# Get nameservers
gcloud dns managed-zones describe cords-zone --format="value(nameServers[])"

# Update registrar nameservers

# Add A record
gcloud dns record-sets create cords.example.com. \
  --rrdatas=BACKEND_IP \
  --ttl=300 \
  --type=A \
  --zone=cords-zone

# Add CNAME for API
gcloud dns record-sets create api.cords.example.com. \
  --rrdatas=cords-backend.run.app. \
  --ttl=300 \
  --type=CNAME \
  --zone=cords-zone
```

## Troubleshooting

### Backend won't connect to database
```bash
# Check Cloud SQL proxy
gcloud sql instances describe $INSTANCE_NAME --format='value(settings.ipConfiguration.authorizedNetworks)'

# Update authorized networks
gcloud sql instances patch $INSTANCE_NAME \
  --authorized-networks=0.0.0.0/0
```

### Frontend can't reach backend
```bash
# Check CORS configuration in backend
# Update CORS_ORIGIN in .env

# Check API URL
curl -I $BACKEND_URL/api/health
```

### Cloud Run timeout
```bash
# Increase timeout
gcloud run services update cords-backend \
  --timeout=3600 \
  --region=$REGION
```

## Performance Optimization

### 1. Enable Cloud CDN

```bash
gcloud compute backend-services update cords-backend-service \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC
```

### 2. Setup Auto-scaling

```bash
gcloud run services update cords-backend \
  --min-instances=1 \
  --max-instances=10 \
  --region=$REGION
```

### 3. Enable compression

```bash
# In backend Express:
const compression = require('compression');
app.use(compression());
```

## Cost Estimation

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Cloud Run (Backend) | 1 CPU, 512MB RAM | ~$20-50 |
| Cloud Run (Frontend) | 1 CPU, 256MB RAM | ~$10-25 |
| Cloud SQL | db-f1-micro | ~$10-15 |
| Cloud Storage | 10GB storage | ~$0.25 |
| Cloud CDN | 1TB transfer | ~$10-50 |
| **TOTAL** | | ~$50-150 |

## Production Checklist

- [ ] Database backups enabled
- [ ] SSL certificate configured
- [ ] Custom domain pointing correctly
- [ ] Environment variables set securely
- [ ] Monitoring and alerts configured
- [ ] Cloud logging enabled
- [ ] Auto-scaling configured
- [ ] Load balancer with CDN
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database indices optimized
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Sensitive data not logged
- [ ] Backup restore tested

## Scaling for High Traffic

1. **Horizontal Scaling:**
   - Cloud Run auto-scales automatically
   - Multi-region deployment if needed

2. **Database Scaling:**
   - Enable read replicas
   - Use Cloud SQL Proxy with connection pooling
   - Implement Redis caching

3. **Frontend Scaling:**
   - Use Cloud CDN for static assets
   - Multi-region hosting

## Useful Commands

```bash
# View all services
gcloud run services list --region=$REGION

# Update service
gcloud run services update cords-backend --region=$REGION

# View service logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100

# Delete service
gcloud run services delete cords-backend --region=$REGION

# Get service details
gcloud run services describe cords-backend --region=$REGION --format=json
```

---

**Your Cords marketplace is now live on Google Cloud Platform!** 🚀
