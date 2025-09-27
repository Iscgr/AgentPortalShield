#!/bin/bash

echo "بررسی فایل docker-compose.yml..."

if [ -f /workspaces/AgentPortalShield/docker-compose.yml ]; then
  echo "محتوای فایل docker-compose.yml:"
  cat /workspaces/AgentPortalShield/docker-compose.yml
else
  echo "فایل docker-compose.yml وجود ندارد! ایجاد فایل جدید..."
  
  cat > /workspaces/AgentPortalShield/docker-compose.yml << 'EOL'
# Docker Compose configuration for MarFaNet
services:
  # PostgreSQL Database
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: marfanet
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis for session storage
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
  redis-data:
EOL
  
  echo "✅ فایل docker-compose.yml ایجاد شد."
fi

echo ""
echo "نصب tsx و سایر وابستگی‌های مورد نیاز..."
cd /workspaces/AgentPortalShield
npm install --save-dev tsx typescript @types/node

echo ""
echo "✅ اصلاحات با موفقیت انجام شد."