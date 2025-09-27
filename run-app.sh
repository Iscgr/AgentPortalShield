#!/bin/bash

# خروجی نصب بسته‌ها و اصلاح تایپ‌اسکریپت
chmod +x /workspaces/AgentPortalShield/setup-typings.sh
/workspaces/AgentPortalShield/setup-typings.sh

# نمایش خروجی
echo "✅ Dependencies installed and TypeScript configuration updated"
echo ""

# شروع اپلیکیشن
echo "🚀 Starting the application..."
echo ""
cd /workspaces/AgentPortalShield && npm run dev