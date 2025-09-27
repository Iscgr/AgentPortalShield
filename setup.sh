#!/bin/bash

# دادن دسترسی اجرا به همه اسکریپت‌ها
echo "دادن دسترسی اجرا به همه اسکریپت‌ها..."
chmod +x /workspaces/AgentPortalShield/*.sh

echo "✅ انجام شد!"

echo ""
echo "حالا می‌توانید یکی از اسکریپت‌های زیر را اجرا کنید:"
echo ""
echo "1. برای رفع کامل مشکلات و اجرای برنامه:"
echo "   ./advanced-troubleshoot.sh"
echo ""
echo "2. اگر هنوز مشکل دارید، از اسکریپت پشتیبان استفاده کنید:"
echo "   ./run-with-tsnode.sh"
echo ""