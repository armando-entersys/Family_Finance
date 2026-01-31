# Family Finance - Deployment Guide

## Overview
This document provides step-by-step instructions for deploying the Family Finance API to production using Google Cloud Compute Engine.

## Infrastructure

| Component | Value |
|-----------|-------|
| **Cloud Provider** | Google Cloud Platform |
| **Project** | mi-infraestructura-web |
| **Compute Instance** | prod-server |
| **Zone** | us-central1-c |
| **External IP** | 34.59.193.54 |
| **Domain** | Family-Finance.scram2k.com |
| **Container Name** | family-finance-api |
| **App Directory** | /srv/scram-apps/Family-Finance |
| **Docker Image** | scram2k/family-finance:latest |

## Prerequisites

1. **Google Cloud CLI** installed and configured
   ```bash
   gcloud config list
   # Should show: project = mi-infraestructura-web
   ```

2. **Git** configured with access to the repository
   ```bash
   git remote -v
   # origin  https://github.com/armando-entersys/Family_Finance.git
   ```

---

## Deployment Steps

### Step 1: Commit and Push Changes to Git

Always start by pushing your changes to the Git repository:

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Description of changes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Push to main branch
git push origin main
```

### Step 2: Connect to Production Server

Use Google Cloud CLI to SSH into the production server:

```bash
gcloud compute ssh prod-server --zone=us-central1-c
```

Or run commands directly:

```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="YOUR_COMMAND"
```

### Step 3: Pull Latest Code on Server

```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git pull origin main"
```

### Step 4: Rebuild and Deploy Container

**Option A: Rebuild with cache (faster, for minor changes)**
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose build api && sudo docker compose up -d api"
```

**Option B: Rebuild without cache (for dependency changes)**
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose build --no-cache api && sudo docker compose up -d api"
```

### Step 5: Verify Deployment

Check container status:
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo docker ps --filter name=family-finance-api --format 'table {{.Names}}\t{{.Status}}'"
```

Expected output:
```
NAMES                STATUS
family-finance-api   Up X seconds (healthy)
```

Test health endpoint:
```bash
curl -s "https://Family-Finance.scram2k.com/health"
```

Expected output:
```json
{"status":"healthy","timestamp":"...","version":"1.0.0","environment":"production"}
```

---

## One-Line Deployment Command

For quick deployments, use this single command:

```bash
cd "C:\Family Finance" && git add . && git commit -m "Update" && git push origin main && gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git pull origin main && sudo docker compose build api && sudo docker compose up -d api"
```

---

## Environment Variables

The production environment variables are stored in:
```
/srv/scram-apps/Family-Finance/.env
```

To view current configuration:
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo cat /srv/scram-apps/Family-Finance/.env"
```

### Important Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `CORS_ORIGINS` | Allowed CORS origins (JSON array) |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket |
| `ENVIRONMENT` | production |

### Updating Environment Variables

```bash
# Edit .env file
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo nano /srv/scram-apps/Family-Finance/.env"

# Or use sed for single value updates
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo sed -i 's|OLD_VALUE|NEW_VALUE|' /srv/scram-apps/Family-Finance/.env"

# Restart container after changes
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose restart api"
```

---

## Troubleshooting

### View Container Logs
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo docker logs family-finance-api --tail 100"
```

### Check Container Health
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo docker inspect family-finance-api --format '{{.State.Health.Status}}'"
```

### Restart Container
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose restart api"
```

### Force Recreate Container
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose up -d --force-recreate api"
```

### Check Recent Git Commits on Server
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git log --oneline -5"
```

---

## CORS Configuration

Current allowed origins (update in .env if needed):
```json
[
  "https://Family-Finance.scram2k.com",
  "https://family-finance.scram2k.com",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:19006"
]
```

To add a new origin:
```bash
# Example: Add http://localhost:3001
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo sed -i 's|\"http://localhost:19006\"|\"http://localhost:19006\",\"http://localhost:3001\"|' /srv/scram-apps/Family-Finance/.env && cd /srv/scram-apps/Family-Finance && sudo docker compose restart api"
```

---

## Docker Compose Services

The application uses the following services:

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| api | family-finance-api | 8000 | FastAPI backend |

### View docker-compose.yml
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo cat /srv/scram-apps/Family-Finance/docker-compose.yml"
```

---

## Rollback Procedure

If a deployment fails, rollback to a previous commit:

```bash
# 1. Find the previous working commit
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git log --oneline -10"

# 2. Reset to that commit (replace COMMIT_HASH)
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git reset --hard COMMIT_HASH"

# 3. Rebuild and deploy
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose build api && sudo docker compose up -d api"
```

---

## Frontend Web Deployment

The frontend web app (Expo/React Native for Web) is deployed at `https://app.family-finance.scram2k.com`

### Deploy Frontend Web

**Step 1: Rebuild and deploy frontend container**
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo docker compose build frontend && sudo docker compose up -d frontend"
```

**Step 2: Verify deployment**
```bash
# Check container status
gcloud compute ssh prod-server --zone=us-central1-c --command="sudo docker ps --filter name=family-finance-web --format 'table {{.Names}}\t{{.Status}}'"

# Test web app
curl -s -o /dev/null -w "%{http_code}" "https://app.family-finance.scram2k.com/"
```

### One-Line Frontend Deployment
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git pull origin main && sudo docker compose build frontend && sudo docker compose up -d frontend"
```

### Full Stack Deployment (API + Frontend)
```bash
gcloud compute ssh prod-server --zone=us-central1-c --command="cd /srv/scram-apps/Family-Finance && sudo git pull origin main && sudo docker compose build api frontend && sudo docker compose up -d api frontend"
```

---

## Mobile App Development

The mobile app (Expo/React Native) is located in `/mobile` directory.

### Development Server
```bash
cd "C:\Family Finance\mobile"
npx expo start --web --port 8083
```

### Environment Variables (mobile/.env)
```
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_API_URL=https://Family-Finance.scram2k.com
```

---

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| qa_test@familyfinance.com | QaTest123 | ADMIN |

---

## Contact & Support

- **Repository**: https://github.com/armando-entersys/Family_Finance
- **API Docs**: https://Family-Finance.scram2k.com/docs (dev only)
- **Health Check**: https://Family-Finance.scram2k.com/health

---

*Last Updated: January 2026*
