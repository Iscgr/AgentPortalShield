# Changelog

## [Unreleased]

### Removed / Refactored (Financial Integrity Hardcodes)
- حذف تمام اعداد هاردکد مربوط به مجموع بدهی سیستم (`186099690` و `183146990`) از:
	- `unified-financial-engine.verifyTotalDebtSum`
	- روت‌های: `/api/unified-financial/verify-total-debt` و `/api/unified-financial/calculate-immediate-debt-sum`
- جایگزینی مقایسه‌های ثابت با منطق پویا و استفاده اختیاری از متغیر محیطی `EXPECTED_DASHBOARD_DEBT`.
- افزودن threshold پویای بدهکاران از طریق ENV: `MIN_DEBT_THRESHOLD` (پیش‌فرض 1000) در `getDebtorRepresentatives`.
- جلوگیری از بروز خطاهای ورودی اعشاری در limit با نرمال‌سازی عددی.

### Added
- ENV اختیاری: `EXPECTED_DASHBOARD_DEBT` برای مانیتورینگ تحلیلی (در صورت عدم تعریف، مقایسه ثابت انجام نمی‌شود).
- ENV: `MIN_DEBT_THRESHOLD` برای کنترل حداقل بدهی ورود به لیست بدهکاران.

### Technical Notes / Breaking Change
- فیلدهای `expectedAmount` و مقایسه‌های accuracy اکنون می‌توانند `null` باشند اگر ENV مرجع تعریف نشده باشد (به‌روزرسانی مصرف‌کنندگان ضروری است).
- لاگ ها اکنون پیام: `No EXPECTED_DASHBOARD_DEBT env provided` یا مقدار dynamic را چاپ می‌کنند.


## v0.34.0 (Multi-Payment FIFO Allocation)
- NEW: مهاجرت به معماری Direct Multi-Payment Allocation (هر تخصیص = رکورد مستقل).
- ADDED: `invalidateFinancialCaches` برای ابطال متمرکز کش.
- UPDATED: بازگردانی کارت خلاصه مالی نماینده در دیالوگ جزئیات.
- FIXED: عدم نمایش فوری نماینده جدید (یکپارچه سازی کلید `/representatives`).
- FIXED: نقص تخصیص پرداخت (عدم ثبت invoiceId) در حالت خودکار.
- FIXED: UX دکمه ذخیره ویرایش فاکتور با پیام علت غیرفعال بودن.
- DOCS: به‌روزرسانی مستندات مالی و اضافه شدن بخش معماری جدید تخصیص.

## Deprecated (Pending Removal)
- مسیرهای قدیمی auto-allocation پس‌ازپرداخت (موتور تخصیص سرور) – در حال حاضر به عنوان fallback نگه داشته می‌شود.

## Next
- کاهش نویز لاگ های SHERLOCK در محیط production.
- تست E2E گسترده شامل سناریو overpayment و partial multi-invoice.
