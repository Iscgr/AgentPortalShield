#!/bin/bash

echo "رفع مشکل اجرای TypeScript..."

# نصب پکیج‌های مورد نیاز
echo "نصب پکیج‌های مورد نیاز..."
npm install --save-dev typescript ts-node tsx @types/node @types/express @types/express-session

# بررسی محتوای فعلی package.json
echo "محتوای فعلی package.json:"
cat /workspaces/AgentPortalShield/package.json

# ایجاد tsconfig.json اگر وجود نداشته باشد
if [ ! -f "/workspaces/AgentPortalShield/tsconfig.json" ]; then
  echo "ایجاد tsconfig.json..."
  cat > /workspaces/AgentPortalShield/tsconfig.json << 'EOL'
{
  "compilerOptions": {
    "target": "es2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
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
  echo "✅ tsconfig.json ایجاد شد."
fi

# ایجاد اسکریپت اجرایی
echo "ایجاد اسکریپت اجرایی..."
cat > /workspaces/AgentPortalShield/start-server.js << 'EOL'
#!/usr/bin/env node
// اسکریپت برای اجرای سرور بدون نیاز به tsx یا ts-node

require('ts-node/register');
require('./server/index.ts');
EOL

# اعطای دسترسی اجرایی
chmod +x /workspaces/AgentPortalShield/start-server.js

# تنظیم مجدد package.json
echo "تنظیم مجدد package.json..."
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
  packageJson.scripts.dev = "node -r ts-node/register server/index.ts";
  packageJson.scripts.start = "node start-server.js";
  packageJson.scripts["dev:old"] = "NODE_ENV=development tsx server/index.ts";
  
  // ذخیره تغییرات
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ package.json با موفقیت به‌روزرسانی شد.");
'

echo "✅ اصلاحات با موفقیت انجام شد."
echo "اکنون می‌توانید با استفاده از دستور زیر برنامه را اجرا کنید:"
echo "npm run dev"