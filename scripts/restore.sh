#!/bin/bash
# Database restore script for FamilyFinance
# Usage: ./scripts/restore.sh [options] <backup_file>
# Options:
#   -f, --force         Skip confirmation prompt
#   -d, --download      Download from GCS (backup_file is GCS path)
#   --drop-existing     Drop existing database before restore
#   -h, --help          Show this help message
#
# Examples:
#   ./scripts/restore.sh ./backups/familyfinance_20240115_120000.sql
#   ./scripts/restore.sh -d gs://bucket/backups/familyfinance_20240115_120000.sql.gz

set -euo pipefail

# Default values
FORCE=false
DOWNLOAD=false
DROP_EXISTING=false
BACKUP_FILE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--download)
            DOWNLOAD=true
            shift
            ;;
        --drop-existing)
            DROP_EXISTING=true
            shift
            ;;
        -h|--help)
            head -20 "$0" | tail -18
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# Validate backup file argument
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not specified${NC}"
    echo "Usage: ./scripts/restore.sh [options] <backup_file>"
    exit 1
fi

# Extract database connection details from DATABASE_URL
DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Parse URL (remove asyncpg+ prefix if present)
DB_URL=$(echo "$DB_URL" | sed 's/+asyncpg//')
DB_USER=$(echo "$DB_URL" | sed -n 's#.*://\([^:]*\):.*#\1#p')
DB_PASS=$(echo "$DB_URL" | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')
DB_HOST=$(echo "$DB_URL" | sed -n 's#.*@\([^:/]*\).*#\1#p')
DB_PORT=$(echo "$DB_URL" | sed -n 's#.*:\([0-9]*\)/.*#\1#p')
DB_NAME=$(echo "$DB_URL" | sed -n 's#.*/\([^?]*\).*#\1#p')

# Default port if not specified
DB_PORT=${DB_PORT:-5432}

# Set PostgreSQL password
export PGPASSWORD="$DB_PASS"

# Download from GCS if requested
if [ "$DOWNLOAD" = true ]; then
    echo -e "${YELLOW}Downloading backup from GCS...${NC}"
    LOCAL_FILE="/tmp/$(basename $BACKUP_FILE)"
    gsutil cp "$BACKUP_FILE" "$LOCAL_FILE"
    BACKUP_FILE="$LOCAL_FILE"
    echo -e "${GREEN}Downloaded to: ${LOCAL_FILE}${NC}"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Decompress if gzipped
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"
    DECOMPRESSED="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED"
    BACKUP_FILE="$DECOMPRESSED"
    echo -e "${GREEN}Decompressed: ${BACKUP_FILE}${NC}"
fi

# Confirmation prompt
if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}WARNING: This will restore the database from:${NC}"
    echo -e "  File: ${BACKUP_FILE}"
    echo -e "  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    echo ""
    if [ "$DROP_EXISTING" = true ]; then
        echo -e "${RED}WARNING: --drop-existing is set. All existing data will be DELETED!${NC}"
    fi
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi
fi

echo -e "${GREEN}Starting restore...${NC}"

# Drop existing database if requested
if [ "$DROP_EXISTING" = true ]; then
    echo -e "${YELLOW}Dropping existing tables...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
EOF
    echo -e "${GREEN}Existing tables dropped${NC}"
fi

# Restore database
echo -e "${YELLOW}Restoring database...${NC}"
psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$BACKUP_FILE" \
    --quiet \
    --single-transaction

echo -e "${GREEN}Database restored successfully!${NC}"

# Verify restore
echo -e "${YELLOW}Verifying restore...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}Tables restored: ${TABLE_COUNT}${NC}"

# Run migrations to ensure schema is up to date
echo -e "${YELLOW}Running migrations to ensure schema is current...${NC}"
if command -v alembic &> /dev/null; then
    alembic upgrade head
    echo -e "${GREEN}Migrations completed${NC}"
else
    echo -e "${YELLOW}Alembic not found - skipping migrations${NC}"
fi

echo -e "${GREEN}Restore completed successfully!${NC}"
