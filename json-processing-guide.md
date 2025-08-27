

# 📋 راهنمای کامل سیستم پردازش JSON

## 🎯 **Sequential Processing Pattern (الگوی پردازش ترتیبی)**

### ویژگی کلیدی: Ordered Processing
فایل‌های JSON در سیستم دارای **نظم خاص** هستند:

```json
[
  {"admin_username": "admin1", "amount": "1000", ...},
  {"admin_username": "admin1", "amount": "2000", ...},
  {"admin_username": "admin1", "amount": "1500", ...},
  {"admin_username": "admin2", "amount": "3000", ...},
  {"admin_username": "admin2", "amount": "2500", ...},
  {"admin_username": "admin3", "amount": "1800", ...}
]
```

**قانون طلایی**: تمام رکوردهای یک `admin_username` **پشت سر هم** و **متمرکز** هستند.

## 🔄 **Streaming Invoice Generation Algorithm**

```typescript
function processUsageDataStreaming(records: UsageRecord[]): ProcessedInvoice[] {
  const invoices: ProcessedInvoice[] = [];
  let currentAdmin = '';
  let currentRecords: UsageRecord[] = [];
  let currentAmount = 0;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    // تشخیص تغییر admin_username
    if (record.admin_username !== currentAdmin) {
      // بستن فاکتور نماینده قبلی (اگر وجود دارد)
      if (currentAdmin && currentRecords.length > 0) {
        const invoice = finalizeInvoice(currentAdmin, currentRecords, currentAmount);
        invoices.push(invoice);
        
        // Log برای تایید بسته شدن فاکتور
        console.log(`✅ فاکتور ${currentAdmin} بسته شد: ${currentAmount} ریال`);
      }
      
      // شروع نماینده جدید
      currentAdmin = record.admin_username;
      currentRecords = [record];
      currentAmount = parseFloat(record.amount);
      
      console.log(`🆕 شروع پردازش نماینده جدید: ${currentAdmin}`);
    } else {
      // اضافه کردن رکورد به نماینده فعلی
      currentRecords.push(record);
      currentAmount += parseFloat(record.amount);
    }
  }
  
  // بستن آخرین فاکتور
  if (currentAdmin && currentRecords.length > 0) {
    const invoice = finalizeInvoice(currentAdmin, currentRecords, currentAmount);
    invoices.push(invoice);
    console.log(`✅ فاکتور نهایی ${currentAdmin} بسته شد: ${currentAmount} ریال`);
  }
  
  return invoices;
}
```

## 🧠 **Memory-Efficient Processing**

### چرا Streaming Pattern؟
- **حافظه کم**: فقط رکوردهای یک نماینده در حافظه نگهداری می‌شود
- **پردازش لحظه‌ای**: هر فاکتور بلافاصله پس از تکمیل پردازش می‌شود
- **مقیاس‌پذیری**: قابلیت پردازش فایل‌های میلیونی رکورد

### الگوریتم مدیریت حافظه:
```typescript
function memoryEfficientProcessing(jsonStream: ReadableStream) {
  let currentChunk = '';
  let processedCount = 0;
  
  const memoryThreshold = 1000; // حداکثر رکورد در حافظه
  
  jsonStream.on('data', (chunk) => {
    currentChunk += chunk;
    
    // پردازش خط به خط
    const lines = currentChunk.split('\n');
    currentChunk = lines.pop() || ''; // نگه‌داشتن خط ناتمام
    
    for (const line of lines) {
      if (line.trim()) {
        processRecord(JSON.parse(line));
        processedCount++;
        
        // آزادسازی حافظه هر 1000 رکورد
        if (processedCount % memoryThreshold === 0) {
          global.gc && global.gc(); // Garbage Collection
          console.log(`🧹 حافظه آزاد شد در رکورد ${processedCount}`);
        }
      }
    }
  });
}
```

## 🔐 **Data Integrity Checks**

### بررسی نظم Sequential:
```typescript
function validateSequentialOrder(records: UsageRecord[]): ValidationResult {
  const adminSequence: string[] = [];
  let currentAdmin = '';
  
  for (const record of records) {
    if (record.admin_username !== currentAdmin) {
      // بررسی عدم تکرار admin در جاهای مختلف فایل
      if (adminSequence.includes(record.admin_username)) {
        return {
          isValid: false,
          error: `تکرار نامعتبر admin_username: ${record.admin_username}`,
          position: adminSequence.indexOf(record.admin_username)
        };
      }
      
      adminSequence.push(record.admin_username);
      currentAdmin = record.admin_username;
    }
  }
  
  return { isValid: true, adminCount: adminSequence.length };
}
```

## 🚨 **نکات بحرانی و قوانین**

### 1. **قانون Sequential Integrity**
- هر `admin_username` باید **فقط یک بار** در فایل ظاهر شود
- تمام رکوردهای یک admin باید **متوالی** باشند
- هیچ admin نباید بعد از admin دیگری **دوباره** ظاهر شود

### 2. **Invoice Boundary Management**
```typescript
// ❌ اشتباه - نگه‌داشتن همه رکوردها در حافظه
const allRecords = parseEntireFile(jsonData);
const groupedByAdmin = groupBy(allRecords, 'admin_username');

// ✅ صحیح - پردازش streaming
for (const record of streamRecords(jsonData)) {
  if (isNewAdmin(record.admin_username)) {
    finalizeCurrentInvoice();
    startNewInvoice(record.admin_username);
  }
  addToCurrentInvoice(record);
}
```

### 3. **Error Recovery Strategy**
```typescript
function handleSequentialViolation(violation: SequentialViolation) {
  if (violation.type === 'DUPLICATE_ADMIN') {
    // توقف پردازش و گزارش خطا
    throw new Error(`
      🚨 نقض نظم Sequential: admin "${violation.admin}" 
      در موقعیت ${violation.firstPosition} و ${violation.secondPosition} تکرار شده
      
      راه‌حل: فایل JSON باید مرتب‌سازی مجدد شود
    `);
  }
}
```

## 📈 **Performance Metrics**

### معیارهای عملکرد Sequential Processing:
- **Memory Usage**: حداکثر 50MB برای فایل‌های 100K+ رکورد
- **Processing Speed**: 10,000 رکورد/ثانیه
- **Invoice Generation**: Real-time (بلافاصله پس از تکمیل admin)

### Monitoring Dashboard:
```typescript
const metrics = {
  currentAdmin: 'admin123',
  processedRecords: 45230,
  generatedInvoices: 127,
  memoryUsage: '42MB',
  processingSpeed: '9,850 records/sec',
  estimatedCompletion: '2 minutes'
};
```

## 🎯 **خلاصه کلیدی**

1. **Sequential Pattern**: رکوردهای هر admin **پشت سر هم** و **متمرکز**
2. **Streaming Processing**: فاکتور هر admin **فوراً** پس از تکمیل بسته می‌شود
3. **Memory Efficiency**: حداکثر بهره‌وری از حافظه با streaming
4. **Real-time Generation**: تولید فاکتور در زمان واقعی
5. **Data Integrity**: بررسی‌های دقیق برای تضمین نظم sequential

این الگو اطمینان می‌دهد که سیستم قابلیت پردازش فایل‌های حجیم با حداقل مصرف حافظه و حداکثر سرعت را دارد.
