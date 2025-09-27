#!/bin/bash
# اسکریپت اجرای سریع MarFaNet در محیط توسعه
# این اسکریپت فایل‌های قدیمی را نادیده می‌گیرد

# رنگ‌ها برای خوانایی بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون رنگ

echo -e "${BLUE}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         MarFaNet Quick Development Runner          ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════╝${NC}"

# اجرایی کردن اسکریپت‌ها
chmod +x /workspaces/AgentPortalShield/*.sh

# اجرای اسکریپت رفع خطاها
echo -e "\n${YELLOW}اجرای اسکریپت رفع خطاهای TypeScript...${NC}"
/workspaces/AgentPortalShield/fix-essential-errors.sh

# بررسی و اصلاح فایل docker-compose.yml
echo -e "\n${YELLOW}بررسی و اصلاح فایل docker-compose.yml...${NC}"
if [ ! -f /workspaces/AgentPortalShield/docker-compose.yml ]; then
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
  
  echo -e "${GREEN}✅ فایل docker-compose.yml ایجاد شد.${NC}"
fi

# نصب وابستگی‌های مورد نیاز
echo -e "\n${YELLOW}نصب tsx و سایر وابستگی‌های ضروری...${NC}"
cd /workspaces/AgentPortalShield
npm install --save-dev tsx typescript @types/node

# راه‌اندازی سرویس‌های دیتابیس
echo -e "\n${YELLOW}راه‌اندازی سرویس‌های دیتابیس...${NC}"
cd /workspaces/AgentPortalShield
docker-compose up -d

# انتظار برای آماده شدن سرویس‌ها
echo -e "\n${YELLOW}انتظار برای آماده شدن سرویس‌ها...${NC}"
sleep 10

# اجرای برنامه
echo -e "\n${GREEN}✅ راه‌اندازی کامل شد!${NC}"
echo -e "\n${YELLOW}در حال اجرای برنامه...${NC}\n"
npm run dev