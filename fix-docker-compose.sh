#!/bin/bash

echo "بررسی و اصلاح docker-compose.yml..."

# نمایش فایل docker-compose.yml موجود
echo "محتوای فعلی docker-compose.yml:"
cat /workspaces/AgentPortalShield/docker-compose.yml

# ایجاد فایل docker-compose.yml جدید
echo "ایجاد فایل docker-compose.yml جدید..."
cat > /workspaces/AgentPortalShield/docker-compose.yml.new << 'EOL'
# Docker Compose configuration for MarFaNet
services:
  # PostgreSQL Database
  db:
    image: postgres:14
    container_name: marfanet-db
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
    networks:
      - marfanet-network

  # Redis for session storage
  redis:
    image: redis:alpine
    container_name: marfanet-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - marfanet-network

volumes:
  postgres-data:
  redis-data:

networks:
  marfanet-network:
    driver: bridge
EOL

# جایگزینی فایل
mv /workspaces/AgentPortalShield/docker-compose.yml.new /workspaces/AgentPortalShield/docker-compose.yml

echo "✅ فایل docker-compose.yml با موفقیت به‌روزرسانی شد."

# اجرای docker-compose برای اطمینان از تشخیص سرویس‌ها
echo "بررسی تشخیص سرویس‌ها در docker-compose..."
docker-compose config --services

echo "راه‌اندازی مجدد کانتینرهای پایگاه داده..."
docker-compose up -d db redis