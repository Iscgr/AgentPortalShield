# 🚀 MarFaNet Financial Management System

<div align="center">

![MarFaNet Logo](https://img.shields.io/badge/MarFaNet-Financial%20Management-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkZGRkZGIi8+Cjwvc3ZnPgo=)

**سیستم مدیریت مالی جامع با هوش مصنوعی**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org/)

[🌟 ویژگی‌ها](#-ویژگی‌ها) •
[🚀 نصب خودکار](#-نصب-خودکار) •
[📚 راهنمای کامل](#-راهنمای-کامل) •
[🔧 تنظیمات](#-تنظیمات) •
[💻 توسعه](#-توسعه)

</div>

---

## 📖 فهرست مطالب

- [معرفی سیستم](#-معرفی-سیستم)
- [ویژگی‌ها](#-ویژگی‌ها)
- [معماری سیستم](#-معماری-سیستم)
- [پیش‌نیازها](#-پیش‌نیازها)
- [نصب خودکار](#-نصب-خودکار)
- [راهنمای تنظیم دامنه](#-راهنمای-تنظیم-دامنه)
- [راهنمای کلادفلر](#-راهنمای-کلادفلر)
- [تنظیمات سرور](#-تنظیمات-سرور)
- [استفاده از سیستم](#-استفاده-از-سیستم)
- [API و ادغام](#-api-و-ادغام)
- [نگهداری و پشتیبانی](#-نگهداری-و-پشتیبانی)
- [عیب‌یابی](#-عیب‌یابی)
- [توسعه](#-توسعه)
- [مجوز](#-مجوز)

---

## 🎯 معرفی سیستم

**MarFaNet** یک سیستم مدیریت مالی پیشرفته و جامع است که برای مدیریت نمایندگان فروش، فاکتورها، پرداخت‌ها و عملیات مالی در محیط کسب‌وکار فارسی طراحی شده است. این سیستم با استفاده از آخرین تکنولوژی‌های وب و هوش مصنوعی، راهکاری کامل برای مدیریت مالی ارائه می‌دهد.

### 🌟 چرا MarFaNet؟

- **🤖 هوش مصنوعی**: تحلیل مالی هوشمند با Google Gemini AI
- **🔐 امنیت بالا**: احراز هویت چندمرحله‌ای و رمزگذاری
- **📱 موبایل‌محور**: طراحی ریسپانسیو برای همه دستگاه‌ها
- **🇮🇷 فارسی‌ساز**: پشتیبانی کامل از زبان فارسی و تقویم شمسی
- **⚡ سرعت بالا**: معماری مدرن با کارایی بهینه
- **🔄 بروزرسانی خودکار**: سیستم بروزرسانی و پشتیبان‌گیری خودکار

---

## ✨ ویژگی‌ها

### 🏢 مدیریت نمایندگان
- ثبت و مدیریت اطلاعات نمایندگان
- پورتال اختصاصی برای هر نماینده
- ردیابی عملکرد و گزارش‌گیری
- سیستم اعتبارسنجی و رتبه‌بندی

### 💰 مدیریت مالی
- صدور و مدیریت فاکتورها
- ردیابی پرداخت‌ها با الگوریتم FIFO
- محاسبه بدهی‌ها و مطالبات
- گزارش‌های مالی تفصیلی

### 📊 تحلیل‌های هوشمند
- تحلیل مالی با هوش مصنوعی
- پیش‌بینی جریان نقدی
- شناسایی الگوهای پرداخت
- هشدارهای هوشمند

### 🔒 امنیت و کنترل دسترسی
- احراز هویت مبتنی بر session
- کنترل دسترسی نقش‌محور (RBAC)
- رمزگذاری داده‌ها
- لاگ‌گیری تمام عملیات

### 📱 رابط کاربری مدرن
- طراحی Clay-morphism
- پشتیبانی RTL کامل
- تم تاریک/روشن
- انیمیشن‌های روان

### 🔔 اعلان‌ها و ارتباطات
- ادغام با Telegram Bot
- اعلان‌های بلادرنگ
- ایمیل خودکار
- اطلاع‌رسانی‌های هوشمند

---

## 🏗️ معماری سیستم

### Frontend (کلاینت)
```
React 18 + TypeScript + Vite
├── Components (shadcn/UI + Custom)
├── Pages (Dashboard, Representatives, Invoices)
├── Hooks (Custom hooks for state management)
├── Services (API communication)
└── Utils (Helper functions)
```

### Backend (سرور)
```
Node.js + Express + TypeScript
├── Routes (RESTful API endpoints)
├── Services (Business logic)
├── Middleware (Auth, Validation, Logging)
├── Database (Drizzle ORM + PostgreSQL)
└── Integrations (AI, Telegram, External APIs)
```

### Database (پایگاه داده)
```
PostgreSQL 15+
├── Representatives (نمایندگان)
├── Invoices (فاکتورها)
├── Payments (پرداخت‌ها)
├── Invoice_Batches (دسته‌بندی فاکتورها)
├── Activity_Logs (لاگ عملیات)
└── Sessions (جلسات کاربری)
```

---

## 🔧 پیش‌نیازها

### سیستم عامل
- **Ubuntu 20.04+** (پیشنهادی)
- **Debian 11+** (پشتیبانی شده)
- **CentOS 8+** (با تغییرات جزئی)

### سخت‌افزار مینیمم
- **CPU**: 2 هسته (4 هسته پیشنهادی)
- **RAM**: 4GB (8GB پیشنهادی)
- **Storage**: 20GB فضای خالی
- **Network**: اتصال اینترنت پایدار

### دامنه و DNS
- دامنه معتبر (مثل `your-domain.com`)
- دسترسی به تنظیمات DNS
- گواهی SSL (خودکار نصب می‌شود)

### دسترسی‌های مورد نیاز
- **Root/Sudo access** به سرور
- **SSH access** برای نصب
- **Port 80/443** برای HTTP/HTTPS
- **Port 22** برای SSH

---

## 🚀 نصب خودکار

MarFaNet یک اسکریپت نصب خودکار ارائه می‌دهد که تمام مراحل نصب را از صفر تا صد انجام می‌دهد.

### مرحله 1: دانلود و اجرای اسکریپت

```bash
# دانلود اسکریپت نصب
wget https://raw.githubusercontent.com/Iscgr/AgentPortalShield/main/deploy.sh

# اجازه اجرا
chmod +x deploy.sh

# اجرای نصب (به عنوان root)
sudo ./deploy.sh
```

### مرحله 2: وارد کردن اطلاعات

اسکریپت از شما اطلاعات زیر را خواهد پرسید:

#### 🌐 تنظیمات دامنه
```
Enter your domain name: your-domain.com
Enter your email for SSL: your-email@example.com
```

#### 🗄️ تنظیمات دیتابیس
```
PostgreSQL database name [marfanet_db]: 
PostgreSQL username [marfanet]: 
PostgreSQL password: [رمز عبور قوی]
```

#### 👤 تنظیمات مدیر
```
Admin username [admin]: 
Admin password: [رمز عبور قوی]
```

#### 📦 مخزن پروژه
```
GitHub repository URL [https://github.com/Iscgr/AgentPortalShield.git]: 
```

### مرحله 3: صبر برای تکمیل نصب

اسکریپت طی مراحل زیر کار خود را انجام می‌دهد:

1. **بروزرسانی سیستم** (2-5 دقیقه)
2. **نصب Node.js 20** (1-2 دقیقه)
3. **نصب PostgreSQL** (2-3 دقیقه)
4. **نصب Nginx** (1 دقیقه)
5. **کلون و ساخت اپلیکیشن** (3-5 دقیقه)
6. **تنظیم SSL** (1-2 دقیقه)
7. **تنظیم فایروال** (1 دقیقه)

**⏱️ زمان کل نصب: 15-20 دقیقه**

---

## 🌐 راهنمای تنظیم دامنه

### مرحله 1: خرید دامنه

دامنه خود را از یکی از ارائه‌دهندگان معتبر خریداری کنید:

**ارائه‌دهندگان پیشنهادی:**
- [Namecheap](https://namecheap.com) - ارزان و قابل اعتماد
- [GoDaddy](https://godaddy.com) - محبوب و گسترده
- [Cloudflare Registrar](https://cloudflare.com) - بهترین قیمت

### مرحله 2: تنظیم DNS Records

پس از خرید دامنه، رکوردهای DNS زیر را اضافه کنید:

```dns
# A Record - دامنه اصلی
Type: A
Name: @
Value: [IP آدرس سرور شما]
TTL: 300

# A Record - ساب‌دامنه www
Type: A
Name: www
Value: [IP آدرس سرور شما]
TTL: 300

# CNAME Record - ساب‌دامنه‌های اضافی (اختیاری)
Type: CNAME
Name: portal
Value: your-domain.com
TTL: 300
```

### مرحله 3: تأیید انتشار DNS

```bash
# بررسی انتشار DNS
nslookup your-domain.com
dig your-domain.com

# بررسی از چندین مکان
# https://dnschecker.org
```

**⏰ زمان انتشار DNS: 1-48 ساعت (معمولاً 1-2 ساعت)**

---

## ☁️ راهنمای کلادفلر

Cloudflare بهترین سرویس برای مدیریت DNS و بهبود عملکرد وب‌سایت است.

### مرحله 1: ثبت‌نام در Cloudflare

1. به [cloudflare.com](https://cloudflare.com) بروید
2. روی **"Sign Up"** کلیک کنید
3. اطلاعات خود را وارد کنید

### مرحله 2: اضافه کردن دامنه

1. روی **"Add a Site"** کلیک کنید
2. دامنه خود را وارد کنید (مثل `your-domain.com`)
3. پلن **Free** را انتخاب کنید (برای شروع کافی است)

### مرحله 3: تنظیم DNS Records

در صفحه DNS:

```dns
# رکورد اصلی
Type: A
Name: your-domain.com
IPv4 address: [IP سرور]
Proxy status: Proxied 🟠

# رکورد www
Type: A
Name: www
IPv4 address: [IP سرور]
Proxy status: Proxied 🟠

# رکورد پورتال نمایندگان
Type: CNAME
Name: portal
Target: your-domain.com
Proxy status: Proxied 🟠
```

### مرحله 4: تغییر Nameservers

1. Cloudflare دو nameserver به شما می‌دهد:
   ```
   noah.ns.cloudflare.com
   lola.ns.cloudflare.com
   ```

2. در پنل مدیریت دامنه خود، nameserver ها را تغییر دهید

3. برگردید به Cloudflare و روی **"Done, check nameservers"** کلیک کنید

### مرحله 5: تنظیمات امنیتی Cloudflare

#### SSL/TLS Settings
```
SSL/TLS encryption mode: Full (strict)
Always Use HTTPS: On
Minimum TLS Version: 1.2
```

#### Security Settings
```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
```

#### Speed Settings
```
Auto Minify: JS, CSS, HTML
Brotli: On
Rocket Loader: Off (برای React)
```

### مرحله 6: تنظیم Page Rules (اختیاری)

برای بهبود عملکرد:

```
URL: your-domain.com/api/*
Settings: 
  - Cache Level: Bypass
  - Security Level: Medium

URL: your-domain.com/*
Settings:
  - Always Use HTTPS: On
  - Browser Cache TTL: 4 hours
```

---

## 🔧 تنظیمات سرور

### تنظیم متغیرهای محیطی

پس از نصب، فایل `.env` را برای API کلیدها تنظیم کنید:

```bash
# ویرایش فایل تنظیمات
sudo nano /var/www/marfanet/.env
```

```env
# Database Configuration
DATABASE_URL=postgresql://marfanet:password@localhost:5432/marfanet_db

# Application Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Session Configuration
SESSION_SECRET=your-generated-secret

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

# ===== API KEYS (اضافه کنید) =====
# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Google Gemini AI
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Email Configuration (اختیاری)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### راهنمای دریافت API کلیدها

#### 🤖 Telegram Bot Token

1. به [@BotFather](https://t.me/BotFather) در تلگرام پیام دهید
2. دستور `/newbot` را ارسال کنید
3. نام و username برای ربات انتخاب کنید
4. Token دریافتی را در `.env` قرار دهید

#### 🧠 OpenAI API Key

1. به [platform.openai.com](https://platform.openai.com) بروید
2. حساب کاربری ایجاد یا وارد شوید
3. به بخش API Keys بروید
4. یک کلید جدید ایجاد کنید

#### 🔮 Google Gemini API Key

1. به [makersuite.google.com](https://makersuite.google.com) بروید
2. وارد حساب Google خود شوید
3. یک API key جدید ایجاد کنید
4. کلید را در `.env` قرار دهید

### راه‌اندازی پورتال نمایندگان

برای دسترسی نمایندگان از طریق ID:

#### روش 1: استفاده از Sub-domain
```nginx
# تنظیم در Cloudflare
Type: CNAME
Name: portal
Target: your-domain.com

# دسترسی: https://portal.your-domain.com?id=123
```

#### روش 2: استفاده از Path
```
# دسترسی مستقیم: https://your-domain.com/portal/123
```

#### روش 3: ساب‌دامنه اختصاصی برای هر نماینده
```bash
# اتوماتیک در Nginx تنظیم شده
# https://your-domain.com/portal/123
# https://your-domain.com/portal/456
```

---

## 📱 استفاده از سیستم

### ورود به پنل مدیریت

```
URL: https://your-domain.com/admin
Username: admin (یا آنچه در نصب وارد کردید)
Password: [رمز عبور مدیر]
```

### ورود کاربران CRM

```
URL: https://your-domain.com/crm
Username: [کاربر CRM]
Password: [رمز عبور CRM]
```

### دسترسی نمایندگان

```
URL: https://your-domain.com/portal/[ID نماینده]
مثال: https://your-domain.com/portal/123
```

### عملیات اصلی سیستم

#### 1. مدیریت نمایندگان
- ➕ **اضافه کردن نماینده جدید**
- ✏️ **ویرایش اطلاعات نماینده**
- 📊 **مشاهده گزارش عملکرد**
- 🔗 **تولید لینک پورتال اختصاصی**

#### 2. مدیریت فاکتورها
- 📄 **صدور فاکتور جدید**
- 📝 **ویرایش فاکتورهای موجود**
- 🔍 **جستجو و فیلترینگ**
- 📊 **گزارش‌گیری مالی**

#### 3. مدیریت پرداخت‌ها
- 💰 **ثبت پرداخت جدید**
- 🔄 **تسویه خودکار با الگوریتم FIFO**
- 📈 **ردیابی وضعیت پرداخت‌ها**
- ⚠️ **هشدارهای سررسید**

#### 4. گزارش‌گیری و تحلیل
- 📊 **داشبورد مدیریتی**
- 📈 **نمودارهای مالی**
- 🤖 **تحلیل هوشمند AI**
- 📄 **خروجی PDF/Excel**

---

## 🔌 API و ادغام

### API Endpoints اصلی

#### Authentication
```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
```

#### Representatives
```http
GET    /api/representatives
POST   /api/representatives
PUT    /api/representatives/:id
DELETE /api/representatives/:id
```

#### Invoices
```http
GET    /api/invoices
POST   /api/invoices
PUT    /api/invoices/:id
DELETE /api/invoices/:id
```

#### Payments
```http
GET    /api/payments
POST   /api/payments
PUT    /api/payments/:id
```

#### Reports
```http
GET /api/reports/financial
GET /api/reports/representatives
GET /api/reports/payments
```

### نمونه کد ادغام

#### JavaScript/Node.js
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://your-domain.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// ورود
const login = async (username, password) => {
  const response = await client.post('/auth/login', {
    username,
    password
  });
  return response.data;
};

// دریافت نمایندگان
const getRepresentatives = async () => {
  const response = await client.get('/representatives');
  return response.data;
};
```

#### Python
```python
import requests

class MarFaNetAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
    
    def login(self, username, password):
        response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"username": username, "password": password}
        )
        return response.json()
    
    def get_representatives(self):
        response = self.session.get(f"{self.base_url}/representatives")
        return response.json()

# استفاده
api = MarFaNetAPI("https://your-domain.com/api")
api.login("admin", "password")
representatives = api.get_representatives()
```

---

## 🛠️ نگهداری و پشتیبانی

### اسکریپت‌های مدیریت سیستم

#### بررسی وضعیت سیستم
```bash
# بررسی سلامت کلی سیستم
sudo /var/www/marfanet/scripts/health-check.sh your-domain.com

# مشاهده وضعیت سرویس‌ها
sudo systemctl status marfanet nginx postgresql
```

#### پشتیبان‌گیری
```bash
# پشتیبان‌گیری خودکار
sudo /var/www/marfanet/scripts/backup.sh

# مشاهده پشتیبان‌ها
ls -la /var/backups/marfanet/
```

#### بروزرسانی سیستم
```bash
# بروزرسانی اپلیکیشن
sudo /var/www/marfanet/scripts/update.sh

# بروزرسانی با فورس
sudo /var/www/marfanet/scripts/update.sh --force
```

### مانیتورینگ و لاگ‌ها

#### مشاهده لاگ‌ها
```bash
# لاگ اپلیکیشن
sudo journalctl -u marfanet -f

# لاگ Nginx
sudo tail -f /var/log/nginx/marfanet.access.log
sudo tail -f /var/log/nginx/marfanet.error.log

# لاگ PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### نظارت بر منابع سیستم
```bash
# استفاده CPU و RAM
htop

# فضای دیسک
df -h

# اتصالات شبکه
netstat -tulpn | grep :3000
```

### برنامه‌ریزی تسک‌های خودکار

سیستم به طور خودکار تسک‌های زیر را انجام می‌دهد:

```cron
# پشتیبان‌گیری روزانه در ساعت 2 صبح
0 2 * * * /var/www/marfanet/scripts/backup.sh

# تمدید SSL در ساعت 12 ظهر
0 12 * * * /usr/bin/certbot renew --quiet

# بررسی سلامت سیستم هر 30 دقیقه
*/30 * * * * /var/www/marfanet/scripts/health-check.sh
```

---

## 🐛 عیب‌یابی

### مشکلات رایج و راه‌حل‌ها

#### 1. اپلیکیشن در دسترس نیست

**علائم:**
- خطای 502 Bad Gateway
- صفحه لود نمی‌شود

**راه‌حل:**
```bash
# بررسی وضعیت سرویس
sudo systemctl status marfanet

# راه‌اندازی مجدد
sudo systemctl restart marfanet

# بررسی لاگ خطاها
sudo journalctl -u marfanet --no-pager -l
```

#### 2. مشکل دیتابیس

**علائم:**
- خطای اتصال به دیتابیس
- صفحات خالی

**راه‌حل:**
```bash
# بررسی وضعیت PostgreSQL
sudo systemctl status postgresql

# اتصال به دیتابیس
sudo -u postgres psql -d marfanet_db

# اجرای مایگریشن مجدد
cd /var/www/marfanet && npm run db:push
```

#### 3. مشکل SSL

**علائم:**
- هشدار گواهی نامعتبر
- عدم امکان دسترسی HTTPS

**راه‌حل:**
```bash
# بررسی وضعیت گواهی
sudo certbot certificates

# تمدید دستی گواهی
sudo certbot renew --force-renewal

# راه‌اندازی مجدد Nginx
sudo systemctl restart nginx
```

#### 4. مشکل عملکرد

**علائم:**
- سرعت پایین
- تایم‌اوت درخواست‌ها

**راه‌حل:**
```bash
# بررسی استفاده منابع
htop
df -h
free -h

# بررسی لاگ عملکرد
sudo journalctl -u marfanet | grep "PERFORMANCE"

# راه‌اندازی مجدد سرویس‌ها
sudo systemctl restart marfanet nginx
```

### راهنمای تشخیص سریع

#### تست‌های اولیه
```bash
# تست پاسخ HTTP
curl -I http://localhost:3000

# تست پاسخ HTTPS
curl -I https://your-domain.com

# تست اتصال دیتابیس
sudo -u postgres psql -d marfanet_db -c "SELECT 1;"

# تست API
curl -X GET https://your-domain.com/api/health
```

#### کدهای خطای رایج

| کد خطا | معنی | راه‌حل |
|--------|------|--------|
| 502 | Bad Gateway | بررسی سرویس اپلیکیشن |
| 503 | Service Unavailable | بررسی بار سرور |
| 500 | Internal Server Error | بررسی لاگ‌ها |
| 404 | Not Found | بررسی تنظیمات Nginx |
| 403 | Forbidden | بررسی مجوزها |

---

## 💻 توسعه

### راه‌اندازی محیط توسعه

#### پیش‌نیازها
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Git
sudo apt install git
```

#### کلون پروژه
```bash
git clone https://github.com/Iscgr/AgentPortalShield.git
cd AgentPortalShield
```

#### نصب dependencies
```bash
npm install
```

#### تنظیم دیتابیس توسعه
```bash
# ایجاد دیتابیس
sudo -u postgres createdb marfanet_dev

# تنظیم متغیرهای محیطی
cp .env.example .env.local
# ویرایش .env.local
```

#### اجرای حالت توسعه
```bash
npm run dev
```

### ساختار پروژه

```
AgentPortalShield/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/         # Pages
│   │   ├── hooks/         # Custom Hooks
│   │   ├── lib/           # Utilities
│   │   └── styles/        # Styles
├── server/                # Express Backend
│   ├── routes/           # API Routes
│   ├── services/         # Business Logic
│   ├── middleware/       # Express Middleware
│   └── utils/            # Server Utilities
├── shared/               # Shared Types & Schema
│   └── schema.ts         # Database Schema
├── scripts/              # Deployment Scripts
├── deploy.sh             # Auto Deploy Script
└── README.md             # This File
```

### دستورات مفید

```bash
# Development
npm run dev          # شروع dev server
npm run build        # ساخت برای production
npm run start        # اجرای production build

# Database
npm run db:push      # اعمال تغییرات schema
npm run db:studio    # باز کردن Drizzle Studio

# Type Checking
npm run check        # بررسی TypeScript errors

# Linting & Formatting
npm run lint         # بررسی کیفیت کد
npm run format       # فرمت کردن کد
```

### ساخت ویژگی‌های جدید

#### 1. اضافه کردن مدل جدید
```typescript
// shared/schema.ts
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

#### 2. ایجاد API endpoint
```typescript
// server/routes/newRoute.ts
import { Router } from 'express';

const router = Router();

router.get('/new-endpoint', async (req, res) => {
  // Business logic
  res.json({ success: true });
});

export default router;
```

#### 3. ساخت کامپوننت UI
```tsx
// client/src/components/NewComponent.tsx
export function NewComponent() {
  return (
    <div className="p-4">
      <h1>New Component</h1>
    </div>
  );
}
```

### راهنمای مشارکت

1. **Fork** کردن پروژه
2. ایجاد **branch** جدید برای ویژگی
3. **Commit** تغییرات با پیام‌های واضح
4. **Push** به branch خود
5. ایجاد **Pull Request**

### استانداردهای کدنویسی

- استفاده از **TypeScript** برای type safety
- پیروی از **ESLint** rules
- نوشتن **کامنت** برای کدهای پیچیده
- **تست** نوشتن برای ویژگی‌های جدید
- استفاده از **Prettier** برای فرمت کد

---

## 🤝 حمایت و پشتیبانی

### گزارش مشکلات

اگر با مشکلی مواجه شدید:

1. **GitHub Issues**: [ایجاد مسئله جدید](https://github.com/Iscgr/AgentPortalShield/issues)
2. **توضیح دقیق مشکل**: لاگ‌ها، screenshot ها
3. **اطلاعات محیط**: OS، Node.js version، browser

### درخواست ویژگی‌های جدید

برای پیشنهاد ویژگی جدید:

1. ابتدا [Issues موجود](https://github.com/Iscgr/AgentPortalShield/issues) را بررسی کنید
2. اگر ویژگی وجود ندارد، یک Issue جدید ایجاد کنید
3. توضیح کاملی از ویژگی مورد نظر ارائه دهید

### مشارکت در توسعه

ما از مشارکت جامعه استقبال می‌کنیم:

- **Code contribution**: پیاده‌سازی ویژگی‌ها و رفع باگ‌ها
- **Documentation**: بهبود مستندات
- **Testing**: تست و گزارش مشکلات
- **Translation**: ترجمه به زبان‌های دیگر

---

## 📜 مجوز

این پروژه تحت مجوز [MIT License](LICENSE) منتشر شده است.

```
MIT License

Copyright (c) 2024 MarFaNet Development Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🌟 ویژگی‌های آینده

### نسخه 2.0 (در دست توسعه)

- **🔄 PWA Support**: تبدیل به Progressive Web App
- **📱 Mobile App**: اپلیکیشن موبایل native
- **🔗 API Gateway**: ادغام با سیستم‌های خارجی
- **📊 Advanced Analytics**: تحلیل‌های پیشرفته‌تر
- **🤖 Chatbot**: ربات پشتیبانی هوشمند
- **🔐 2FA**: احراز هویت دو مرحله‌ای
- **🌍 Multi-language**: پشتیبانی از زبان‌های بیشتر

### درخواست‌های جامعه

بر اساس بازخوردهای کاربران:

- **📈 Dashboard سفارشی**: قابلیت تنظیم داشبورد
- **📄 Templates**: قالب‌های آماده فاکتور
- **💱 Multi-currency**: پشتیبانی از ارزهای مختلف
- **🔔 Smart Notifications**: اعلان‌های هوشمند‌تر

---

<div align="center">

### 🎉 تبریک! MarFaNet شما آماده است!

**برای راهنمایی بیشتر یا پشتیبانی، با ما در تماس باشید.**

[![GitHub](https://img.shields.io/badge/GitHub-MarFaNet-blue?style=for-the-badge&logo=github)](https://github.com/Iscgr/AgentPortalShield)
[![Website](https://img.shields.io/badge/Website-MarFaNet-green?style=for-the-badge&logo=web)](https://your-domain.com)

**ساخته شده با ❤️ برای جامعه کسب‌وکار ایران**

</div>