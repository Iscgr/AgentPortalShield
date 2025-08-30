
# MarFaNet Architecture Migration - تحلیل جامع مهاجرت معماری

## PHASE 1: تحلیل سیستم موجود و برنامه‌ریزی مهاجرت

### 1.1 تحلیل اجزای CRM موجود برای حذف

#### شناسایی مسیرهای CRM
```typescript
// مسیرهای شناسایی شده برای حذف:
const CRM_ROUTES_TO_REMOVE = [
  '/crm/dashboard',
  '/crm/tasks',
  '/crm/reports', 
  '/crm/settings',
  '/crm/workspace'
];

// اجزای رابط کاربری برای حذف:
const CRM_COMPONENTS_TO_REMOVE = [
  'modern-crm-dashboard.tsx',
  'workspace/WorkspaceHub.tsx',
  'workspace/TaskCard.tsx',
  'workspace/TaskForm.tsx',
  'settings/ManagerWorkspace.tsx'
];
```

#### نگهداری اجزای ضروری
```typescript
// اجزای حفظ شده:
const PRESERVED_COMPONENTS = [
  'representatives.tsx',     // مدیریت نمایندگان
  'invoices.tsx',           // مدیریت فاکتورها
  'financial-integrity.tsx', // یکپارچگی مالی
  'dashboard.tsx'           // داشبورد ادمین
];

// موجودیت‌های پایگاه داده حفظ شده:
const PRESERVED_ENTITIES = [
  'representatives',
  'invoices', 
  'payments',
  'users'
];
```

### 1.2 طراحی معماری Telegram Bot پیشرفته

#### ساختار پیام‌های دستوری
```typescript
interface TelegramCommandStructure {
  REPORT: {
    format: "#گزارش {نوع} {توضیحات}";
    types: ['روزانه', 'هفتگی', 'فنی', 'فروش'];
    handler: 'handleReportCommand';
  };
  TASK: {
    format: "#وظیفه {اولویت} {توضیحات}";
    priorities: ['عادی', 'مهم', 'فوری'];
    handler: 'handleTaskCommand';
  };
  LEAVE: {
    format: "#مرخصی {تاریخ} {مدت} {دلیل}";
    handler: 'handleLeaveCommand';
  };
  FOLLOW_UP: {
    format: "#پیگیری {شناسه نماینده} {توضیحات}";
    handler: 'handleFollowUpCommand';
  };
}
```

### 1.3 طراحی پایگاه داده جدید

#### موجودیت‌های جدید
```sql
-- AI Settings
CREATE TABLE ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grok_api_key VARCHAR(255) NOT NULL,
  grok_api_endpoint VARCHAR(255) DEFAULT 'https://api.grok.x.ai/v1',
  ai_temperature FLOAT DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 4096,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telegram Activities
CREATE TABLE telegram_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id VARCHAR(50) UNIQUE NOT NULL,
  chat_id VARCHAR(50) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  parsed_data JSON,
  processed BOOLEAN DEFAULT FALSE,
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_response_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM Employees  
CREATE TABLE crm_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  telegram_username VARCHAR(50) UNIQUE,
  telegram_id VARCHAR(50) UNIQUE NOT NULL,
  position VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  permission_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM Tasks
CREATE TABLE crm_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  assigned_to_id INTEGER NOT NULL,
  representative_id INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  source VARCHAR(20) DEFAULT 'manual',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to_id) REFERENCES crm_employees(id),
  FOREIGN KEY (representative_id) REFERENCES representatives(id)
);

-- AI Directives
CREATE TABLE ai_directives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  directive_type VARCHAR(30) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  scheduled BOOLEAN DEFAULT FALSE,
  schedule_time TIMESTAMP,
  expiry_time TIMESTAMP,
  priority INTEGER DEFAULT 10,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## PHASE 2: استراتژی امنیت و کنترل دسترسی

### 2.1 رمزگذاری API Key
```typescript
// الگوی رمزگذاری برای کلیدهای API
const ENCRYPTION_STRATEGY = {
  algorithm: 'aes-256-cbc',
  keyLength: 32, // bytes
  ivLength: 16,  // bytes
  storage: 'database_encrypted'
};
```

### 2.2 سطوح دسترسی
```typescript
const PERMISSION_LEVELS = {
  ADMIN: [
    'admin.crm_assistant.view',
    'admin.crm_assistant.manage', 
    'admin.crm_assistant.configure_ai'
  ],
  MANAGER: [
    'admin.crm_assistant.view',
    'admin.crm_assistant.manage'
  ],
  VIEWER: [
    'admin.crm_assistant.view'
  ]
};
```

## PHASE 3: برنامه زمان‌بندی پیاده‌سازی

### مرحله 1: آماده‌سازی (1-2 روز)
- پشتیبان‌گیری کامل از پایگاه داده
- تنظیم محیط تست
- مستندسازی وابستگی‌ها

### مرحله 2: مهاجرت پایگاه داده (1 روز)
- اجرای اسکریپت‌های مهاجرت
- تست یکپارچگی داده‌ها
- راه‌اندازی جداول جدید

### مرحله 3: حذف اجزای CRM (1-2 روز)
- حذف مسیرها و اجزای رابط کاربری
- بروزرسانی سیستم ناوبری
- تست عملکرد پنل ادمین

### مرحله 4: ارتقای Telegram Bot (2-3 روز)
- پیاده‌سازی پارسر پیام‌های جدید
- تست دستورات مختلف
- یکپارچه‌سازی با هوش مصنوعی

### مرحله 5: رابط کاربری جدید (2-3 روز)
- ایجاد ماژول CRM Assistant
- پیاده‌سازی تنظیمات AI
- تست کامل جریان کار

### مرحله 6: تست و استقرار (1-2 روز)
- تست یکپارچه کامل سیستم
- بررسی امنیت
- استقرار نهایی

## معیارهای موفقیت

### ✅ معیارهای فنی
- پنل ادمین بدون خطا بارگذاری شود
- عملکرد اعلان فاکتور تلگرام حفظ شود
- بات تلگرام انواع پیام‌ها را پردازش کند
- رابط CRM Assistant داده‌های صحیح نمایش دهد

### ✅ معیارهای عملکردی  
- زمان پاسخ‌دهی کمتر از 2 ثانیه
- پردازش همزمان حداقل 50 پیام
- دقت پارسر پیام‌ها بالای 95%
- زمان فعالیت سیستم بالای 99.5%

### ✅ معیارهای امنیتی
- تمام API keyها رمزگذاری شوند
- کنترل دسترسی سطح‌بندی شده فعال باشد
- ورودی‌ها اعتبارسنجی شوند
- خطاها بدون افشای اطلاعات حساس مدیریت شوند
