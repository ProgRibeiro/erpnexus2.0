#!/bin/bash

set -e

echo "================================"
echo "ERP Production Deploy Script"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.production.example to .env and update the values"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

echo -e "${YELLOW}Step 1: Updating code from repository...${NC}"
git pull origin main

echo -e "${YELLOW}Step 2: Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build

echo -e "${YELLOW}Step 3: Starting containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}Step 4: Waiting for services to be ready...${NC}"
sleep 10

echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

echo -e "${YELLOW}Step 6: Collecting static files...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

echo -e "${YELLOW}Step 7: Creating superuser (if needed)...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin / admin123')
else:
    print('Superuser already exists')
EOF

echo -e "${YELLOW}Step 8: Checking container health...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deploy completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your application is now running at:"
echo "  - Frontend: http://localhost"
echo "  - API: http://localhost/api/"
echo "  - Admin: http://localhost/admin/"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop all services:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""
