# Deployment Guide

## Prerequisites

- Node.js v16+
- PostgreSQL v13+
- Stripe account
- Mapbox account
- Server/hosting provider (AWS, Heroku, DigitalOcean, etc.)
- GitHub for version control

## Environment Setup

### 1. Database

**Create PostgreSQL database:**
```bash
createdb cords_db
```

**Run migrations:**
```bash
cd backend
npm run migrate
```

### 2. Backend Deployment

#### Using Heroku

1. **Create Heroku app:**
```bash
heroku create cords-api
```

2. **Add PostgreSQL addon:**
```bash
heroku addons:create heroku-postgresql:standard-0 -a cords-api
```

3. **Set environment variables:**
```bash
heroku config:set NODE_ENV=production -a cords-api
heroku config:set JWT_SECRET=<your-secret> -a cords-api
heroku config:set STRIPE_SECRET_KEY=<your-key> -a cords-api
heroku config:set MAPBOX_TOKEN=<your-token> -a cords-api
```

4. **Deploy:**
```bash
git push heroku main
```

#### Using AWS EC2

1. **Launch EC2 instance** (Ubuntu 20.04+)

2. **Install dependencies:**
```bash
sudo apt-get update
sudo apt-get install nodejs npm postgresql postgresql-contrib
```

3. **Clone repository:**
```bash
git clone <your-repo>
cd CordsApp/backend
npm install
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your values
```

5. **Start with PM2:**
```bash
npm install -g pm2
pm2 start src/index.js
pm2 save
```

6. **Setup Nginx reverse proxy:**
```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name api.cords.app;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Frontend Deployment

#### Using Vercel

1. **Connect GitHub:**
```bash
vercel
```

2. **Set environment variables in Vercel dashboard:**
- `REACT_APP_API_URL`
- `REACT_APP_MAPBOX_TOKEN`
- `REACT_APP_STRIPE_KEY`

3. **Deploy:**
```bash
vercel --prod
```

#### Using AWS S3 + CloudFront

1. **Build frontend:**
```bash
cd frontend
npm run build
```

2. **Upload to S3:**
```bash
aws s3 sync build/ s3://cords-frontend/
```

3. **Create CloudFront distribution** pointing to S3 bucket

4. **Update API URL** in frontend config

### 4. SSL/TLS Setup

**Using Let's Encrypt with Nginx:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.cords.app
```

### 5. Database Backups

**Automated PostgreSQL backups:**
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/cords"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump cords_db | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Monitoring & Logging

### Application Monitoring

1. **Setup error tracking (Sentry):**
```bash
npm install --save @sentry/node
```

2. **Setup performance monitoring (New Relic/DataDog)**

### Log Management

**Using Winston:**
```bash
npm install winston
```

## Security Checklist

- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure HTTP headers
- [ ] Enable rate limiting
- [ ] Regular security audits
- [ ] Database encryption
- [ ] API key rotation
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection

## Performance Optimization

1. **Database indexing** - Already configured in schema.sql
2. **API caching** - Implement Redis for frequently accessed data
3. **CDN for static assets** - Use CloudFlare or CloudFront
4. **Database connection pooling** - PgBouncer
5. **Load balancing** - Nginx or AWS ALB

## Scaling Strategy

### Vertical Scaling
- Increase server resources as needed

### Horizontal Scaling
- Add load balancer
- Multiple backend instances
- Database read replicas
- Separate search indexing service

### Caching Strategy
- Redis for sessions and frequently accessed data
- API response caching
- Database query caching

## Domain & DNS

1. **Register domain** (Route53, GoDaddy, etc.)
2. **Configure DNS records:**
   - API: api.cords.app → Load Balancer
   - Frontend: www.cords.app → CloudFront
   - Email: MX records for transactional emails

## Email Configuration

Using SendGrid or AWS SES:
```javascript
// Nodemailer config
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: process.env.SENDGRID_USER,
    pass: process.env.SENDGRID_PASSWORD
  }
});
```

## Staging Environment

Setup identical staging environment before production:
- Staging API: staging-api.cords.app
- Staging Frontend: staging.cords.app
- Test all changes in staging first

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build
      - run: heroku deploy
```

## Rollback Procedures

1. **Heroku:**
```bash
heroku releases
heroku rollback v123
```

2. **Custom deployment:**
- Keep previous versions in /releases
- Update symlink to previous version
- Restart application

## Monitoring Checklist

- [ ] Server uptime (StatusPage)
- [ ] API response times
- [ ] Error rates
- [ ] Database performance
- [ ] Disk space
- [ ] Memory usage
- [ ] CPU usage
- [ ] User analytics

---

For production deployment, review all security configurations and test thoroughly in staging environment.
