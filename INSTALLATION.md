# 🚀 راهنمای نصب سریع MarFaNet

## نصب با یک دستور

```bash
# دانلود و اجرای اسکریپت نصب خودکار
curl -sSL https://raw.githubusercontent.com/Iscgr/AgentPortalShield/main/deploy.sh | sudo bash
```

## یا نصب دستی

### مرحله 1: دانلود
```bash
wget https://raw.githubusercontent.com/Iscgr/AgentPortalShield/main/deploy.sh
chmod +x deploy.sh
```

### مرحله 2: اجرا
```bash
sudo ./deploy.sh
```

### مرحله 3: پیکربندی
اسکریپت از شما موارد زیر را خواهد پرسید:

- **دامنه**: `your-domain.com`
- **ایمیل SSL**: `your-email@example.com`
- **رمز دیتابیس**: رمز قوی انتخاب کنید
- **رمز مدیر**: رمز قوی برای پنل مدیریت

### مرحله 4: تنظیم DNS
در پنل مدیریت دامنه خود:

```dns
Type: A
Name: @
Value: [IP سرور شما]

Type: A  
Name: www
Value: [IP سرور شما]
```

### مرحله 5: API کلیدها
پس از نصب، API کلیدها را به فایل `.env` اضافه کنید:

```bash
sudo nano /var/www/marfanet/.env
```

## ✅ تست نصب

```bash
# بررسی وضعیت سرویس‌ها
sudo systemctl status marfanet nginx postgresql

# تست HTTP
curl -I https://your-domain.com

# اجرای health check
sudo /var/www/marfanet/scripts/health-check.sh your-domain.com
```

## 🔗 دسترسی‌ها

- **پنل مدیریت**: `https://your-domain.com/admin`
- **پنل CRM**: `https://your-domain.com/crm`  
- **پورتال نمایندگان**: `https://your-domain.com/portal/[ID]`

## ⚡ دستورات سریع

```bash
# راه‌اندازی مجدد
sudo systemctl restart marfanet

# مشاهده لاگ‌ها
sudo journalctl -u marfanet -f

# پشتیبان‌گیری
sudo /var/www/marfanet/scripts/backup.sh

# بروزرسانی
sudo /var/www/marfanet/scripts/update.sh
```

برای راهنمای کامل، `README.md` را مطالعه کنید.