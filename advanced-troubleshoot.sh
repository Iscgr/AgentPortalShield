#!/bin/bash
# اسکریپت جامع برای رفع تمام مشکلات و اجرای برنامه

# رنگ‌ها برای خوانایی بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون رنگ

echo -e "${BLUE}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      MarFaNet Advanced Troubleshooting Utility      ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════╝${NC}"

# دادن دسترسی اجرا به همه اسکریپت‌ها
chmod +x /workspaces/AgentPortalShield/*.sh

# مرحله 1: رفع مشکل nginx.conf
echo -e "\n${YELLOW}[1/6]${NC} رفع مشکل nginx.conf..."

if [ -f /workspaces/AgentPortalShield/nginx.conf ]; then
  # بررسی اینکه آیا nginx.conf یک دایرکتوری است یا یک فایل
  if [ -d /workspaces/AgentPortalShield/nginx.conf ]; then
    echo "خطا: nginx.conf یک دایرکتوری است، نه یک فایل!"
    echo "در حال حذف دایرکتوری و ایجاد فایل صحیح..."
    rm -rf /workspaces/AgentPortalShield/nginx.conf
    
    # ایجاد فایل nginx.conf صحیح
    cat > /workspaces/AgentPortalShield/nginx.conf << 'EOL'
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  localhost;
        
        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOL
    
    echo -e "${GREEN}✅ فایل nginx.conf جدید ایجاد شد.${NC}"
  else
    echo -e "${GREEN}✅ فایل nginx.conf موجود است و معتبر است.${NC}"
  fi
else
  echo "فایل nginx.conf وجود ندارد. در حال ایجاد فایل..."
  
  # ایجاد فایل nginx.conf
  cat > /workspaces/AgentPortalShield/nginx.conf << 'EOL'
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  localhost;
        
        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOL
  
  echo -e "${GREEN}✅ فایل nginx.conf ایجاد شد.${NC}"
fi

# مرحله 2: رفع مشکل tsx
echo -e "\n${YELLOW}[2/6]${NC} رفع مشکل tsx..."

# نصب tsx به صورت گلوبال
echo "نصب tsx به صورت گلوبال..."
npm install -g tsx

# نصب tsx در پروژه نیز
echo "نصب tsx در پروژه..."
cd /workspaces/AgentPortalShield
npm install --save-dev tsx

# تغییر اسکریپت در package.json برای استفاده از مسیر کامل
echo "اصلاح اسکریپت در package.json..."
if [ -f "/workspaces/AgentPortalShield/package.json" ]; then
  node -e '
    const fs = require("fs");
    const path = require("path");
    
    const packageJsonPath = "/workspaces/AgentPortalShield/package.json";
    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    
    if (packageJson.scripts && packageJson.scripts.dev) {
      // اصلاح اسکریپت dev برای استفاده از مسیر کامل tsx
      const oldScript = packageJson.scripts.dev;
      packageJson.scripts.dev = oldScript.replace("tsx", "./node_modules/.bin/tsx");
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("اسکریپت dev در package.json اصلاح شد");
    } else {
      console.log("اسکریپت dev در package.json پیدا نشد");
    }
  '
else
  echo "فایل package.json پیدا نشد"
fi

echo -e "${GREEN}✅ مشکل tsx برطرف شد.${NC}"

# مرحله 3: بررسی و اصلاح docker-compose.yml
echo -e "\n${YELLOW}[3/6]${NC} بررسی و اصلاح docker-compose.yml..."

# حذف ویژگی version از docker-compose.yml که منسوخ شده است
if [ -f /workspaces/AgentPortalShield/docker-compose.yml ]; then
  echo "اصلاح docker-compose.yml برای حذف ویژگی version منسوخ شده..."
  sed -i '/^version:/d' /workspaces/AgentPortalShield/docker-compose.yml
  
  echo -e "${GREEN}✅ فایل docker-compose.yml اصلاح شد.${NC}"
else
  echo -e "${RED}خطا: فایل docker-compose.yml وجود ندارد!${NC}"
  exit 1
fi

# مرحله 4: متوقف کردن تمام کانتینرهای در حال اجرا
echo -e "\n${YELLOW}[4/6]${NC} متوقف کردن تمام کانتینرهای در حال اجرا..."
docker-compose down

# مرحله 5: راه‌اندازی مجدد کانتینرهای پایگاه داده
echo -e "\n${YELLOW}[5/6]${NC} راه‌اندازی مجدد کانتینرهای پایگاه داده..."
docker-compose up -d postgres redis

# انتظار برای آماده شدن سرویس‌ها
echo -e "${YELLOW}انتظار برای آماده شدن سرویس‌ها...${NC}"
sleep 10

# مرحله 6: اجرای برنامه
echo -e "\n${YELLOW}[6/6]${NC} اجرای برنامه..."
echo -e "\n${GREEN}✅ تمام مشکلات برطرف شدند!${NC}"
echo -e "${YELLOW}در حال اجرای برنامه...${NC}\n"

# بررسی وجود nodejs
if ! command -v node &> /dev/null; then
  echo -e "${RED}خطا: Node.js نصب نشده است!${NC}"
  exit 1
fi

# اجرای دستی server/index.ts با NODE_ENV=development
cd /workspaces/AgentPortalShield
echo -e "${YELLOW}اجرای مستقیم server/index.ts...${NC}"
NODE_ENV=development ./node_modules/.bin/tsx server/index.ts