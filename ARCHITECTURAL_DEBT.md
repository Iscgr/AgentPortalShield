# ARCHITECTURAL DEBT LEDGER

## Overview
این سند تمام مسائل معماری شناسایی شده و اقدامات انجام شده برای حل آن‌ها را مستند می‌کند.

---

## ISSUE-001: Payment Allocation State Management Bug

**تاریخ شناسایی:** 2025-01-27  
**شدت:** CRITICAL  
**وضعیت:** RESOLVED ✅

### شرح مشکل
سیستم تخصیص پرداخت‌ها دارای نقص اساسی در مدیریت وضعیت `isAllocated` بود که باعث می‌شد پرداخت‌های تخصیص یافته به عنوان تخصیص نیافته نمایش داده شوند.

### علت ریشه
1. **منطق نادرست تخصیص دستی:** ایجاد رکورد جدید به جای بروزرسانی رکورد اصلی
2. **عدم حفظ وضعیت allocation:** در تخصیص جزئی، پرداخت اصلی allocated نمی‌شد
3. **ناسازگاری بین auto و manual allocation:** دو الگوی مختلف برای یک منطق کسب‌وکار

### راه‌حل پیاده‌سازی شده
- **TITAN-O Protocol v1.0** اجرا شد
- منطق تخصیص دستی و خودکار یکسان‌سازی شد  
- تضمین اینکه همیشه پرداخت اصلی `isAllocated: true` می‌شود
- پیاده‌سازی الگوی atomic transaction برای یکپارچگی داده‌ها

### کد تغییر یافته
```
server/services/enhanced-payment-allocation-engine.ts
├── manualAllocatePayment method: خط 320-380
└── autoAllocatePayment method: خط 200-280
```

### اقدامات پیشگیرانه
1. **Anti-Pattern Linter Rule:** `linting_rules/titan_generated_rule.js`
2. **Automated Test:** `test/titan_proof_of_bug.test.ts`
3. **Code Review Checklist:** تمام تغییرات allocation باید شامل transaction باشد

### تأثیر معماری
- **مثبت:** یکپارچگی داده‌های مالی تضمین شد
- **مثبت:** کاهش technical debt در payment engine
- **مثبت:** قابلیت نگهداری کد افزایش یافت

### درس‌های آموخته شده
1. تست‌های integration برای business logic حیاتی الزامی است
2. الگوهای مختلف در یک domain باید یکسان‌سازی شوند
3. Transaction management برای عملیات پیچیده financial الزامی است

### پیوندهای مرتبط
- RFC Document: اسناد Domain 2 TITAN-O
- Test Evidence: `test/titan_proof_of_bug.test.ts`
- Linter Rule: `linting_rules/titan_generated_rule.js`

---