#!/bin/bash

echo "رفع مشکل tsx که پیدا نشده است..."

# نصب tsx به صورت گلوبال
echo "نصب tsx به صورت گلوبال..."
npm install -g tsx

# نصب tsx در پروژه نیز
echo "نصب tsx در پروژه..."
cd /workspaces/AgentPortalShield
npm install --save-dev tsx

# بررسی مسیر tsx
echo "مسیر tsx:"
which tsx || echo "tsx هنوز پیدا نشده است"

# آیا در node_modules/.bin قرار دارد؟
if [ -f "/workspaces/AgentPortalShield/node_modules/.bin/tsx" ]; then
  echo "tsx در node_modules/.bin پیدا شد"
else
  echo "tsx در node_modules/.bin پیدا نشد"
fi

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

echo "✅ اصلاحات انجام شد"