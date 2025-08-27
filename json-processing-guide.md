
# 📋 راهنمای کامل سیستم پردازش JSON

## 🔍 **مراحل پردازش دقیق**

### مرحله 1: آپلود و اعتبارسنجی اولیه
```typescript
// بررسی فرمت فایل
const isValidJSON = file.type === 'application/json' || file.name.endsWith('.json');

// پارس کردن محتویات
const jsonData = JSON.parse(fileContent);

// اعتبارسنجی ساختار
if (!jsonData.data || !Array.isArray(jsonData.data)) {
  throw new Error('ساختار JSON نامعتبر');
}
```

### مرحله 2: تحلیل و گروه‌بندی داده‌ها
```typescript
// گروه‌بندی بر اساس admin_username
const groupedData = usageRecords.reduce((groups, record) => {
  const key = record.admin_username;
  if (!groups[key]) groups[key] = [];
  groups[key].push(record);
  return groups;
}, {});

// محاسبه مبلغ کل برای هر نماینده
const invoiceGroups = Object.entries(groupedData).map(([username, records]) => {
  const totalAmount = records.reduce((sum, record) => {
    return sum + parseFloat(record.amount || '0');
  }, 0);
  
  return {
    representativeCode: username,
    amount: Math.round(totalAmount), // گرد کردن به نزدیکترین عدد صحیح
    usageData: {
      records: records,
      totalRecords: records.length,
      usage_amount: totalAmount
    }
  };
});
```

### مرحله 3: تطبیق با نمایندگان موجود
```typescript
// بررسی وجود نماینده در دیتابیس
const representative = await db.select()
  .from(representatives)
  .where(
    or(
      eq(representatives.code, group.representativeCode),
      eq(representatives.panelUsername, group.representativeCode)
    )
  )
  .limit(1);

if (!representative.length) {
  invalidGroups.push({
    code: group.representativeCode,
    reason: 'نماینده یافت نشد'
  });
}
```

### مرحله 4: ایجاد فاکتور و محاسبه مالی
```typescript
// تولید شماره فاکتور یکتا
const invoiceNumber = await generateUniqueInvoiceNumber();

// ایجاد فاکتور
const newInvoice = await db.insert(invoices).values({
  invoiceNumber,
  representativeId: rep.id,
  amount: group.amount.toString(),
  issueDate: finalIssueDate,
  dueDate: calculateDueDate(finalIssueDate),
  status: 'unpaid',
  usageData: group.usageData,
  batchId: currentBatch?.id || null
});

// به‌روزرسانی بدهی نماینده
await updateRepresentativeDebt(rep.id, group.amount);
```

## 🛡️ **سیستم‌های امنیتی و کنترل کیفیت**

### 1. **اعتبارسنجی چندلایه**
- **Layer 1**: بررسی فرمت فایل
- **Layer 2**: اعتبارسنجی ساختار JSON  
- **Layer 3**: بررسی داده‌های فردی
- **Layer 4**: تطبیق با دیتابیس

### 2. **سیستم تراکنش ایمن**
```typescript
// شروع تراکنش دیتابیس
await db.transaction(async (tx) => {
  // ایجاد فاکتورها
  // به‌روزرسانی بدهی‌ها
  // ثبت لاگ‌ها
  // در صورت خطا: Rollback خودکار
});
```

### 3. **سیستم Financial Integrity**
```typescript
// بررسی یکپارچگی مالی بعد از هر پردازش
const integrityCheck = await validateFinancialIntegrity();
if (!integrityCheck.isValid) {
  // اقدامات اصلاحی خودکار
  await performCorrectiveActions();
}
```

## 📊 **الگوریتم‌های هوشمند**

### 1. **تشخیص فرمت خودکار**
```typescript
function detectJSONFormat(data: any): 'STANDARD' | 'PHPMYADMIN' | 'CUSTOM' {
  if (data.data && Array.isArray(data.data)) return 'STANDARD';
  if (Array.isArray(data) && data[0]?.admin_username) return 'PHPMYADMIN';
  return 'CUSTOM';
}
```

### 2. **محاسبه هوشمند مبلغ**
```typescript
function calculateInvoiceAmount(records: UsageRecord[]): number {
  let totalAmount = 0;
  
  for (const record of records) {
    const amount = parseFloat(record.amount || '0');
    if (!isNaN(amount) && amount > 0) {
      totalAmount += amount;
    }
  }
  
  // گرد کردن به نزدیکترین عدد صحیح برای جلوگیری از خطاهای اعشاری
  return Math.round(totalAmount);
}
```

### 3. **سیستم Batch Management**
```typescript
// مدیریت دسته‌ای فاکتورها برای پردازش بهینه
const batchCode = `BATCH-${persianDate}-${nanoid(6)}`;
const batch = await createInvoiceBatch({
  batchName: `دسته فاکتور ${persianDate}`,
  batchCode,
  periodStart: startDate,
  periodEnd: endDate,
  status: 'processing'
});
```

## 🔄 **فرآیند Real-time Processing**

1. **آپلود فایل** → **اعتبارسنجی فوری**
2. **پارس JSON** → **تحلیل ساختار**  
3. **گروه‌بندی** → **محاسبه مبالغ**
4. **تطبیق نمایندگان** → **اعتبارسنجی**
5. **ایجاد فاکتورها** → **به‌روزرسانی مالی**
6. **بررسی یکپارچگی** → **تأیید نهایی**

## 🚀 **بهینه‌سازی‌های عملکرد**

- **Chunked Processing**: پردازش دسته‌ای برای فایل‌های بزرگ
- **Parallel Validation**: اعتبارسنجی موازی
- **Memory Management**: مدیریت بهینه حافظه
- **Database Indexing**: ایندکس‌گذاری هوشمند

این سیستم با دقت بسیار بالا طراحی شده و قابلیت پردازش فایل‌های JSON پیچیده با حجم بالا را دارد.
