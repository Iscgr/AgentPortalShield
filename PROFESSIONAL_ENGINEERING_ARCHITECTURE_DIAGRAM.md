
```
# 🏗️ نقشه مهندسی کامل سیستم MarFaNet - Professional Engineering Architecture

## 📐 LAYER 1: CLIENT INTERACTION LAYER (لایه تعامل کاربری)

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT INTERACTION LAYER                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────┐  │
│  │ ADMIN SPA   │      │  CRM SPA    │      │ REPRESENTATIVE PORTALS  │  │
│  │(React/Redux)│      │(React/Redux)│      │(Progressive Web App)    │  │
│  │             │      │             │      │                         │  │
│  │ mgr/8679    │      │ crm/8679    │      │ /portal/:publicId       │  │
│  │ admin/8679  │      │             │      │                         │  │
│  │             │      │             │      │ No Authentication       │  │
│  │ Features:   │      │ Features:   │      │ Required                │  │
│  │ • Invoice   │      │ • Task Mgmt │      │                         │  │
│  │   Processing│      │ • AI Helper │      │ Features:               │  │
│  │ • Payment   │      │ • Rep View  │      │ • Invoice History       │  │
│  │   Allocation│      │ • Analytics │      │ • Payment History       │  │
│  │ • Rep Mgmt  │      │ • Reports   │      │ • Debt Status          │  │
│  │ • Reports   │      │ • Persian AI│      │ • Usage Details        │  │
│  │ • Settings  │      │ • Workspace │      │ • Real-time Updates    │  │
│  └─────────────┘      └─────────────┘      └─────────────────────────┘  │
│         │                     │                         │               │
│         │ HTTP/HTTPS          │ HTTP/HTTPS              │ HTTP/HTTPS    │
│         │ Session Auth        │ Session Auth            │ Public Access │
│         └──────────┬──────────┴──────────┬──────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                     │                     │
                     ▼                     ▼
```

## 📐 LAYER 2: API GATEWAY & BFF (Backend For Frontend)

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                 API GATEWAY & BFF (Backend For Frontend)               │
├─────────────────────────────────────────────────────────────────────────┤
│ Rate Limiting │ Routing │ Request Validation │ Session Management      │
├─────────────────────────────────────────────────────────────────────────┤
│  Express.js Server (Port 5000)                                        │
│                                                                         │
│  Authentication Routes:      Business Logic Routes:                    │
│  • POST /api/admin/login     • GET/POST /api/representatives           │
│  • POST /api/crm/login       • GET/POST /api/invoices                  │
│  • GET  /api/*/auth/user     • GET/POST /api/payments                  │
│  • POST /api/*/auth/logout   • GET/POST /api/sales-partners            │
│                              • GET      /api/portal/:publicId          │
│  Upload Routes:              • POST     /api/invoices/upload-json      │
│  • POST /api/invoices/       • GET      /api/dashboard                 │
│    upload-json               • GET      /api/crm/statistics            │
│  • POST /api/invoices/       • POST     /api/crm/tasks                 │
│    batch-process             • GET      /api/settings                  │
│                                                                         │
│  Middleware Stack:                                                     │
│  1. CORS Handler                                                       │
│  2. Security Headers                                                   │
│  3. Body Parser (JSON/Multipart)                                      │
│  4. Session Management                                                 │
│  5. Authentication Check                                               │
│  6. Rate Limiting                                                      │
│  7. Request Logging                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
```

## 📐 LAYER 3: BUSINESS LOGIC & SERVICE LAYER

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC & SERVICE LAYER                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │   FINANCIAL ENGINE      │  │        AI & INTELLIGENCE            │   │
│  │   (Unified Engine)      │  │            SERVICES                 │   │
│  │                         │  │                                     │   │
│  │ • Invoice Processing    │  │ ┌─────────────────────────────────┐ │   │
│  │   - JSON Parser         │  │ │      XAI GROK ENGINE            │ │   │
│  │   - Amount Calculation  │  │ │   (Pattern Recognition)         │ │   │
│  │   - Validation          │  │ │                                 │ │   │
│  │                         │  │ │ • Task Generation               │ │   │
│  │ • Payment Allocation    │  │ │ • Performance Analysis         │ │   │
│  │   - FIFO Algorithm      │  │ │ • Representative Insights      │ │   │
│  │   - Smart Distribution  │  │ │ • Risk Assessment              │ │   │
│  │   - Real-time Updates   │  │ │ • Predictive Analytics         │ │   │
│  │                         │  │ └─────────────────────────────────┘ │   │
│  │ • Debt Calculation      │  │                                     │   │
│  │   - Real-time Sync      │  │ ┌─────────────────────────────────┐ │   │
│  │   - Multi-currency      │  │ │     PERSIAN AI ENGINE           │ │   │
│  │   - Historical Track    │  │ │   (Cultural Intelligence)       │ │   │
│  │                         │  │ │                                 │ │   │
│  │ • Report Generation     │  │ │ • Persian NLP                   │ │   │
│  │   - Financial Analysis  │  │ │ • Cultural Context              │ │   │
│  │   - Performance Metrics │  │ │ • Persian Date System           │ │   │
│  │   - Export Functions    │  │ │ • Localized Insights           │ │   │
│  └─────────────────────────┘  │ └─────────────────────────────────┘ │   │
│                                │                                     │   │
│  ┌─────────────────────────┐  └─────────────────────────────────────┘   │
│  │    CRM INTELLIGENCE     │                                            │
│  │       SYSTEM            │  ┌─────────────────────────────────────┐   │
│  │                         │  │      INTEGRATION SERVICES           │   │
│  │ • Task Management       │  │                                     │   │
│  │   - AI Task Generation  │  │ • Telegram Bot API                  │   │
│  │   - Assignment Logic    │  │   - Invoice Notifications           │   │
│  │   - Progress Tracking   │  │   - Payment Confirmations           │   │
│  │                         │  │   - Custom Message Templates        │   │
│  │ • Workspace Hub         │  │                                     │   │
│  │   - Daily Scheduler     │  │ • Export Services                   │   │
│  │   - Report Forms        │  │   - Excel Generation               │   │
│  │   - Reminder System     │  │   - PDF Reports                    │   │
│  │                         │  │   - JSON Data Export               │   │
│  │ • Performance Analytics │  │                                     │   │
│  │   - Rep Scoring         │  │ • Email Notifications              │   │
│  │   - Gamification        │  │   - Invoice Reminders              │   │
│  │   - Learning Patterns   │  │   - Payment Alerts                 │   │
│  │                         │  │   - System Notifications           │   │
│  │ • Settings Hub          │  │                                     │   │
│  │   - User Management     │  │ • External API Integrations        │   │
│  │   - System Config       │  │   - Payment Gateways               │   │
│  │   - Knowledge Base      │  │   - Banking APIs                   │   │
│  └─────────────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
```

## 📐 LAYER 4: DATA ACCESS & STORAGE LAYER

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS & STORAGE LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │     STORAGE INTERFACE   │  │         ORM LAYER                   │   │
│  │      (Abstraction)      │  │      (Drizzle ORM)                  │   │
│  │                         │  │                                     │   │
│  │ • CRUD Operations       │  │ • Type-safe Queries                 │   │
│  │ • Transaction Mgmt      │  │ • Schema Validation                 │   │
│  │ • Connection Pooling    │  │ • Migration Management              │   │
│  │ • Query Optimization    │  │ • Relationship Mapping              │   │
│  │ • Cache Management      │  │ • Prepared Statements               │   │
│  │                         │  │                                     │   │
│  │ Methods:                │  │ Tables:                             │   │
│  │ • createRepresentative  │  │ • representatives                   │   │
│  │ • createInvoice         │  │ • invoices                          │   │
│  │ • createPayment         │  │ • payments                          │   │
│  │ • updateDebt            │  │ • admin_users                       │   │
│  │ • allocatePayment       │  │ • crm_users                         │   │
│  │ • generateReports       │  │ • sales_partners                    │   │
│  │ • syncRepresentative    │  │ • activity_logs                     │   │
│  └─────────────────────────┘  │ • workspace_tasks                   │   │
│                                │ • task_reports                      │   │
│                                │ • ai_learning_patterns              │   │
│                                └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
```

## 📐 LAYER 5: DATABASE & PERSISTENCE LAYER

```ascii
┌─────────────────────────────────────────────────────────────────────────┐
│                   DATABASE & PERSISTENCE LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        PostgreSQL Database                             │
│                        (Neon Serverless)                               │
│                                                                         │
│  Core Financial Tables:          CRM & Intelligence Tables:            │
│  ┌─────────────────────────┐     ┌─────────────────────────────────┐    │
│  │ representatives         │     │ crm_users                       │    │
│  │ ├─ id (PK)             │     │ ├─ id (PK)                      │    │
│  │ ├─ code (UNIQUE)       │     │ ├─ username                     │    │
│  │ ├─ name                │     │ ├─ password_hash                │    │
│  │ ├─ owner_name          │     │ ├─ role                         │    │
│  │ ├─ phone               │     │ ├─ permissions                  │    │
│  │ ├─ panel_username      │     │ └─ last_login                   │    │
│  │ ├─ public_id           │     └─────────────────────────────────┘    │
│  │ ├─ sales_partner_id    │                                            │
│  │ ├─ total_debt          │     ┌─────────────────────────────────┐    │
│  │ ├─ total_sales         │     │ workspace_tasks                 │    │
│  │ ├─ credit              │     │ ├─ id (PK)                      │    │
│  │ ├─ is_active           │     │ ├─ title                        │    │
│  │ └─ created_at          │     │ ├─ description                  │    │
│  └─────────────────────────┘     │ ├─ assigned_to (FK)            │    │
│                                  │ ├─ representative_id (FK)      │    │
│  ┌─────────────────────────┐     │ ├─ priority                    │    │
│  │ invoices                │     │ ├─ status                      │    │
│  │ ├─ id (PK)             │     │ ├─ due_date                     │    │
│  │ ├─ invoice_number       │     │ └─ created_at                   │    │
│  │ ├─ representative_id    │     └─────────────────────────────────┘    │
│  │ ├─ amount              │                                            │
│  │ ├─ status              │     ┌─────────────────────────────────┐    │
│  │ ├─ invoice_date        │     │ task_reports                    │    │
│  │ ├─ due_date            │     │ ├─ id (PK)                      │    │
│  │ ├─ usage_data (JSON)   │     │ ├─ task_id (FK)                 │    │
│  │ └─ created_at          │     │ ├─ report_content               │    │
│  └─────────────────────────┘     │ ├─ ai_analysis (JSON)          │    │
│                                  │ ├─ submitted_by (FK)           │    │
│  ┌─────────────────────────┐     │ └─ submitted_at                 │    │
│  │ payments                │     └─────────────────────────────────┘    │
│  │ ├─ id (PK)             │                                            │
│  │ ├─ representative_id    │     ┌─────────────────────────────────┐    │
│  │ ├─ amount              │     │ ai_learning_patterns            │    │
│  │ ├─ payment_date        │     │ ├─ id (PK)                      │    │
│  │ ├─ description         │     │ ├─ pattern_type                 │    │
│  │ ├─ is_allocated        │     │ ├─ data (JSON)                  │    │
│  │ └─ created_at          │     │ ├─ reliability_score            │    │
│  └─────────────────────────┘     │ └─ created_at                   │    │
│                                  └─────────────────────────────────┘    │
│  ┌─────────────────────────┐                                          │
│  │ sales_partners          │     ┌─────────────────────────────────┐    │
│  │ ├─ id (PK)             │     │ activity_logs                   │    │
│  │ ├─ name                │     │ ├─ id (PK)                      │    │
│  │ ├─ phone               │     │ ├─ user_type                    │    │
│  │ ├─ email               │     │ ├─ user_id                      │    │
│  │ ├─ commission_rate     │     │ ├─ action                       │    │
│  │ └─ is_active           │     │ ├─ details (JSON)               │    │
│  └─────────────────────────┘     │ └─ created_at                   │    │
│                                  └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 TECHNICAL SPECIFICATIONS & DETAILED EXPLANATIONS

### 1. فرمت و الگوی فایل JSON ریز جزئیات

**فرمت استاندارد PHPMyAdmin JSON Export:**

```json
[
  {
    "type": "header",
    "version": "5.2.0",
    "comment": "Export to JSON plugin for PHPMyAdmin"
  },
  {
    "type": "database",
    "name": "marfanet_usage"
  },
  {
    "type": "table",
    "name": "usage_records",
    "database": "marfanet_usage",
    "data": [
      {
        "admin_username": "shop_tehran_01",
        "amount": "125000",
        "event_timestamp": "2024-01-15 14:30:25",
        "event_type": "PURCHASE",
        "description": "خرید محصولات"
      },
      {
        "admin_username": "shop_tehran_01", 
        "amount": "75000",
        "event_timestamp": "2024-01-15 16:45:10",
        "event_type": "SERVICE",
        "description": "خدمات پشتیبانی"
      },
      {
        "admin_username": "shop_shiraz_05",
        "amount": "300000",
        "event_timestamp": "2024-01-15 09:15:00",
        "event_type": "BULK_ORDER",
        "description": "سفارش عمده"
      }
    ]
  }
]
```

**الگوی تشخیص خودکار در `standardized-invoice-engine.ts`:**

```typescript
export function parseStandardJsonData(jsonData: string): StandardUsageRecord[] {
  const data = JSON.parse(jsonData);
  
  // تشخیص PHPMyAdmin Export Format
  if (Array.isArray(data)) {
    const tableSection = data.find(item => 
      item && 
      typeof item === 'object' &&
      item.type === 'table' && 
      item.data && 
      Array.isArray(item.data)
    );
    
    if (tableSection) {
      return validateAndCleanRecords(tableSection.data);
    }
  }
  
  // تشخیص Direct Array Format
  return validateAndCleanRecords(data);
}
```

### 2. نحوه محاسبه مبلغ فاکتور برای هر نماینده

**الگوریتم محاسبه در `unified-financial-engine.ts`:**

```typescript
// مرحله 1: گروه‌بندی بر اساس admin_username
const representativeGroups = usageRecords.reduce((acc, record) => {
  const adminUsername = record.admin_username;
  
  if (!acc[adminUsername]) {
    acc[adminUsername] = {
      admin_username: adminUsername,
      records: [],
      totalAmount: 0
    };
  }
  
  acc[adminUsername].records.push(record);
  acc[adminUsername].totalAmount += parseFloat(record.amount);
  
  return acc;
}, {});

// مرحله 2: محاسبه مبلغ کل برای هر نماینده
Object.values(representativeGroups).map(group => {
  const calculatedAmount = Math.round(group.totalAmount); // گرد کردن به نزدیکترین عدد صحیح
  
  return {
    representativeCode: group.admin_username,
    amount: calculatedAmount, // مبلغ کل فاکتور
    usageData: {
      records: group.records,
      totalRecords: group.records.length,
      usage_amount: calculatedAmount
    }
  };
});
```

**مبنای محاسبه:**
- **جمع تمام مبالغ** (`amount`) رکوردهای هر `admin_username`
- **گرد کردن** به نزدیکترین عدد صحیح 
- **اعمال تخفیفات/کمیسیون** بر اساس sales_partner (در صورت وجود)

### 3. اجزای پروفایل نماینده

**ساختار کامل در `schema.ts`:**

```typescript
export const representatives = pgTable('representatives', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(), // کد یکتا
  name: varchar('name', { length: 255 }).notNull(), // نام فروشگاه/شرکت
  ownerName: varchar('owner_name', { length: 255 }), // نام مالک
  phone: varchar('phone', { length: 20 }), // شماره تماس
  panelUsername: varchar('panel_username', { length: 100 }), // نام کاربری پنل
  publicId: varchar('public_id', { length: 100 }).unique(), // شناسه پورتال عمومی
  salesPartnerId: integer('sales_partner_id').references(() => salesPartners.id), // همکار فروش
  
  // اطلاعات مالی (Real-time محاسبه شده)
  totalDebt: decimal('total_debt', { precision: 15, scale: 2 }).default('0'), // بدهی کل
  totalSales: decimal('total_sales', { precision: 15, scale: 2 }).default('0'), // فروش کل  
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0'), // اعتبار
  
  // وضعیت
  isActive: boolean('is_active').default(true), // فعال/غیرفعال
  
  // زمان‌بندی
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

**اجزای اضافی در محیط Runtime:**
- **آخرین فعالیت**: تاریخ آخرین فاکتور/پرداخت
- **امتیاز عملکرد**: محاسبه شده توسط AI Engine
- **تاریخچه پرداخت‌ها**: لیست پرداخت‌های اخیر
- **وضعیت ریسک**: ارزیابی هوشمند بدهی

### 4. ویرایش فاکتور ریز جزئیات

**سیستم ویرایش در `InvoiceEditDialog.tsx`:**

```typescript
// مرحله 1: بارگیری فاکتور و ریز جزئیات
const { data: invoice } = useQuery({
  queryKey: [`/api/invoices/${invoiceId}/details`],
  queryFn: getQueryFn()
});

// مرحله 2: نمایش ریز جزئیات قابل ویرایش
{invoice.usageData.records.map((record, index) => (
  <div key={index} className="usage-record-edit">
    <input 
      value={record.amount}
      onChange={(e) => updateRecord(index, 'amount', e.target.value)}
    />
    <input 
      value={record.description}
      onChange={(e) => updateRecord(index, 'description', e.target.value)}
    />
    <DatePicker
      value={record.event_timestamp}
      onChange={(date) => updateRecord(index, 'event_timestamp', date)}
    />
  </div>
))}

// مرحله 3: محاسبه مجدد مبلغ کل
const recalculateTotal = () => {
  const newTotal = updatedRecords.reduce((sum, record) => 
    sum + parseFloat(record.amount), 0
  );
  setTotalAmount(Math.round(newTotal));
};

// مرحله 4: ذخیره تغییرات
const saveChanges = async () => {
  await updateInvoice(invoiceId, {
    amount: totalAmount,
    usageData: {
      ...invoice.usageData,
      records: updatedRecords,
      usage_amount: totalAmount
    }
  });
};
```

**نمایش به حسابدار:**
- **قبل از تغییر**: مبلغ اصلی + جزئیات اولیه
- **تغییرات**: هایلایت شده با رنگ متفاوت
- **بعد از تغییر**: مبلغ جدید + جزئیات ویرایش شده
- **تایید**: نیاز به تایید مدیر برای اعمال

### 5. نمایش ریز جزئیات در پورتال عمومی نماینده

**نمایش در `portal.tsx`:**

```typescript
// کامپوننت نمایش فاکتور با جزئیات
function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [showUsageDetails, setShowUsageDetails] = useState(false);

  return (
    <div className="invoice-card">
      {/* اطلاعات کلی فاکتور */}
      <div className="invoice-header">
        <h4>{invoice.invoiceNumber}</h4>
        <span className="amount">{formatCurrency(invoice.amount)} تومان</span>
        <span className="date">تاریخ: {invoice.issueDate}</span>
      </div>

      {/* دکمه نمایش جزئیات */}
      <button onClick={() => setShowUsageDetails(!showUsageDetails)}>
        {showUsageDetails ? 'پنهان کردن' : 'نمایش'} ریز جزئیات مصرف
      </button>

      {/* پنل ریز جزئیات */}
      {showUsageDetails && invoice.usageData.records && (
        <div className="usage-details-panel">
          <h5>ریز جزئیات مصرف دوره</h5>
          
          {invoice.usageData.records.map((record, idx) => (
            <div key={idx} className="usage-record">
              <div className="record-info">
                <span className="event-type">{record.event_type}</span>
                <span className="timestamp">{record.event_timestamp}</span>
              </div>
              <div className="record-details">
                <span className="amount">{formatCurrency(record.amount)} تومان</span>
                <span className="description">{record.description}</span>
              </div>
            </div>
          ))}
          
          {/* خلاصه */}
          <div className="usage-summary">
            <span>تعداد تراکنش‌ها: {invoice.usageData.records.length}</span>
            <span>مجموع: {formatCurrency(invoice.amount)} تومان</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**فرمت نمایش برای هر دوره:**
- **تاریخ دوره**: شروع و پایان دوره فاکتور
- **تعداد تراکنش‌ها**: تعداد رکوردهای مصرف
- **تفکیک بر اساس نوع**: خرید، خدمات، سفارش عمده
- **جزئیات هر تراکنش**: تاریخ، مبلغ، توضیح

### 6. ارسال فاکتور به تلگرام

**تنظیمات در پنل ادمین (`settings.tsx`):**

```typescript
// تنظیمات اتصال تلگرام
const telegramSettings = {
  botToken: "YOUR_BOT_TOKEN", // توکن ربات
  enabled: true, // فعال/غیرفعال
  
  // الگوی متنی برای فاکتور
  invoiceTemplate: `
🧾 فاکتور جدید صادر شد

👤 نماینده: {{representativeName}}
📋 کد: {{representativeCode}}  
💰 مبلغ: {{invoiceAmount}} تومان
📅 تاریخ صدور: {{issueDate}}
⏰ سررسید: {{dueDate}}
🔍 جزئیات: {{recordsCount}} تراکنش

🌐 مشاهده کامل: {{portalLink}}

📞 تماس: {{representativePhone}}
✅ وضعیت: {{invoiceStatus}}
  `,
  
  // الگوی پرداخت
  paymentTemplate: `
💳 پرداخت جدید ثبت شد

👤 نماینده: {{representativeName}}
💰 مبلغ پرداخت: {{paymentAmount}} تومان  
📅 تاریخ پرداخت: {{paymentDate}}
💵 بدهی باقیمانده: {{remainingDebt}} تومان

🌐 پورتال: {{portalLink}}
  `
};

// پردازش و ارسال
const sendInvoiceNotification = async (invoice, representative) => {
  const message = telegramSettings.invoiceTemplate
    .replace('{{representativeName}}', representative.name)
    .replace('{{representativeCode}}', representative.code)
    .replace('{{invoiceAmount}}', formatCurrency(invoice.amount))
    .replace('{{issueDate}}', invoice.issueDate)
    .replace('{{dueDate}}', invoice.dueDate)
    .replace('{{recordsCount}}', invoice.usageData.records.length)
    .replace('{{portalLink}}', `${BASE_URL}/portal/${representative.publicId}`)
    .replace('{{representativePhone}}', representative.phone || 'ثبت نشده')
    .replace('{{invoiceStatus}}', getStatusText(invoice.status));
    
  await telegramService.sendMessage(representative.telegramChatId, message);
};
```

**متغیرهای قابل استفاده:**
- `{{representativeName}}`: نام نماینده
- `{{representativeCode}}`: کد نماینده  
- `{{invoiceAmount}}`: مبلغ فاکتور (فرمت شده)
- `{{issueDate}}`: تاریخ صدور
- `{{dueDate}}`: تاریخ سررسید
- `{{recordsCount}}`: تعداد تراکنش‌ها
- `{{portalLink}}`: لینک پورتال عمومی
- `{{representativePhone}}`: شماره تماس
- `{{totalDebt}}`: بدهی کل
- `{{creditBalance}}`: اعتبار

### 7. آپلود و پردازش فایل JSON

**فرآیند در `InvoiceUpload.tsx`:**

```typescript
// مرحله 1: آپلود فایل
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('jsonFile', file);
  formData.append('invoiceDate', selectedDate);
  
  const response = await axios.post('/api/invoices/upload-json', formData);
  return response.data;
};

// مرحله 2: پردازش در سرور
export const processJsonUpload = async (jsonData: string) => {
  // پارس کردن JSON
  const usageRecords = parseStandardJsonData(jsonData);
  
  // اعتبارسنجی
  const { valid, invalid } = validateStandardUsageData(usageRecords);
  
  if (invalid.length > 0) {
    throw new Error(`${invalid.length} رکورد نامعتبر یافت شد`);
  }
  
  // پردازش sequential
  const result = await processUsageDataSequential(valid, storage, customInvoiceDate);
  
  return {
    processedInvoices: result.processedInvoices,
    newRepresentatives: result.newRepresentatives,
    statistics: result.statistics
  };
};

// مرحله 3: مدیریت نمایندگان موجود و جدید
const processRepresentativeData = async (adminUsername: string) => {
  // جستجوی نماینده موجود
  let representative = await storage.getRepresentativeByPanelUsername(adminUsername) ||
                      await storage.getRepresentativeByCode(adminUsername);
  
  // ایجاد نماینده جدید در صورت عدم وجود
  if (!representative) {
    const defaultSalesPartnerId = await getOrCreateDefaultSalesPartner(db);
    
    const newRepData = {
      code: adminUsername,
      name: `فروشگاه ${adminUsername}`,
      ownerName: null,
      panelUsername: adminUsername,
      phone: null,
      publicId: generatePublicId(adminUsername), // تولید ID یکتا
      salesPartnerId: defaultSalesPartnerId,
      isActive: true
    };
    
    representative = await storage.createRepresentative(newRepData);
    console.log(`✅ نماینده جدید ایجاد شد: ${adminUsername}`);
  }
  
  return representative;
};
```

**اقدامات برای نمایندگان جدید:**
1. **ایجاد رکورد پایه** با اطلاعات minimal
2. **تولید Public ID** یکتا برای پورتال
3. **اختصاص Sales Partner پیش‌فرض**
4. **ایجاد فاکتور اول**
5. **ارسال پیام خوشامدگویی** (تلگرام)
6. **ثبت در Activity Log**

---

## 🎯 DETAILED CRM PANEL SPECIFICATIONS

### نقش‌ها و مسئولیت‌ها در پنل CRM

#### 1. **کارمند CRM** (`CRM_EMPLOYEE` Role)

**دریافت وظایف:**
```typescript
// سیستم Task Management
const dailyTasks = await crmService.getDailyTasks(employeeId);

// نمونه وظایف:
[
  {
    id: 1,
    title: "پیگیری پرداخت نماینده تهران ۱",
    description: "نماینده 45 روز پرداخت نکرده - تماس و پیگیری",
    priority: "HIGH",
    dueDate: "2024-01-20",
    representative: { name: "فروشگاه تهران ۱", phone: "021-1234567" },
    aiSuggestion: "بهترین زمان تماس: ۱۰-۱۲ صبح - احتمال پاسخگویی: ۸۵٪"
  },
  {
    id: 2,
    title: "بررسی عملکرد نمایندگان شیراز",
    description: "تحلیل کاهش ۲۰٪ فروش در ماه گذشته",
    priority: "MEDIUM", 
    dueDate: "2024-01-22",
    aiSuggestion: "ارتباط با مسائل اقتصادی منطقه - پیشنهاد تخفیف موقت"
  }
]
```

**انجام و گزارش وظیفه:**
```typescript
// فرم گزارش در WorkspaceHub
const submitTaskReport = async (taskId: number, reportData: {
  status: "COMPLETED" | "IN_PROGRESS" | "BLOCKED",
  timeSpent: number, // دقیقه
  description: string,
  result: string,
  followUpRequired: boolean,
  nextActionDate?: string,
  attachments?: File[]
}) => {
  // ارسال گزارش
  const report = await api.post(`/api/crm/tasks/${taskId}/report`, reportData);
  
  // تحلیل هوشمند توسط AI
  const aiAnalysis = await persianAI.analyzeTaskPerformance({
    taskType: task.type,
    timeSpent: reportData.timeSpent,
    result: reportData.result,
    employeeHistory: employee.performanceHistory
  });
  
  return { report, aiAnalysis };
};
```

#### 2. **مدیر واحد CRM** (`CRM_MANAGER` Role)

**وظایف اصلی:**
- **نظارت بر عملکرد کارمندان**
- **تصویب گزارش‌های مهم** 
- **تخصیص وظایف پیچیده**
- **تحلیل KPIs تیم**
- **برنامه‌ریزی استراتژیک**

```typescript
// داشبورد مدیریتی
const managerDashboard = {
  teamPerformance: {
    completedTasks: 127,
    averageCompletionTime: "2.3 ساعت",
    qualityScore: 4.2, // از 5
    employeeRanking: [
      { name: "احمد رضایی", score: 94, tasksCompleted: 23 },
      { name: "فاطمه محمدی", score: 89, tasksCompleted: 21 }
    ]
  },
  
  criticalAlerts: [
    { type: "HIGH_DEBT", count: 15, message: "۱۵ نماینده بدهی بالای ۵۰۰ هزار" },
    { type: "NO_CONTACT", count: 8, message: "۸ نماینده ۳۰ روز بدون تماس" }
  ],
  
  aiRecommendations: [
    "افزایش ۲۰٪ فروش با تمرکز بر نمایندگان منطقه ۲",
    "نیاز به استخدام یک کارمند اضافی در بخش پیگیری",
    "بهینه‌سازی زمان‌بندی تماس‌ها بر اساس الگوهای یادگیری"
  ]
};
```

#### 3. **دستیار هوش مصنوعی** (Persian AI Engine)

**وظایف اصلی:**
```typescript
// Persian Cultural AI Engine
class PersianAIAssistant {
  // تولید وظایف هوشمند
  async generateDailyTasks(employeeProfile: Employee, representativeData: Representative[]) {
    const culturalContext = await this.analyzePersianBusinessContext();
    const historicalPatterns = await this.getSuccessfulTaskPatterns();
    
    return [
      {
        title: `پیگیری مودبانه از ${representative.name}`,
        culturalNote: "استفاده از عبارات محترمانه فارسی",
        suggestedScript: "سلام و احترام، امیدوارم اوضاع کسب‌وکارتان خوب باشد...",
        bestTimeToCall: "۱۰:۳۰ تا ۱۲:۰۰ (بر اساس الگوهای پاسخگویی)",
        successProbability: 0.85
      }
    ];
  }
  
  // تحلیل فرهنگی ارتباطات
  async analyzeCommunicationStyle(representativeProfile: any) {
    return {
      preferredLanguage: "فارسی محاوره‌ای",
      communicationTone: "رسمی اما صمیمی", 
      bestContactTime: "صبح‌ها",
      culturalSensitivities: ["اهمیت احترام متقابل", "صبر در مذاکره"],
      suggestedApproach: "تأکید بر رابطه طولانی‌مدت و اعتماد متقابل"
    };
  }
  
  // یادگیری از الگوهای موفق
  async learnFromSuccessfulInteractions(taskReports: TaskReport[]) {
    const patterns = await this.identifySuccessPatterns(taskReports);
    
    await this.updateLearningDatabase({
      successfulPhrases: ["با عرض سلام و احترام", "در خدمت شما هستیم"],
      effectiveTimings: ["10:00-12:00", "14:00-16:00"],
      culturalFactors: ["تعطیلات مذهبی", "ساعات نماز"],
      personalityAdaptation: {
        formal: "استفاده از القاب محترمانه",
        friendly: "صمیمیت در حد اعتدال",
        businessOriented: "تمرکز بر منافع متقابل"
      }
    });
  }
}
```

**ارتباط AI با مدیر CRM:**
```typescript
// گزارش‌های هوشمند برای مدیر
const aiManagerReports = {
  weeklyInsights: {
    teamEfficiencyTrends: "بهبود ۱۲٪ در هفته گذشته",
    problematicRepresentatives: [
      {
        name: "فروشگاه اصفهان ۳",
        issue: "کاهش ارتباط",
        aiSuggestion: "تغییر نوع ارتباط به پیامک",
        probability: "۷۳٪ احتمال پاسخ مثبت"
      }
    ],
    strategicRecommendations: [
      "اولویت‌بندی پیگیری بر اساس potential revenue",
      "تمرکز بر نمایندگان با الگوی پرداخت منظم"
    ]
  },
  
  employeeCoaching: {
    "احمد رضایی": {
      strengths: ["مهارت مذاکره عالی", "دقت بالا"],
      improvements: ["سرعت پاسخگویی", "فناوری‌های جدید"],
      suggestedTraining: "دوره مدیریت زمان"
    }
  }
};

// تصمیم‌گیری مشترک AI + Manager
const hybridDecisionMaking = async (situation: any) => {
  const aiRecommendation = await persianAI.analyzeAndRecommend(situation);
  const managerInput = await getManagerFeedback(aiRecommendation);
  
  return combineHumanAiDecision(aiRecommendation, managerInput);
};
```

---

## 🔧 ADDITIONAL TECHNICAL SPECIFICATIONS

### Real-time Data Synchronization
- **WebSocket** connections for live updates
- **Event-driven** architecture for instant notifications  
- **Optimistic UI** updates with fallback mechanisms

### Security Architecture
- **Role-based** access control (RBAC)
- **JWT** token authentication with refresh mechanism
- **Input sanitization** and validation at all layers
- **Rate limiting** and DDoS protection

### Performance Optimizations
- **Database indexing** on frequently queried columns
- **Connection pooling** for optimal resource usage
- **Caching strategy** with Redis-like mechanisms
- **Lazy loading** for large datasets

### Mobile Responsiveness
- **Progressive Web App** (PWA) capabilities
- **Touch-optimized** interfaces
- **Offline functionality** for critical operations
- **Responsive design** for all screen sizes

این معماری کامل و حرفه‌ای با الگوی مهندسی ارائه شده، تمام جنبه‌های فنی و عملیاتی سیستم MarFaNet را پوشش می‌دهد.
