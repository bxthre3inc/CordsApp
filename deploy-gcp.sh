#!/bin/bash

# Cords GCP Deployment Script
# This script automates the deployment of Cords to Google Cloud Platform

set -e

echo "🚀 Cords Google Cloud Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Get configuration
echo -e "\n${YELLOW}Configuration${NC}"
read -p "Enter GCP Project ID: " PROJECT_ID
read -p "Enter GCP Region (default: us-central1): " REGION
REGION=${REGION:-us-central1}
read -p "Enter your domain (e.g., cords.example.com): " DOMAIN

# Set GCP project
echo -e "\n${YELLOW}Setting up GCP project...${NC}"
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Enable APIs
echo -e "\n${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    compute.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    sqladmin.googleapis.com \
    storage-api.googleapis.com \
    cloudresourcemanager.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}"

# Create Artifact Registry
echo -e "\n${YELLOW}Creating Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe cords-repo --location=$REGION &> /dev/null; then
    gcloud artifacts repositories create cords-repo \
        --repository-format=docker \
        --location=$REGION
    echo -e "${GREEN}✓ Artifact Registry created${NC}"
else
    echo -e "${GREEN}✓ Artifact Registry already exists${NC}"
fi

# Configure Docker
echo -e "\n${YELLOW}Configuring Docker authentication...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev

# Create Cloud SQL Instance
echo -e "\n${YELLOW}Creating Cloud SQL instance...${NC}"
INSTANCE_NAME="cords-postgres"
DB_PASSWORD=$(openssl rand -base64 32)

if ! gcloud sql instances describe $INSTANCE_NAME --region=$REGION &> /dev/null; then
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --availability-type=REGIONAL \
        --storage-size=10GB
    
    # Create database and user
    gcloud sql databases create cords_db --instance=$INSTANCE_NAME
    gcloud sql users create postgres --instance=$INSTANCE_NAME --password=$DB_PASSWORD
    
    echo -e "${GREEN}✓ Cloud SQL instance created${NC}"
    echo -e "${YELLOW}Database password: $DB_PASSWORD (Save this!)${NC}"
else
    echo -e "${GREEN}✓ Cloud SQL instance already exists${NC}"
fi

# Get Cloud SQL connection string
CLOUDSQL_CONNECTION=$(gcloud sql instances describe $INSTANCE_NAME \
    --format='value(connectionName)')
echo -e "${YELLOW}Cloud SQL Connection: $CLOUDSQL_CONNECTION${NC}"

# Build and push Docker images
echo -e "\n${YELLOW}Building and pushing Docker images...${NC}"

# Backend
echo -e "${YELLOW}Building backend...${NC}"
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest ./backend
docker push $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest
echo -e "${GREEN}✓ Backend pushed${NC}"

# Frontend
echo -e "${YELLOW}Building frontend...${NC}"
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest ./frontend
docker push $REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest
echo -e "${GREEN}✓ Frontend pushed${NC}"

# Create secrets
echo -e "\n${YELLOW}Creating secrets...${NC}"

# Read sensitive values
read -sp "Enter JWT Secret (or press Enter to generate): " JWT_SECRET
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
echo

read -sp "Enter Stripe Secret Key: " STRIPE_SECRET
echo

read -sp "Enter Mapbox Token: " MAPBOX_TOKEN
echo

read -sp "Enter Stripe Public Key: " STRIPE_PUBLIC
echo

# Create secrets
echo $JWT_SECRET | gcloud secrets create jwt-secret --data-file=- 2>/dev/null || \
    echo $JWT_SECRET | gcloud secrets versions add jwt-secret --data-file=-

echo $STRIPE_SECRET | gcloud secrets create stripe-secret --data-file=- 2>/dev/null || \
    echo $STRIPE_SECRET | gcloud secrets versions add stripe-secret --data-file=-

echo $MAPBOX_TOKEN | gcloud secrets create mapbox-token --data-file=- 2>/dev/null || \
    echo $MAPBOX_TOKEN | gcloud secrets versions add mapbox-token --data-file=-

echo $STRIPE_PUBLIC | gcloud secrets create stripe-public-key --data-file=- 2>/dev/null || \
    echo $STRIPE_PUBLIC | gcloud secrets versions add stripe-public-key --data-file=-

echo -e "${GREEN}✓ Secrets created${NC}"

# Deploy to Cloud Run
echo -e "\n${YELLOW}Deploying to Cloud Run...${NC}"

# Backend
echo -e "${YELLOW}Deploying backend...${NC}"
gcloud run deploy cords-backend \
    --image=$REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/backend:latest \
    --region=$REGION \
    --platform=managed \
    --memory=512Mi \
    --cpu=1 \
    --timeout=3600 \
    --set-cloudsql-instances=$CLOUDSQL_CONNECTION \
    --allow-unauthenticated \
    --set-env-vars="DB_HOST=/cloudsql/$CLOUDSQL_CONNECTION,DB_PORT=5432,DB_NAME=cords_db,DB_USER=postgres,NODE_ENV=production" \
    --update-secrets="DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,STRIPE_SECRET_KEY=stripe-secret:latest,MAPBOX_TOKEN=mapbox-token:latest"

BACKEND_URL=$(gcloud run services describe cords-backend --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✓ Backend deployed to: $BACKEND_URL${NC}"

# Frontend
echo -e "${YELLOW}Deploying frontend...${NC}"
gcloud run deploy cords-frontend \
    --image=$REGION-docker.pkg.dev/$PROJECT_ID/cords-repo/frontend:latest \
    --region=$REGION \
    --platform=managed \
    --memory=256Mi \
    --allow-unauthenticated \
    --set-env-vars="REACT_APP_API_URL=$BACKEND_URL/api" \
    --update-secrets="REACT_APP_MAPBOX_TOKEN=mapbox-token:latest,REACT_APP_STRIPE_KEY=stripe-public-key:latest"

FRONTEND_URL=$(gcloud run services describe cords-frontend --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✓ Frontend deployed to: $FRONTEND_URL${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Deployment URLs:${NC}"
echo -e "Frontend: ${GREEN}$FRONTEND_URL${NC}"
echo -e "Backend API: ${GREEN}$BACKEND_URL/api${NC}"

echo -e "\n${YELLOW}Important Information:${NC}"
echo -e "Database: cords_db"
echo -e "Database User: postgres"
echo -e "Database Password: $DB_PASSWORD"
echo -e "Cloud SQL Connection: $CLOUDSQL_CONNECTION"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update your domain DNS to point to the frontend URL"
echo "2. Configure SSL certificate"
echo "3. Run database migrations:"
echo "   gcloud sql connect $INSTANCE_NAME --user=postgres < database/schema.sql"
echo "4. Test the deployment: curl $BACKEND_URL/api/health"
echo "5. Visit $FRONTEND_URL in your browser"

echo -e "\n${YELLOW}Save these credentials securely!${NC}"
echo "Database Password: $DB_PASSWORD"
echo "JWT Secret: $JWT_SECRET"

echo -e "\n${GREEN}For more information, see docs/GCP_DEPLOYMENT.md${NC}"
