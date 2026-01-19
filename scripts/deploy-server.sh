#!/bin/bash
# FamilyFinance Server Deployment Script
# Usage: ./scripts/deploy-server.sh
#
# Prerequisites:
# - Google Cloud SDK installed (gcloud)
# - Python 3.11+ installed
# - PostgreSQL installed and running
# - Git installed

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/family-finance"
REPO_URL="https://github.com/armando-entersys/Family_Finance.git"
BRANCH="main"
VENV_DIR="$APP_DIR/.venv"
SERVICE_NAME="family-finance"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  FamilyFinance Server Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

# Step 1: Create application directory
echo -e "${YELLOW}Step 1: Setting up directories...${NC}"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Step 2: Clone or pull repository
echo -e "${YELLOW}Step 2: Getting latest code from GitHub...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    git fetch origin
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
else
    echo "Cloning repository..."
    git clone $REPO_URL .
    git checkout $BRANCH
fi

# Step 3: Setup Python virtual environment
echo -e "${YELLOW}Step 3: Setting up Python virtual environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv $VENV_DIR
fi

# Activate virtual environment
source $VENV_DIR/bin/activate

# Step 4: Install dependencies
echo -e "${YELLOW}Step 4: Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Step 5: Check/Create .env file
echo -e "${YELLOW}Step 5: Checking environment configuration...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${RED}WARNING: .env file not found!${NC}"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit $APP_DIR/.env with your configuration${NC}"
fi

# Step 6: Run database migrations
echo -e "${YELLOW}Step 6: Running database migrations...${NC}"
alembic upgrade head

# Step 7: Create systemd service
echo -e "${YELLOW}Step 7: Setting up systemd service...${NC}"
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=FamilyFinance API
After=network.target postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
EnvironmentFile=$APP_DIR/.env
ExecStart=$VENV_DIR/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 2
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=$APP_DIR/logs

# Resource limits
MemoryMax=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Set permissions
echo -e "${YELLOW}Step 8: Setting permissions...${NC}"
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod 600 $APP_DIR/.env

# Create logs directory
mkdir -p $APP_DIR/logs
chown www-data:www-data $APP_DIR/logs

# Step 9: Reload and start service
echo -e "${YELLOW}Step 9: Starting service...${NC}"
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# Step 10: Check service status
echo -e "${YELLOW}Step 10: Checking service status...${NC}"
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    echo -e "${GREEN}Service is running!${NC}"
else
    echo -e "${RED}Service failed to start. Check logs:${NC}"
    journalctl -u $SERVICE_NAME -n 50 --no-pager
    exit 1
fi

# Step 11: Health check
echo -e "${YELLOW}Step 11: Health check...${NC}"
sleep 2
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}API is healthy!${NC}"
else
    echo -e "${RED}Health check failed${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "API running at: http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  - View logs: journalctl -u $SERVICE_NAME -f"
echo "  - Restart: systemctl restart $SERVICE_NAME"
echo "  - Stop: systemctl stop $SERVICE_NAME"
echo "  - Status: systemctl status $SERVICE_NAME"
