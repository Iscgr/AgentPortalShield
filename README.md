
# راهنمای کامل نصب و راه‌اندازی MarFaNet

## 🌟 مقدمه

MarFaNet سیستم مدیریت مالی پیشرفته‌ای است که برای مدیریت فاکتورها، نمایندگان فروش، و عملیات مالی طراحی شده است. این راهنما شامل تمام مراحل نصب از صفر تا صد برای افراد مبتدی است.

## 🎯 روش‌های نصب

### 1️⃣ نصب خودکار روی Ubuntu (توصیه شده)
### 2️⃣ نصب دستی روی Ubuntu
### 3️⃣ استقرار روی Replit

---

## 🚀 روش اول: نصب خودکار Ubuntu (پیشنهادی)

### مرحله 1: آماده‌سازی سرور

**الف) خرید و راه‌اندازی سرور Ubuntu:**
- حداقل مشخصات: 2GB RAM, 20GB Storage, Ubuntu 20.04+
- کلودهای پیشنهادی: DigitalOcean, Linode, Vultr, Hetzner

**ب) اتصال به سرور:**
```bash
# اتصال از طریق SSH
ssh root@YOUR_SERVER_IP

# ایجاد کاربر جدید (اختیاری اما توصیه شده)
adduser marfanet
usermod -aG sudo marfanet
su - marfanet
```

### مرحله 2: دانلود و اجرای اسکریپت خودکار

```bash
# دانلود اسکریپت
wget https://raw.githubusercontent.com/your-repo/marfanet/main/deploy-ubuntu.sh

# اجازه اجرا
chmod +x deploy-ubuntu.sh

# اجرای اسکریپت
./deploy-ubuntu.sh
```

**اسکریپت به صورت خودکار موارد زیر را انجام می‌دهد:**
- ✅ بروزرسانی سیستم عامل
- ✅ نصب Node.js 20 LTS
- ✅ نصب و پیکربندی PostgreSQL
- ✅ کلون و ساخت اپلیکیشن
- ✅ تنظیم متغیرهای محیطی
- ✅ ایجاد سرویس سیستمی
- ✅ پیکربندی Nginx
- ✅ نصب SSL Certificate
- ✅ راه‌اندازی مانیتورینگ
- ✅ تست نهایی سیستم

### مرحله 3: اطلاعات مورد نیاز در حین نصب

اسکریپت موارد زیر را از شما می‌پرسد:

```
رمز عبور PostgreSQL: [رمز قوی وارد کنید]
نام کاربری مدیر اپلیکیشن: mgr
رمز عبور مدیر اپلیکیشن: 8679
نام دامنه شما: example.com
کلید API Google Gemini: [اختیاری]
توکن ربات تلگرام: [اختیاری]
Chat ID تلگرام: [اختیاری]
آدرس Git Repository: [اختیاری]
```

---

## 🌐 تنظیم دامنه در Cloudflare

### مرحله 1: خرید دامنه
1. از سایت‌های Namecheap، GoDaddy یا مشابه دامنه بخرید
2. دامنه را به Cloudflare انتقال دهید

### مرحله 2: تنظیم DNS در Cloudflare

**ورود به Cloudflare:**
1. وارد [Cloudflare.com](https://cloudflare.com) شوید
2. روی دامنه خود کلیک کنید
3. به تب DNS بروید

**اضافه کردن A Record:**
```
Type: A
Name: @ (یا root domain)
IPv4 Address: YOUR_SERVER_IP
Proxy Status: DNS Only (خاکستری، نه نارنجی)
TTL: Auto
```

**اضافه کردن CNAME برای www:**
```
Type: CNAME
Name: www
Target: your-domain.com
Proxy Status: DNS Only
TTL: Auto
```

**اضافه کردن A Record برای subdomains (اختیاری):**
```
Type: A
Name: api
IPv4 Address: YOUR_SERVER_IP
Proxy Status: DNS Only

Type: A  
Name: portal
IPv4 Address: YOUR_SERVER_IP
Proxy Status: DNS Only
```

### مرحله 3: تنظیمات SSL در Cloudflare

1. **SSL/TLS Tab > Overview:**
   - SSL/TLS encryption mode: `Full (strict)`

2. **SSL/TLS Tab > Edge Certificates:**
   - Always Use HTTPS: `On`
   - HTTP Strict Transport Security (HSTS): `Enable`
   - Minimum TLS Version: `1.2`

3. **Security Tab:**
   - Security Level: `Medium`
   - Bot Fight Mode: `On`

### مرحله 4: تست DNS

```bash
# تست DNS resolution
nslookup your-domain.com
dig your-domain.com

# تست از سایت
https://dnschecker.org
```

---

## 👥 مدیریت نمایندگان و Portal Links

### مرحله 1: اضافه کردن نمایندگان

پس از نصب موفق:

1. **وارد پنل مدیریت شوید:**
   ```
   آدرس: https://your-domain.com
   کاربری: mgr
   رمز: 8679
   ```

2. **به بخش نمایندگان بروید:**
   - کلیک روی "نمایندگان" در منو
   - کلیک روی "نماینده جدید"

3. **اطلاعات نماینده را وارد کنید:**
   ```
   نام: فروشگاه ABC
   کد: ABC123
   تلفن: 09123456789
   آدرس: ...
   ```

### مرحله 2: دریافت Portal Link

پس از ایجاد نماینده:

1. **Public ID خودکار ایجاد می‌شود**
2. **Portal Link:** `https://your-domain.com/portal/PUBLIC_ID`

**مثال:**
- نماینده: فروشگاه ABC
- Public ID: abc-123-xyz
- Portal Link: `https://your-domain.com/portal/abc-123-xyz`

### مرحله 3: ارسال Link به نمایندگان

**روش 1: دستی**
```
Portal Link شما:
https://your-domain.com/portal/abc-123-xyz

از این لینک برای دسترسی به پنل مالی خود استفاده کنید.
```

**روش 2: از طریق تلگرام (اگر ربات تنظیم شده باشد)**
- در پنل مدیریت به بخش "ارسال پیام" بروید
- نماینده مورد نظر را انتخاب کنید
- "ارسال لینک پورتال" را کلیک کنید

---

## 🔧 روش دوم: نصب دستی Ubuntu

### مرحله 1: آماده‌سازی سیستم

```bash
# بروزرسانی
sudo apt update && sudo apt upgrade -y

# نصب ابزارهای ضروری
sudo apt install -y curl wget gnupg2 software-properties-common git
```

### مرحله 2: نصب Node.js

```bash
# اضافه کردن repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# نصب Node.js
sudo apt install -y nodejs

# نصب PM2
sudo npm install -g pm2

# تست
node --version
npm --version
```

### مرحله 3: نصب PostgreSQL

```bash
# نصب PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# شروع سرویس
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ایجاد کاربر و دیتابیس
sudo -u postgres psql << EOF
CREATE USER marfanet WITH PASSWORD 'your_strong_password';
CREATE DATABASE marfanet_db OWNER marfanet;
GRANT ALL PRIVILEGES ON DATABASE marfanet_db TO marfanet;
\q
EOF
```

### مرحله 4: دانلود و نصب اپلیکیشن

```bash
# ایجاد دایرکتوری
sudo mkdir -p /opt/marfanet
sudo chown $USER:$USER /opt/marfanet
cd /opt/marfanet

# کلون کردن (یا آپلود فایل‌ها)
# git clone YOUR_REPO_URL .

# نصب وابستگی‌ها
npm install --production

# ساخت اپلیکیشن
npm run build
```

### مرحله 5: تنظیم متغیرهای محیطی

```bash
# ایجاد فایل .env
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://marfanet:your_password@localhost:5432/marfanet_db
SESSION_SECRET=$(openssl rand -base64 32)
ADMIN_USERNAME=mgr
ADMIN_PASSWORD=8679
GEMINI_API_KEY=your_gemini_key
TELEGRAM_BOT_TOKEN=your_telegram_token
REPLIT_DOMAIN=your-domain.com
EOF

chmod 600 .env
```

### مرحله 6: ایجاد سرویس سیستمی

```bash
sudo cat > /etc/systemd/system/marfanet.service << EOF
[Unit]
Description=MarFaNet Financial CRM
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/marfanet
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable marfanet
sudo systemctl start marfanet
```

### مرحله 7: نصب و پیکربندی Nginx

```bash
# نصب Nginx
sudo apt install -y nginx

# ایجاد پیکربندی
sudo cat > /etc/nginx/sites-available/marfanet << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location /portal/ {
        add_header X-Frame-Options "ALLOWALL" always;
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# فعال‌سازی
sudo ln -s /etc/nginx/sites-available/marfanet /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### مرحله 8: نصب SSL

```bash
# نصب Certbot
sudo apt install -y certbot python3-certbot-nginx

# دریافت certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# تنظیم تمدید خودکار
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 🌟 روش سوم: استقرار روی Replit

### مرحله 1: ایجاد پروژه در Replit

1. وارد [Replit.com](https://replit.com) شوید
2. کلیک روی "Create Repl"
3. "Import from GitHub" را انتخاب کنید
4. آدرس repository را وارد کنید

### مرحله 2: تنظیم Environment Variables

در پنل Secrets تنظیم کنید:
```
DATABASE_URL=your_neon_postgresql_url
GEMINI_API_KEY=your_gemini_key
SESSION_SECRET=random_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_token
ADMIN_USERNAME=mgr
ADMIN_PASSWORD=8679
```

### مرحله 3: اجرا و Deploy

```bash
# نصب وابستگی‌ها
npm install

# ساخت پروژه
npm run build

# اجرا
npm start
```

### مرحله 4: تنظیم Custom Domain

1. در پنل Deployments کلیک کنید
2. "Link a domain" را انتخاب کنید
3. دامنه خود را وارد کنید
4. DNS records ارائه شده را در Cloudflare تنظیم کنید

---

## 🔧 تنظیمات پیشرفته

### تنظیم ربات تلگرام

1. **ایجاد ربات:**
   - به [@BotFather](https://t.me/botfather) پیام دهید
   - دستور `/newbot` را ارسال کنید
   - نام و username ربات را تعیین کنید
   - Token دریافتی را کپی کنید

2. **دریافت Chat ID:**
   - به [@userinfobot](https://t.me/userinfobot) پیام دهید
   - Chat ID خود را کپی کنید

3. **تنظیم در اپلیکیشن:**
   - وارد پنل مدیریت شوید
   - به بخش "تنظیمات" > "تلگرام" بروید
   - Token و Chat ID را وارد کنید

### تنظیم Google Gemini

1. **دریافت API Key:**
   - وارد [Google AI Studio](https://makersuite.google.com/app/apikey) شوید
   - "Create API Key" کلیک کنید
   - API Key را کپی کنید

2. **تنظیم در اپلیکیشن:**
   - در فایل `.env` یا Secrets قرار دهید
   - یا از پنل تنظیمات استفاده کنید

---

## 🔍 عیب‌یابی

### مشکلات رایج و راه‌حل

#### 1. سرویس راه‌اندازی نمی‌شود
```bash
# بررسی وضعیت
sudo systemctl status marfanet

# مشاهده لاگ‌ها
sudo journalctl -u marfanet -f

# ری‌استارت
sudo systemctl restart marfanet
```

#### 2. خطای اتصال به دیتابیس
```bash
# تست اتصال
PGPASSWORD=your_password psql -h localhost -U marfanet -d marfanet_db

# بررسی وضعیت PostgreSQL
sudo systemctl status postgresql

# ری‌استارت PostgreSQL
sudo systemctl restart postgresql
```

#### 3. مشکل SSL
```bash
# تست certificate
sudo certbot certificates

# تمدید دستی
sudo certbot renew

# تست Nginx
sudo nginx -t
```

#### 4. مشکل DNS
```bash
# تست DNS
nslookup your-domain.com
dig your-domain.com

# پاک کردن cache DNS محلی
sudo systemd-resolve --flush-caches
```

### لاگ‌های مهم

```bash
# لاگ اپلیکیشن
sudo journalctl -u marfanet -f

# لاگ Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# لاگ PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# لاگ مانیتورینگ
sudo tail -f /var/log/marfanet-monitor.log
```

---

## 📊 مدیریت و نگهداری

### بکاپ گیری

**بکاپ دیتابیس:**
```bash
# ایجاد بکاپ
PGPASSWORD=your_password pg_dump -h localhost -U marfanet marfanet_db > backup_$(date +%Y%m%d).sql

# بازیابی
PGPASSWORD=your_password psql -h localhost -U marfanet marfanet_db < backup_file.sql
```

**بکاپ فایل‌های اپلیکیشن:**
```bash
# ایجاد آرشیو
tar -czf marfanet_backup_$(date +%Y%m%d).tar.gz /opt/marfanet

# استخراج
tar -xzf marfanet_backup.tar.gz
```

### بروزرسانی اپلیکیشن

```bash
cd /opt/marfanet

# بکاپ گیری
cp -r /opt/marfanet /opt/marfanet.backup

# دانلود نسخه جدید
git pull origin main

# نصب وابستگی‌های جدید
npm install --production

# ساخت مجدد
npm run build

# ری‌استارت
sudo systemctl restart marfanet
```

### مانیتورینگ سیستم

```bash
# بررسی سلامت سیستم
curl http://localhost:5000/health

# بررسی مصرف منابع
htop
df -h
free -m

# بررسی اتصالات شبکه
netstat -tlnp
```

---

## 🎯 مزایا و ویژگی‌ها

### ویژگی‌های کلیدی
- ✅ مدیریت کامل فاکتورها و پرداخت‌ها
- ✅ سیستم نمایندگی با Portal اختصاصی
- ✅ پردازش خودکار فایل‌های JSON
- ✅ یکپارچه‌سازی با تلگرام
- ✅ تحلیل مالی با هوش مصنوعی
- ✅ پشتیبانی کامل از زبان فارسی
- ✅ سازگار با موبایل و تبلت
- ✅ سیستم امنیتی پیشرفته

### مزایای نصب خودکار
- 🚀 نصب در کمتر از 30 دقیقه
- 🔧 پیکربندی خودکار تمام سرویس‌ها
- 🛡️ تنظیمات امنیتی بهینه
- 📊 مانیتورینگ خودکار
- 🔄 بازیابی خودکار در صورت خرابی
- 📝 مستندسازی کامل

---

## 🆘 پشتیبانی

### اطلاعات تماس
- 📧 Email: support@marfanet.com
- 💬 Telegram: @MarFaNetSupport
- 🌐 Website: https://marfanet.com

### مستندات بیشتر
- 📖 راهنمای کاربری: `/docs/user-guide.md`
- 🔧 راهنمای توسعه‌دهندگان: `/docs/developer-guide.md`
- 🐛 گزارش باگ: GitHub Issues
- 💡 درخواست ویژگی: Feature Requests

### جامعه کاربران
- 👥 گروه تلگرام: @MarFaNetCommunity
- 💬 انجمن: https://community.marfanet.com
- 📚 پایگاه دانش: https://kb.marfanet.com

---

## 📄 لایسنس و حقوق

این نرم‌افزار تحت لایسنس اختصاصی MarFaNet توسعه یافته و تمام حقوق محفوظ است.

**نسخه:** 2.0.0  
**آخرین بروزرسانی:** ژانویه 2025  
**سازگاری:** Ubuntu 20.04+, Node.js 20+, PostgreSQL 14+  

---

**🎉 موفقیت در راه‌اندازی MarFaNet! 🎉**
