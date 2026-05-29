# Quick Start: Deploy to Google Cloud in 10 Minutes

## Prerequisites Checklist

```bash
# Install gcloud CLI
brew install google-cloud-sdk  # macOS
# or visit: https://cloud.google.com/sdk/docs/install

# Verify installations
gcloud version
docker version
```

## 3-Step Deployment

### Step 1: Prepare GCP (2 min)

```bash
# Login to Google Cloud
gcloud auth login

# Create GCP project (or use existing)
gcloud projects create cords-marketplace
gcloud config set project cords-marketplace

# Enable billing
# Go to: https://console.cloud.google.com/billing
```

### Step 2: Run Deployment Script (5 min)

```bash
# Make script executable
chmod +x deploy-gcp.sh

# Run deployment
./deploy-gcp.sh

# Follow prompts to:
# - Enter project ID
# - Choose region
# - Enter your domain
# - Provide API keys (Stripe, Mapbox)
```

### Step 3: Verify Deployment (3 min)

```bash
# Check backend
curl https://YOUR_BACKEND_URL/api/health

# Check frontend
open https://YOUR_FRONTEND_URL

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

## What Gets Deployed

✅ PostgreSQL database (Cloud SQL)
✅ Backend API (Cloud Run)
✅ Frontend app (Cloud Run)
✅ SSL certificates
✅ Auto-scaling configured
✅ Monitoring enabled
✅ Backups scheduled

## Configuration Files Created

| File | Purpose |
|------|---------|
| `docs/GCP_DEPLOYMENT.md` | Full deployment guide |
| `cloudbuild.yaml` | CI/CD pipeline configuration |
| `deploy-gcp.sh` | Automated deployment script |
| `.env.gcp.example` | GCP environment template |
| `backend/Dockerfile` | Backend container |
| `frontend/Dockerfile` | Frontend container |
| `frontend/nginx.conf` | Web server config |
| `k8s/backend/deployment.yaml` | Kubernetes backend config |
| `k8s/frontend/deployment.yaml` | Kubernetes frontend config |

## Environment Setup

```bash
# Copy example configuration
cp .env.gcp.example .env.gcp

# Edit with your values
nano .env.gcp

# Source environment
source .env.gcp
```

## Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Create Cloud SQL database
gcloud sql instances create cords-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# 2. Build Docker images
docker build -t cords-backend ./backend
docker build -t cords-frontend ./frontend

# 3. Push to Container Registry
docker tag cords-backend:latest gcr.io/PROJECT_ID/cords-backend:latest
docker push gcr.io/PROJECT_ID/cords-backend:latest

# 4. Deploy to Cloud Run
gcloud run deploy cords-backend \
  --image=gcr.io/PROJECT_ID/cords-backend:latest \
  --region=us-central1 \
  --allow-unauthenticated

# 5. Deploy frontend similarly
gcloud run deploy cords-frontend \
  --image=gcr.io/PROJECT_ID/cords-frontend:latest \
  --region=us-central1 \
  --allow-unauthenticated
```

## Accessing Your Deployment

After deployment, you'll have:

```
Frontend:        https://cords-frontend-HASH.run.app
Backend API:     https://cords-backend-HASH.run.app
Database:        cords-postgres (Cloud SQL)
```

## Custom Domain Setup

```bash
# Register domain at any registrar
# Update DNS records:

# Point frontend to load balancer
A record: cords.example.com -> LOAD_BALANCER_IP

# Point API to backend
CNAME record: api.cords.example.com -> cords-backend.run.app

# Wait for DNS propagation (up to 48 hours)
```

## Monitoring Your Deployment

```bash
# View real-time logs
gcloud logging read "resource.type=cloud_run_revision" \
  --format=json --limit=50 --freshness=1m

# Check Cloud Run services
gcloud run services list --region=us-central1

# View database status
gcloud sql instances describe cords-postgres

# Monitor resource usage
gcloud monitoring dashboards list
```

## Scaling Configuration

The deployment includes auto-scaling:

**Backend (cords-backend):**
- Min replicas: 2
- Max replicas: 10
- Scale up at 70% CPU

**Frontend (cords-frontend):**
- Min replicas: 2
- Max replicas: 5
- Scale up at 80% CPU

## Cost Estimation

| Component | Monthly Cost |
|-----------|--------------|
| Cloud Run (Backend) | $20-50 |
| Cloud Run (Frontend) | $10-25 |
| Cloud SQL | $10-15 |
| Storage & CDN | $5-10 |
| **Total** | **$45-100** |

Costs scale with traffic. Monitor in Cloud Console.

## Troubleshooting

### Deploy fails with "permission denied"

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### Database connection fails

```bash
# Check Cloud SQL IP configuration
gcloud sql instances describe cords-postgres \
  --format='value(ipAddresses[0].ipAddress)'

# Authorize Cloud Run to access Cloud SQL
gcloud sql instances patch cords-postgres \
  --authorized-networks=0.0.0.0/0
```

### Frontend can't reach backend

```bash
# Check backend is running
gcloud run services describe cords-backend

# Verify API URL in frontend config
# Should be: REACT_APP_API_URL=<backend_url>/api
```

### High costs

```bash
# Reduce Cloud SQL tier
gcloud sql instances patch cords-postgres --tier=db-f1-micro

# Reduce Cloud Run memory
gcloud run services update cords-backend --memory=256Mi

# Enable CDN caching
gcloud compute backend-services update cords-backend --enable-cdn
```

## Production Checklist

- [ ] Database backups enabled
- [ ] SSL certificate installed
- [ ] Custom domain configured
- [ ] Environment variables set securely
- [ ] Monitoring alerts configured
- [ ] Application tested end-to-end
- [ ] Database migration completed
- [ ] Stripe webhooks configured
- [ ] Email service configured
- [ ] Error tracking enabled (Sentry)

## Next Steps

1. **Monitor Performance:**
   - Cloud Monitoring dashboard
   - Cloud Logging
   - Cloud Trace

2. **Optimize Costs:**
   - Review Cloud Run pricing
   - Enable reserved instances
   - Use committed use discounts

3. **Enhance Security:**
   - Enable Cloud Armor
   - Setup VPC
   - Configure Cloud KMS

4. **Add Features:**
   - Real-time notifications
   - Advanced analytics
   - Mobile app

## Important Commands

```bash
# Redeploy after code changes
./deploy-gcp.sh

# View deployment status
gcloud run services list --region=us-central1

# Update environment variables
gcloud run services update cords-backend \
  --update-env-vars KEY=VALUE

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100

# Delete deployment
gcloud run services delete cords-backend cords-frontend --region=us-central1
```

## Support Resources

- **Docs:** `docs/GCP_DEPLOYMENT.md` (comprehensive guide)
- **Troubleshooting:** `docs/DEPLOYMENT.md` (common issues)
- **API Docs:** `docs/API.md` (endpoint reference)
- **GCP Docs:** https://cloud.google.com/docs

## You're Live! 🚀

Your Cords marketplace is now running on Google Cloud Platform with:
- ✅ Production-ready infrastructure
- ✅ Auto-scaling and load balancing
- ✅ Database with backups
- ✅ SSL encryption
- ✅ Monitoring and logging
- ✅ CI/CD pipeline ready

**Visit your deployed app and start selling wood!**

---

For detailed configuration and advanced options, see: `docs/GCP_DEPLOYMENT.md`
