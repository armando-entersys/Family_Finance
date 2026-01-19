#!/bin/bash
# FamilyFinance Quick Update Script
# Usage: ./scripts/update-server.sh
#
# Use this script to quickly update the server with latest code

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/family-finance"
SERVICE_NAME="family-finance"

echo -e "${YELLOW}Updating FamilyFinance...${NC}"

cd $APP_DIR

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Activate virtual environment
source .venv/bin/activate

# Update dependencies if requirements changed
echo "Updating dependencies..."
pip install -r requirements.txt --quiet

# Run migrations
echo "Running migrations..."
alembic upgrade head

# Restart service
echo "Restarting service..."
sudo systemctl restart $SERVICE_NAME

# Wait and check health
sleep 3
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}Update completed successfully!${NC}"
else
    echo "Warning: Health check failed, checking logs..."
    sudo journalctl -u $SERVICE_NAME -n 20 --no-pager
fi
