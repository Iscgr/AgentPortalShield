#!/bin/bash
# اسکریپت راه‌اندازی MarFaNet در Ubuntu Server 22/24
# این اسکریپت فایل‌های قدیمی را نادیده می‌گیرد و فقط روی بخش‌های فعال برنامه تمرکز دارد

# رنگ‌ها برای خوانایی بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون رنگ

echo -e "${BLUE}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MarFaNet Ubuntu Server Setup Assistant        ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════╝${NC}"

# مرحله 1: بروزرسانی سیستم
echo -e "\n${YELLOW}[1/7]${NC} بروزرسانی بسته‌های سیستم..."
sudo apt update && sudo apt upgrade -y

# مرحله 2: نصب Docker و Docker Compose
echo -e "\n${YELLOW}[2/7]${NC} نصب Docker..."
if ! command -v docker &> /dev/null; then
    echo "نصب Docker..."
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt update
    sudo apt install -y docker-ce docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker با موفقیت نصب شد${NC}"
else
    echo -e "${GREEN}Docker از قبل نصب شده است${NC}"
fi

# مرحله 3: نصب Node.js
echo -e "\n${YELLOW}[3/7]${NC} نصب Node.js..."
if ! command -v node &> /dev/null; then
    echo "نصب Node.js v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}Node.js با موفقیت نصب شد: $(node -v)${NC}"
else
    echo -e "${GREEN}Node.js از قبل نصب شده است: $(node -v)${NC}"
fi

# مرحله 4: تنظیم دایرکتوری برنامه
echo -e "\n${YELLOW}[4/7]${NC} تنظیم دایرکتوری برنامه..."
APP_DIR="/opt/marfanet"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
fi

# کپی فایل‌ها (با نادیده گرفتن فایل‌های قدیمی)
if [ ! -d "$APP_DIR/.git" ] && [ -d ".git" ]; then
    echo "کپی فایل‌های برنامه به $APP_DIR..."
    rsync -av --exclude node_modules --exclude .git \
          --exclude server/services/ai-task-generator.ts \
          --exclude server/services/report-analyzer.ts \
          ./ $APP_DIR/
else
    echo -e "${GREEN}دایرکتوری برنامه در $APP_DIR آماده است${NC}"
fi

# مرحله 5: تنظیم متغیرهای محیطی
echo -e "\n${YELLOW}[5/7]${NC} تنظیم متغیرهای محیطی..."
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" >> $APP_DIR/.env
        echo "REDIS_URL=redis://localhost:6379" >> $APP_DIR/.env
        echo "NODE_ENV=production" >> $APP_DIR/.env
        echo "PORT=3000" >> $APP_DIR/.env
        echo -e "${GREEN}فایل .env از نمونه ایجاد شد${NC}"
    else
        cat > $APP_DIR/.env << 'EOL'
DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=3000
SESSION_SECRET=marfanet-production-secret
EOL
        echo -e "${GREEN}فایل .env ایجاد شد${NC}"
    fi
else
    echo -e "${GREEN}فایل .env از قبل وجود دارد${NC}"
fi

# مرحله 6: رفع خطاهای TypeScript
echo -e "\n${YELLOW}[6/7]${NC} رفع خطاهای TypeScript..."

# نصب پکیج‌های تایپ مورد نیاز
cd $APP_DIR
npm install --save-dev @types/ws @types/express @types/express-session

# ایجاد دایرکتوری types اگر وجود ندارد
mkdir -p $APP_DIR/types
mkdir -p $APP_DIR/server/types

# ایجاد فایل ws.d.ts برای رفع خطای WebSocket
cat > $APP_DIR/types/ws.d.ts << 'EOL'
// ساده‌ترین تعریف ممکن برای رفع خطای ws
declare module 'ws';
EOL

# ایجاد فایل express.d.ts برای رفع خطای session
cat > $APP_DIR/server/types/express.d.ts << 'EOL'
/**
 * تعریف انواع Session برای Express
 * این فایل Request interface در Express را گسترش می‌دهد
 * تا ویژگی‌های session و sessionID را شامل شود
 */

// import session types
import 'express-session';

// extend Express Request with session
declare global {
  namespace Express {
    interface Request {
      session: import('express-session').Session & {
        authenticated?: boolean;
        userId?: string;
        username?: string;
        userType?: string;
        userRole?: string;
        organizationId?: string;
        organizationName?: string;
        permissions?: string[];
        adminAuthenticated?: boolean;
        userSettings?: {
          [key: string]: any;
        };
        workspace?: {
          [key: string]: any;
        };
        [key: string]: any;
      };
      sessionID: string;
    }

    // add user property to Request
    interface Request {
      user?: {
        id: string;
        username: string;
        [key: string]: any;
      };
    }
  }
}

export {};
EOL

# بروزرسانی tsconfig.json
node -e "
  const fs = require('fs');
  const path = require('path');
  
  // خواندن فایل tsconfig.json فعلی
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  let tsConfig;
  try {
    tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  } catch (err) {
    tsConfig = {};
  }
  
  // اطمینان از وجود compilerOptions
  if (!tsConfig.compilerOptions) {
    tsConfig.compilerOptions = {};
  }
  
  // اضافه کردن typeRoots
  tsConfig.compilerOptions.typeRoots = [
    './node_modules/@types',
    './types',
    './server/types'
  ];
  
  // فعال کردن skipLibCheck
  tsConfig.compilerOptions.skipLibCheck = true;
  
  // حذف ارجاع به vite/client اگر وجود دارد
  if (tsConfig.compilerOptions.types) {
    tsConfig.compilerOptions.types = tsConfig.compilerOptions.types.filter(t => t !== 'vite/client');
  }
  
  // نادیده گرفتن فایل‌های قدیمی
  if (!tsConfig.exclude) {
    tsConfig.exclude = [];
  }
  
  const oldFiles = [
    'server/services/ai-task-generator.ts',
    'server/services/report-analyzer.ts'
  ];
  
  // اضافه کردن فایل‌های قدیمی به exclude اگر هنوز اضافه نشده‌اند
  oldFiles.forEach(file => {
    if (!tsConfig.exclude.includes(file)) {
      tsConfig.exclude.push(file);
    }
  });
  
  // ذخیره تغییرات
  fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
"

# نصب وابستگی‌ها و ساخت برنامه
echo -e "\n${YELLOW}نصب وابستگی‌ها و ساخت برنامه...${NC}"
npm install
npm run build

# مرحله 7: راه‌اندازی دیتابیس و سرویس‌ها
echo -e "\n${YELLOW}[7/7]${NC} راه‌اندازی دیتابیس و سرویس‌ها..."

# راه‌اندازی کانتینرهای دیتابیس
docker-compose up -d postgres redis

# انتظار برای آماده شدن دیتابیس
echo "در حال انتظار برای آماده شدن دیتابیس..."
sleep 10

# راه‌اندازی اسکیمای دیتابیس
npm run db:push

# ایجاد سرویس systemd برای برنامه
echo -e "\n${YELLOW}ایجاد سرویس systemd برای MarFaNet...${NC}"
sudo tee /etc/systemd/system/marfanet.service > /dev/null << EOL
[Unit]
Description=MarFaNet Financial Management System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=marfanet
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl enable marfanet.service
sudo systemctl start marfanet.service

echo -e "\n${GREEN}✅ راه‌اندازی کامل شد!${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${YELLOW}MarFaNet در آدرس زیر در حال اجراست: http://localhost:3000${NC}"
echo -e "${YELLOW}آدرس API: http://localhost:3000/api/dashboard${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${BLUE}برای مشاهده لاگ‌ها:${NC} sudo journalctl -u marfanet -f"
echo -e "${BLUE}برای راه‌اندازی مجدد:${NC} sudo systemctl restart marfanet"
echo -e "${BLUE}برای توقف:${NC} sudo systemctl stop marfanet"