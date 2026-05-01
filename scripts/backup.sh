#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting PostgreSQL backup...${NC}"
echo "Backup timestamp: $TIMESTAMP"

# Backup database
BACKUP_FILE="$BACKUP_DIR/erp_db_backup_${TIMESTAMP}.sql.gz"

docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U ${DB_USER:-erp_user} \
    ${DB_NAME:-erp_db} | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database backup created: $BACKUP_FILE${NC}"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo -e "${RED}Error: Database backup failed${NC}"
    exit 1
fi

# Backup media files if they exist
if [ -d "./erp_backend/media" ]; then
    MEDIA_BACKUP="$BACKUP_DIR/erp_media_${TIMESTAMP}.tar.gz"
    tar -czf "$MEDIA_BACKUP" -C ./erp_backend media 2>/dev/null && \
    echo -e "${GREEN}Media backup created: $MEDIA_BACKUP${NC}" || \
    echo -e "${YELLOW}Warning: Media backup skipped (no media files)${NC}"
fi

# Clean old backups (keep only last 30 days)
echo -e "${YELLOW}Cleaning old backups (keeping backups from last $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "erp_db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "erp_media_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo -e "${YELLOW}Listing recent backups:${NC}"
ls -lh "$BACKUP_DIR" | tail -5

echo -e "${GREEN}Backup completed successfully!${NC}"
echo ""
echo "To restore from this backup, run:"
echo "  gunzip < $BACKUP_FILE | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER:-erp_user} ${DB_NAME:-erp_db}"
echo ""
echo "To schedule this script with cron (daily at 2 AM):"
echo "  0 2 * * * /path/to/project/scripts/backup.sh >> /var/log/erp-backup.log 2>&1"
echo ""
