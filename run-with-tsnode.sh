#!/bin/bash
# اسکریپت پشتیبان برای اجرای برنامه با ts-node

# رنگ‌ها برای خوانایی بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون رنگ

echo -e "${BLUE}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      MarFaNet Backup Runner (Using ts-node)        ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════╝${NC}"

# نصب ts-node اگر موجود نباشد
if ! command -v ts-node &> /dev/null; then
  echo -e "${YELLOW}نصب ts-node...${NC}"
  npm install -g ts-node
  npm install --save-dev ts-node typescript
fi

# نصب وابستگی‌های مورد نیاز
echo -e "${YELLOW}نصب وابستگی‌های مورد نیاز...${NC}"
cd /workspaces/AgentPortalShield
npm install --save-dev typescript @types/node @types/express @types/express-session

# راه‌اندازی سرویس‌های پایگاه داده
echo -e "${YELLOW}راه‌اندازی سرویس‌های پایگاه داده...${NC}"
docker-compose up -d postgres redis

# انتظار برای آماده شدن سرویس‌ها
echo -e "${YELLOW}انتظار برای آماده شدن سرویس‌ها...${NC}"
sleep 10

# اجرای برنامه با ts-node
echo -e "${YELLOW}اجرای برنامه با ts-node...${NC}"
NODE_ENV=development ts-node server/index.ts