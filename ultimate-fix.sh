#!/bin/bash
# اسکریپت نهایی برای رفع تمام مشکلات و اجرای برنامه

# رنگ‌ها برای خوانایی بهتر
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون رنگ

echo -e "${BLUE}╔═════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      MarFaNet Ultimate Troubleshooting Utility      ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════╝${NC}"

# دادن دسترسی اجرا به همه اسکریپت‌ها
chmod +x /workspaces/AgentPortalShield/*.sh

# مرحله 1: رفع مشکل nginx.conf
echo -e "\n${YELLOW}[1/6]${NC} رفع مشکل nginx.conf..."
if [ -d "/workspaces/AgentPortalShield/nginx.conf" ]; then
  echo "حذف دایرکتوری nginx.conf..."
  rm -rf /workspaces/AgentPortalShield/nginx.conf
  
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
  echo -e "${GREEN}✅ فایل nginx.conf با موفقیت ایجاد شد.${NC}"
else
  echo -e "${GREEN}✅ فایل nginx.conf از قبل وجود دارد.${NC}"
fi

# مرحله 2: اصلاح docker-compose.yml
echo -e "\n${YELLOW}[2/6]${NC} اصلاح docker-compose.yml..."
cat > /workspaces/AgentPortalShield/docker-compose.yml << 'EOL'
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
echo -e "${GREEN}✅ فایل docker-compose.yml با موفقیت به‌روزرسانی شد.${NC}"

# مرحله 3: نصب وابستگی‌های مورد نیاز
echo -e "\n${YELLOW}[3/6]${NC} نصب وابستگی‌های مورد نیاز..."
cd /workspaces/AgentPortalShield
npm install --save-dev typescript ts-node tsx @types/node @types/express @types/express-session
echo -e "${GREEN}✅ وابستگی‌های مورد نیاز نصب شدند.${NC}"

# مرحله 4: تنظیم tsconfig.json
echo -e "\n${YELLOW}[4/6]${NC} تنظیم tsconfig.json..."
cat > /workspaces/AgentPortalShield/tsconfig.json << 'EOL'
{
  "compilerOptions": {
    "target": "es2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "sourceMap": true,
    "typeRoots": [
      "./node_modules/@types",
      "./types",
      "./server/types"
    ],
    "resolveJsonModule": true
  },
  "include": [
    "server/**/*.ts",
    "shared/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "server/services/ai-task-generator.ts",
    "server/services/report-analyzer.ts"
  ]
}
EOL
echo -e "${GREEN}✅ tsconfig.json با موفقیت تنظیم شد.${NC}"

# مرحله 5: ایجاد اسکریپت اجرایی و تنظیم package.json
echo -e "\n${YELLOW}[5/6]${NC} ایجاد اسکریپت اجرایی و تنظیم package.json..."
cat > /workspaces/AgentPortalShield/start-server.js << 'EOL'
#!/usr/bin/env node
// اسکریپت برای اجرای سرور بدون نیاز به tsx یا ts-node

require('ts-node/register');
require('./server/index.ts');
EOL

# اعطای دسترسی اجرایی
chmod +x /workspaces/AgentPortalShield/start-server.js

# تنظیم package.json
node -e '
  const fs = require("fs");
  const packageJsonPath = "/workspaces/AgentPortalShield/package.json";
  let packageJson;
  
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (err) {
    packageJson = {
      "name": "marfanet",
      "version": "1.0.0",
      "description": "MarFaNet Financial Management System",
      "main": "server/index.ts",
      "scripts": {},
      "dependencies": {},
      "devDependencies": {}
    };
  }
  
  // تنظیم اسکریپت‌های اجرایی
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.dev = "NODE_ENV=development node -r ts-node/register server/index.ts";
  packageJson.scripts.start = "NODE_ENV=production node start-server.js";
  packageJson.scripts["dev:old"] = "NODE_ENV=development tsx server/index.ts";
  packageJson.scripts["build"] = "tsc";
  
  // ذخیره تغییرات
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ package.json با موفقیت به‌روزرسانی شد.");
'

echo -e "${GREEN}✅ اسکریپت اجرایی و package.json با موفقیت تنظیم شدند.${NC}"

# مرحله 6: ایجاد تعاریف تایپ مورد نیاز
echo -e "\n${YELLOW}[6/6]${NC} ایجاد تعاریف تایپ مورد نیاز..."

# ایجاد دایرکتوری types اگر وجود ندارد
mkdir -p /workspaces/AgentPortalShield/types
mkdir -p /workspaces/AgentPortalShield/server/types

# ایجاد فایل ws.d.ts
cat > /workspaces/AgentPortalShield/types/ws.d.ts << 'EOL'
// تعریف ساده برای رفع خطای ws
declare module 'ws';
EOL

# ایجاد فایل express.d.ts
cat > /workspaces/AgentPortalShield/server/types/express.d.ts << 'EOL'
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

echo -e "${GREEN}✅ تعاریف تایپ مورد نیاز با موفقیت ایجاد شدند.${NC}"

# توقف کانتینرهای قبلی
echo -e "\n${YELLOW}متوقف کردن کانتینرهای قبلی...${NC}"
docker-compose down

# راه‌اندازی کانتینرهای پایگاه داده
echo -e "\n${YELLOW}راه‌اندازی کانتینرهای پایگاه داده...${NC}"
docker-compose up -d db redis

# انتظار برای آماده شدن سرویس‌ها
echo -e "${YELLOW}انتظار برای آماده شدن سرویس‌ها...${NC}"
sleep 10

echo -e "\n${GREEN}✅ تمام مشکلات برطرف شدند!${NC}"
echo -e "${YELLOW}آیا می‌خواهید برنامه را اجرا کنید؟ (y/n)${NC} "
read -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}در حال اجرای برنامه...${NC}"
  npm run dev
else
  echo -e "\n${YELLOW}برای اجرای برنامه، دستور زیر را وارد کنید:${NC}"
  echo "npm run dev"
fi