# FamilyFinance Deployment Guide

This guide covers deploying FamilyFinance in different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Database Management](#database-management)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Docker & Docker Compose v2.x+
- Python 3.11+
- PostgreSQL client (for backups/migrations)
- Google Cloud SDK (for GCS and GKE)

### Required Accounts/Services
- Google Cloud Platform account
- Domain with DNS access
- SSL certificates (or use Let's Encrypt)

---

## Environment Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Application
ENVIRONMENT=production
DEBUG=false
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/familyfinance

# Security
JWT_SECRET_KEY=your-secure-random-string-min-32-characters

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id

# External APIs
EXCHANGE_RATE_API_KEY=your-api-key

# CORS
CORS_ORIGINS=https://app.familyfinance.io,https://familyfinance.io

# Domain (for Docker Compose)
DOMAIN=familyfinance.io
ACME_EMAIL=admin@familyfinance.io

# Monitoring (optional)
GRAFANA_ADMIN_PASSWORD=secure-password
TRAEFIK_DASHBOARD_USER=admin:$apr1$...
```

### Generating Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate Traefik dashboard password
htpasswd -nb admin your-password
```

---

## Development Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/family-finance.git
cd family-finance

# Copy environment file
cp .env.example .env

# Start development environment
docker compose -f docker-compose.dev.yml up -d

# Run migrations
docker compose -f docker-compose.dev.yml exec api alembic upgrade head

# Access services:
# - API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - pgAdmin: http://localhost:5050
# - MailHog: http://localhost:8025
```

### Local Development (without Docker)

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Staging Deployment

### Deploy to Staging

```bash
# Set environment variables
export VERSION=$(git rev-parse --short HEAD)
export DOMAIN=familyfinance.io

# Build and push Docker image
docker build -t gcr.io/$GCP_PROJECT_ID/family-finance:$VERSION .
docker push gcr.io/$GCP_PROJECT_ID/family-finance:$VERSION

# Deploy
docker compose -f docker-compose.staging.yml up -d

# Run migrations
docker compose -f docker-compose.staging.yml exec api alembic upgrade head
```

### Access Staging
- API: https://api.staging.familyfinance.io
- App: https://app.staging.familyfinance.io
- Traefik: https://traefik.staging.familyfinance.io

---

## Production Deployment

### Initial Setup

1. **Configure DNS**
   ```
   A     api.familyfinance.io    → your-server-ip
   A     app.familyfinance.io    → your-server-ip
   A     grafana.familyfinance.io → your-server-ip
   ```

2. **Set up Cloud SQL (recommended)**
   ```bash
   gcloud sql instances create familyfinance \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1

   gcloud sql users set-password postgres \
     --instance=familyfinance \
     --password=your-secure-password
   ```

3. **Set up GCS bucket**
   ```bash
   gsutil mb -l us-central1 gs://familyfinance-uploads
   gsutil iam ch serviceAccount:your-sa@project.iam.gserviceaccount.com:objectAdmin gs://familyfinance-uploads
   ```

### Deploy to Production

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verify deployment
curl https://api.familyfinance.io/health
```

### Zero-Downtime Updates

```bash
# Build new version
export VERSION=$(date +%Y%m%d%H%M%S)
docker build -t gcr.io/$GCP_PROJECT_ID/family-finance:$VERSION .
docker push gcr.io/$GCP_PROJECT_ID/family-finance:$VERSION

# Update with rolling restart
docker compose -f docker-compose.prod.yml up -d --no-deps api

# Verify health
curl https://api.familyfinance.io/health/ready
```

---

## Kubernetes Deployment

### GKE Setup

```bash
# Create cluster
gcloud container clusters create family-finance \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-small \
  --enable-autoscaling --min-nodes 2 --max-nodes 5

# Get credentials
gcloud container clusters get-credentials family-finance --zone us-central1-a

# Create namespace
kubectl apply -f infra/k8s/namespace.yaml
```

### Deploy Application

```bash
# Create secrets (from .env file)
kubectl create secret generic family-finance-secrets \
  --from-env-file=.env \
  -n family-finance

# Apply all manifests
kubectl apply -f infra/k8s/

# Verify deployment
kubectl get pods -n family-finance
kubectl get svc -n family-finance
kubectl get ingress -n family-finance
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment family-finance-api --replicas=5 -n family-finance

# Check HPA status
kubectl get hpa -n family-finance
```

---

## Database Management

### Backups

```bash
# Manual backup
./scripts/backup.sh -c -u

# Scheduled backup (cron)
0 2 * * * /path/to/scripts/backup.sh -c -u -r 7
```

### Restore

```bash
# From local file
./scripts/restore.sh ./backups/familyfinance_20240115_120000.sql.gz

# From GCS
./scripts/restore.sh -d gs://bucket/backups/familyfinance_20240115_120000.sql.gz
```

### Migrations

```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

---

## Monitoring

### Prometheus Metrics

Available at `/metrics` endpoint:
- `http_requests_total` - Request count by method, path, status
- `http_request_duration_seconds` - Request latency histogram
- `process_resident_memory_bytes` - Memory usage

### Grafana Dashboards

1. Access Grafana: https://grafana.familyfinance.io
2. Default credentials: admin / (from GRAFANA_ADMIN_PASSWORD)
3. Import dashboards from `infra/monitoring/grafana/dashboards/`

### Alerts

Configure alert destinations in Prometheus/Alertmanager:
- Slack webhook
- Email notifications
- PagerDuty integration

---

## Troubleshooting

### Common Issues

**API not starting**
```bash
# Check logs
docker compose logs api

# Verify database connection
docker compose exec api python -c "from src.infra.database import engine; print('OK')"
```

**Database connection issues**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check pool status
curl http://localhost:8000/health/detailed
```

**Memory issues**
```bash
# Check container stats
docker stats family-finance-api

# View memory metrics
curl http://localhost:8000/metrics | grep memory
```

**SSL certificate issues**
```bash
# Check Traefik logs
docker compose logs traefik

# Verify certificate
openssl s_client -connect api.familyfinance.io:443 -servername api.familyfinance.io
```

### Health Checks

```bash
# Basic health
curl https://api.familyfinance.io/health

# Readiness (includes DB check)
curl https://api.familyfinance.io/health/ready

# Detailed health
curl https://api.familyfinance.io/health/detailed
```

### Log Analysis

```bash
# View API logs
docker compose logs -f api

# Filter errors
docker compose logs api 2>&1 | grep -i error

# View structured logs (production)
docker compose logs api | jq '.'
```

---

## Security Checklist

- [ ] JWT_SECRET_KEY is unique and secure (32+ characters)
- [ ] DATABASE_URL uses strong password
- [ ] CORS_ORIGINS is properly restricted
- [ ] SSL/TLS is enabled (Let's Encrypt or custom)
- [ ] Rate limiting is configured
- [ ] Security headers are present
- [ ] No sensitive data in logs
- [ ] Backups are encrypted
- [ ] Network policies are configured (Kubernetes)
