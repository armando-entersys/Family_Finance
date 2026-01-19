#!/bin/bash
# Database backup script for FamilyFinance
# Usage: ./scripts/backup.sh [options]
# Options:
#   -o, --output DIR    Output directory (default: ./backups)
#   -c, --compress      Compress backup with gzip
#   -u, --upload        Upload to GCS bucket
#   -r, --retention N   Keep only last N backups (default: 7)
#   -h, --help          Show this help message

set -euo pipefail

# Default values
OUTPUT_DIR="./backups"
COMPRESS=false
UPLOAD=false
RETENTION=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="familyfinance_${TIMESTAMP}"

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
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS=true
            shift
            ;;
        -u|--upload)
            UPLOAD=true
            shift
            ;;
        -r|--retention)
            RETENTION="$2"
            shift 2
            ;;
        -h|--help)
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}Starting backup: ${BACKUP_NAME}${NC}"

# Extract database connection details from DATABASE_URL
# Format: postgresql+asyncpg://user:password@host:port/database
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

# Backup file path
BACKUP_FILE="${OUTPUT_DIR}/${BACKUP_NAME}.sql"

echo -e "${YELLOW}Dumping database: ${DB_NAME}${NC}"

# Perform database dump
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F plain \
    --no-owner \
    --no-privileges \
    --verbose \
    > "$BACKUP_FILE" 2>&1

echo -e "${GREEN}Database dump completed: ${BACKUP_FILE}${NC}"

# Compress if requested
if [ "$COMPRESS" = true ]; then
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip -9 "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    echo -e "${GREEN}Compressed: ${BACKUP_FILE}${NC}"
fi

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}Backup size: ${BACKUP_SIZE}${NC}"

# Upload to GCS if requested
if [ "$UPLOAD" = true ]; then
    GCS_BUCKET="${GCS_BUCKET_NAME:-}"
    if [ -z "$GCS_BUCKET" ]; then
        echo -e "${RED}ERROR: GCS_BUCKET_NAME not set${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Uploading to GCS: gs://${GCS_BUCKET}/backups/${NC}"
    gsutil cp "$BACKUP_FILE" "gs://${GCS_BUCKET}/backups/$(basename $BACKUP_FILE)"
    echo -e "${GREEN}Upload completed${NC}"
fi

# Apply retention policy
if [ "$RETENTION" -gt 0 ]; then
    echo -e "${YELLOW}Applying retention policy: keeping last ${RETENTION} backups${NC}"

    # Find and delete old backups
    cd "$OUTPUT_DIR"
    ls -t familyfinance_*.sql* 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -v

    # Also clean up GCS if uploading
    if [ "$UPLOAD" = true ] && [ -n "$GCS_BUCKET" ]; then
        echo -e "${YELLOW}Cleaning old backups from GCS...${NC}"
        gsutil ls "gs://${GCS_BUCKET}/backups/familyfinance_*.sql*" 2>/dev/null | \
            sort -r | \
            tail -n +$((RETENTION + 1)) | \
            xargs -r gsutil rm
    fi
fi

# Create backup metadata
cat > "${OUTPUT_DIR}/${BACKUP_NAME}.meta.json" << EOF
{
    "backup_name": "${BACKUP_NAME}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": "${DB_NAME}",
    "host": "${DB_HOST}",
    "size_bytes": $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat --printf="%s" "$BACKUP_FILE"),
    "compressed": ${COMPRESS},
    "uploaded": ${UPLOAD}
}
EOF

echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "  File: ${BACKUP_FILE}"
echo -e "  Size: ${BACKUP_SIZE}"
echo -e "  Meta: ${OUTPUT_DIR}/${BACKUP_NAME}.meta.json"
