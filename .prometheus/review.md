## گزارش فاز ۱ – بازنویسی تکمیلی (تحلیل صرف بدون کد)  
به‌روزرسانی شده با محورهای جدید: (1) تفکیک سه‌گانه Backend / Frontend / UI-UX، (2) ارزیابی ریسپانسیو، (3) مدل مقیاس‌پذیری سه‌ساله با ورودی 300–500 فاکتور هفتگی، (4) ارزیابی مکانیسم پشتیبان‌گیری و بازیابی، (5) ساده‌سازی امنیت طبق دستور (فقط جلوگیری دسترسی نمایندگان به پنل مدیریت).  

---
### فهرست اجزای اصلی
1. محور Backend (زیرساخت داده، موتور مالی، تراکنش، تخصیص، سلامت مالی، مقیاس‌پذیری، پشتیبان‌گیری)
2. محور Frontend (ساختار کد، کامپوننت‌ها، کوئری‌ها، مدیریت وضعیت، مسائل عملکردی)
3. محور UI / UX (ارزیابی اتمیک صفحه‌به‌صفحه، ریسپانسیو، دسترس‌پذیری، الگوهای تعامل، خلأهای تجربه)
4. مدل ظرفیت سه‌ساله (حجم، رشد، ایندکس، سربار محاسبات مالی، هزینه کوئری)
5. استراتژی Backup & Restore پیشنهادی
6. نقشه ارتقاء مرحله‌ای (Summarized Action Roadmap)
7. جمع‌بندی نهایی

---
## 1. Backend (به‌روزرسانی و تعمیق)
ساختار بخش عمده مطابق گزارش قبلی است؛ در این نسخه ابعاد «مقیاس‌پذیری آینده» و «پشتیبان‌گیری» افزوده شده.

### 1.1 شِما و مدل داده
| مورد | وضعیت فعلی | پیامد | پیشنهاد اجباری |
|------|-------------|--------|----------------|
| payments.amount TEXT | CAST مکرر و ناکارایی | CPU اضافی + خطای فرمت | Migration به DECIMAL(15,2) + CHECK > 0 |
| نبود allocation_lines | مدل باینری تخصیص | عدم partial و audit | ایجاد جدول payment_allocations + audit |
| cache بدهی نماینده (totalDebt) | محاسبه Real-time + ذخیره موازی | Divergence محتمل | تبدیل به cache مشتق + job بازسازی |
| ایندکس‌ها | شواهدی از تعریف صریح دیده نشد | اسکن کامل روی رشد داده | ایجاد ایندکس مرکب (invoices: rep,status,issue_date) + (payments: rep,payment_date) |
| وضعیت فاکتور | استنتاجی از amount - allocations | محاسبه مکرر | invoice_balance_cache با version |
| حذف soft vs hard | مشخص نیست | ریسک از دست رفتن تاریخچه | اضافه کردن ستون deleted_at برای اقلام حساس |

### 1.2 موتور مالی
نقطه ضعف اصلی: نبود granular allocation → هرگونه تحلیل aging / coverage / DSO غیرممکن. بدون ledger نمی‌توان debt integrity را معتبر کرد.

### 1.3 تراکنش و همزمانی
فقدان BEGIN...COMMIT در مسیرهای allocate / edit → race & phantom risk. با رشد به صورت تصاعدی (N فاکتور در صف تخصیص همزمان) احتمال دوباره‌کاری یا تخصیص اشتباه افزایش می‌یابد. الگوی پیشنهادی: Unit of Work + SERIALIZABLE برای allocate و REPEATABLE READ برای edit.

### 1.4 اینورینت‌های مالی (Reassert)
مجدداً لازم؛ enforce از طریق TRIGGER یا job تناوبی reconciler. بدون allocation_lines enforce ممکن نیست.

### 1.5 سلامت و مانیتورینگ
Missing KPIs: debt_drift_ppm، allocation_latency_ms، reconciliation_outcome_count. پیشنهاد: جدول reconciliation_runs.

### 1.6 تلگرام و اطمینان تحویل
بدون outbox؛ در سناریوی افزایش ارسال (ده‌ها در هر batch) افت تحمل خطا. الگوی outbox (status=pending|sent|failed,retry_count,next_retry_at) + worker.

### 1.7 امنیت (حداقلی طبق دستور)
کاهش دامنه: فقط منع دسترسی نماینده به مسیر مدیریت. راهکار تحلیل:
1. Prefix ثابت پنل: /admin/*  
2. Middleware ساده تشخیص نقش (session.role === 'admin')  
3. رد همه درخواست‌های ناشناس به /admin  
4. لاگ ورود admin (username, ip_hash, ts)  
5. عدم اجرای JWT / RBAC پیچیده در این فاز.

### 1.8 مقیاس‌پذیری سه‌ساله (Financial & Data Growth)
فرض پایه: 300–500 فاکتور هفتگی (میانگین 400). 
محاسبه تقریبی:
| سال | فاکتور جدید / سال | تجمعی (بدون حذف) |
|-----|--------------------|------------------|
| 1   | ~20,800            | 20,800 |
| 2   | ~20,800            | 41,600 |
| 3   | ~20,800            | 62,400 |
پرداخت‌ها: اگر نسبت پرداخت:فاکتور = 0.9 و هر پرداخت ممکن چند فاکتور را پوشش دهد → ~18,700 پرداخت / سال.
Allocation Lines پس از پیاده‌سازی: میانگین 1.3 خط به ازای هر فاکتور (partial + ترکیب پرداخت‌ها) → ~27k خطوط / سال → ~81k در سه سال.

اثر روی Query Plan (بدون ایندکس): full scan های تکراری روی invoices/payment_allocations در گزارش‌های پرتکرار (dashboard, portal) → رشد خطی محسوس. با ایندکس مناسب و cache balance هزینه پاسخ < 50ms حفظ‌شدنی است.

Storage Footprint (تقریبی):
| جدول | رکورد سه سال | اندازه ردیف تخمینی | حجم تقریبی |
|------|---------------|--------------------|-------------|
| invoices | 62k | ~500B | ~30MB |
| payments | 56k | ~400B | ~22MB |
| payment_allocations | 81k | ~450B | ~36MB |
| activity_logs | (فرض 5 event / invoice+payment) ~ (62k+56k)*5=590k | ~350B | ~207MB |
| telegram_history | (10% resend) ~68k | 300B | ~20MB |
جمع تقریبی < 350MB (بدون toast blobs) → PostgreSQL به راحتی مدیریت می‌کند. Neck: نبود ایندکس و vacuum strategy.

### 1.9 ریسک مقیاس بدون اصلاح
1. Debt recomputation پرهزینه (O(n) invoices) در هر ویرایش.  
2. عدم ledger → مقایسه historical impossible.  
3. صف ارسال تلگرام sequential → افزایش زمان batch.  
4. رشد activity_logs بدون partition یا TTL → کندی join ها.  

### 1.10 استراتژی بهینه‌سازی تدریجی
Phase A: Migration مبلغ + ایندکس‌ها + ledger dual-write.
Phase B: Reconciliation service + cache invoice_balance_cache.
Phase C: Event stream و outbox تلگرام.

### 1.11 Backup & Restore (وضع موجود vs مطلوب)
مشاهده: اسکریپت یا سند backup در ریپو وجود ندارد (جستجوی backup, dump، snapshot نشد). 
ریسک: از دست رفتن داده مالی تخصیص / پرداخت غیرقابل بازسازی بعد از partial corruption.

پیشنهاد حداقلی Production-Grade:
| لایه | مکانیزم | تناوب | نگهداری | توضیح |
|------|---------|-------|---------|-------|
| Full Base Backup | pg_basebackup یا nightly pg_dump | روزانه (00:30) | 30 روز | ذخیره در Object Storage رمزگذاری‌شده |
| WAL Archiving | archive_command → S3/minio | Real-time | 7 روز چرخشی | فعال‌سازی PITR |
| Logical Export (Reports) | pg_dump --schema=public --table=... | هفتگی | 8 هفته | برای تست بازسازی جزئی |
| Integrity Snapshot | SELECT checksums + counts | 6 ساعته | 14 روز | مقایسه Drift |
| Restore Drill | تمام مراحل بازیابی روی محیط staging | ماهانه | 3 آخرین گزارش | زمان هدف < 30 دقیقه |

Runbook خلاصه بازیابی (Scenario: Crash ظهر):
1. بازیابی آخرین Full Backup شب گذشته.  
2. اعمال WAL ها تا لحظه قبل حادثه.  
3. اجرای اسکریپت integrity-check (مقایسه مجموع invoice.amount و Σallocation).  
4. گزارش انحراف احتمالی و اصلاح دستی اگر نیاز.  

Failure Modes پوشش داده‌شده: حذف تصادفی رکورد، corruption page، خطای نرم‌افزاری تخصیص بعد از commit.

---
## 2. Frontend (کد و معماری ارائه)
### 2.1 ساختار عمومی
React + TanStack Query؛ صفحات متعدد (`invoices.tsx` بسیار غنی، سایر صفحات placeholder). ناهمگونی شدت توسعه.

### 2.2 الگوهای مشاهده‌شده
| ناحیه | مشاهده | پیامد |
|-------|--------|-------|
| invoices.tsx | صفحه پیچیده با pagination، فیلتر، ارسال تلگرام، دیالوگ | تمرکز منطق زیاد در یک فایل (Maintainability) |
| portal.tsx (عمومی) | استفاده گسترده inline style و گرادیان | سختی تم‌سازی و media queries |
| صفحات dashboard/others | Placeholder ساده | نبود تجربه مدیریتی واقعی |
| فرم‌ها | react-hook-form + zod در InvoiceManualForm | الگوی صحیح اعتبارسنجی موضعی |
| Query Invalidation | invalidate گسترده بعد از عملیات | هزینه شبکه بالاتر – مناسب ولی می‌توان selective کرد |

### 2.3 کیفیت کد
مشکل اصلی Sprawl در `invoices.tsx` (بیش از 800 خط). نیاز به استخراج: FiltersBar, StatsCards, InvoicesTable, PaginationControls, SendDialog.

### 2.4 Performance Risk
1. رندر مجدد گسترده هنگام تغییر هر فیلتر.  
2. عدم Virtualization جدول (در آینده >300 ردیف).  
3. Inline portal styles مانع استفاده از Tailwind purge & reuse.  

### 2.5 Observability Frontend
لاگ‌های کنسول (PREFIX: SHERLOCK) در محیط Production پاک نشده → نشت الگوی داده.

---
## 3. UI / UX (تحلیل اتمیک صفحه‌به‌صفحه و ریسپانسیو)
### 3.1 روش ارزیابی
معیارها: (Hierarchy, Density, Feedback, Error States, Loading, Empty, Consistency, Mobile Adaptation, Accessibility Heuristics). امتیاز کیفی (Low / Medium / High maturity).

### 3.2 پنل مدیریت – صفحات
| صفحه | وضعیت فعلی UI | شکاف‌های کلیدی | بلوغ |
|------|---------------|----------------|-------|
| Dashboard | Placeholder (فقط h1) | بدون KPI، نمودار، کارت وضعیت | Low |
| Invoices | غنی؛ کارت آمار، فیلتر، جدول، دیالوگ ارسال | کمبود: تفکیک کامپوننت، ستون‌های واکنش‌گرا، حالت چاپ/Export | Medium+ |
| Allocation Management | Placeholder | عدم نمایش جریان تخصیص، نیاز نمودار Coverage | Low |
| Representatives | Placeholder | نبود جستجو، پروفایل مالی، segmentation | Low |
| Financial Integrity | Placeholder | نبود شاخص drift, reconciliation status | Low |
| Settings | Placeholder | فقدان فرم تنظیمات عملیاتی (thresholds, telegram template) | Low |
| Sales Partners | Placeholder | بدون لیست یا grid | Low |
| Unified Auth | Placeholder | فقط متن – بدون فرم لاگین/role | Low |
| Admin Login | Placeholder | بدون فیلد ورود، بدون خطای اعتبار | Low |

### 3.3 پرتال عمومی (portal.tsx) – ارزیابی UI/UX
| حوزه | وضعیت | مشکل | پیشنهاد |
|------|-------|-------|---------|
| ساختار | Inline Style، گرادیان سنگین | دشواری تم، عدم استفاده از سیستم طراحی | استخراج به کامپوننت + کلاس Tailwind |
| سلسله‌مراتب | تیتر بزرگ، کارت‌های مالی مناسب | ازدحام رنگ، کنتراست متغیر | پالت محدود (Primary/Accent/Status) |
| کارت فاکتور | اطلاعات کامل ولی طولانی | اسکرول عمودی زیاد در موبایل | Accordion فشرده + grouping by status |
| دسترس‌پذیری | عدم aria-label / role | Screen Reader ضعف | افزودن نقش‌ها و focus order |
| واکنش‌گرایی | Grid با auto-fit نسبتا خوب | فاصله داخلی روی موبایل زیاد | Breakpoint سفارشی برای stack کارت‌ها |

### 3.4 حالت‌های (States) بررسی‌شده
| حالت | پنل مدیریت | پورتال عمومی | ارزیابی |
|------|------------|---------------|----------|
| Loading | Skeleton در invoices موجود | متن ساده "در حال بارگذاری" | یکنواخت‌سازی Skeleton |
| Empty | پیام ساده در جدول فاکتورها | پیام ساده در لیست فاکتور | افزودن CTA (ایجاد فاکتور) |
| Error | Toast / variant destructive | صفحات error چندحالته در portal | همسان‌سازی طرح رنگ و آیکن |
| Success | Toast ایجاد فاکتور/ارسال | بدون اعلان خاص | Badge یا Toast سبک |

### 3.5 تحلیل ریسپانسیو پنل Admin
ریسک‌ها:  
1. جدول فاکتور در < 640px افقی می‌شود (عدم wrap ستون‌ها).  
2. دکمه‌های عملیات فشرده نمی‌شوند (Send / Select All).  
3. Stats Grid (6 کارت) در موبایل عمودی طولانی.  
حداقل راهکار: Collapse ستون‌های کم‌اهمیت (telegram, dueDate) به آیکن + Drawer جزئیات؛ استفاده از css hidden md:table-cell.

### 3.6 تحلیل ریسپانسیو Portal
Inline Grid با minmax(300px) → در موبایل تک‌ستونی مناسب، اما padding 20–30px زیاد؛ کارت‌های invoice ارتفاع متغیر (jump). پیشنهاد: height داخلی ثابت Header + بخش expandable.

### 3.7 شکاف‌های دسترس‌پذیری
1. نبود focus outline سفارشی.  
2. نداشتن aria-label برای دکمه‌های آیکنی (Eye, Download).  
3. کنتراست برخی متن‌های خاکستری روی پس‌زمینه آبی/ارغوانی.  

### 3.8 فرصت‌های بهبود تجربه تخصیص
Modal «تخصیص پرداخت» با لیست فاکتورهای باز + ستون مبلغ باقیمانده + وارد کردن مقدار تخصیص (client-side validation) → ارسال یک payload شامل [{invoiceId, amount}].

### 3.9 جمع‌بندی UI/UX
Front Office (Portal) از نظر عملکرد پایه قابل قبول ولی طراحی خام؛ Back Office (Panel) فقط صفحه Invoices بالغ است. Debt Visibility، Allocation Trace، Integrity KPIs در UI غایب.

---
## 4. مدل ظرفیت سه‌ساله (تحلیل عددی تکمیلی)
Already در 1.8 توضیح شد؛ در این بخش تأکید بر Bottleneck ها:
| Bottleneck | ریشه | زمان بروز (تقریبی) | پیشگیری |
|------------|------|--------------------|---------|
| Debt Recalc Full Scan | نبود balance_cache | >10k invoices | ایجاد cache + incremental update |
| Allocation Accuracy | نبود ledger | فوری | پیاده‌سازی payment_allocations |
| Query Latency Portal | جدول بدون ایندکس ترکیبی | >30k invoices | ایندکس (rep_id,status,issue_date) |
| Activity Log Bloat | نبود TTL/Partition | >400k rows | Partition by month + purge policy |
| Telegram Throughput | ارسال ترتیبی | >200 ارسال batch | Outbox + parallel worker (rate respected) |

---
## 5. استراتژی Backup & Restore (جزئیات عملیاتی)
پوشش داده شد در 1.11؛ اینجا فرمت اجرایی سریع:
1. ابزار: WAL + pg_basebackup + اسکریپت cron (bash) + integrity script (node + drizzle).  
2. امنیت: رمزگذاری در S3 (SSE-S3) + امضای SHA256 manifest.  
3. مانیتورینگ: اگر آخرین WAL > 10 دقیقه آپلود نشده → Alert.  
4. تست: سناریوی Table Drop و Corrupt Page هر ماه simulate.  

KPIs: RPO ≤ 5 دقیقه (با WAL) ، RTO ≤ 30 دقیقه.  

---
## 6. نقشه اقدام مرحله‌ای (Roadmap تلفیقی)
| فاز | اقلام کلیدی | خروجی |
|-----|-------------|--------|
| Phase A (2 هفته) | Migration مبلغ, ایندکس, ledger dual-write, ساده‌سازی invoices.tsx | صحت مبالغ + پایه تخصیص |
| Phase B (2 هفته) | Reconciliation + balance cache + Allocation UI Modal + Portal refactor styles | دقت بدهی + UX ارتقاء |
| Phase C (3 هفته) | Outbox Telegram + Event Stream + Integrity KPIs Dashboard + Backup Automation | قابلیت اطمینان و مانیتورینگ |
| Phase D (اختیاری) | Algorithmic Allocation (Aging / Weighted) + Analytics Exports | بهینه‌سازی پیشرفته |

---
## 7. جمع‌بندی نهایی
«بحرانی‌ترین شکاف» همچنان نبود allocation sub-ledger است که موجی از اثرات زنجیره‌ای (دقت بدهی، گزارش، تجربه کاربری) ایجاد می‌کند. در محور Frontend نابرابری بلوغ (Invoices در برابر سایر صفحات) مانع مقیاس‌پذیری تیمی است. از منظر UI/UX، ریسپانسیو پایه در برخی قسمت‌ها قابل قبول اما برای جداول مالی بهینه نیست. مقیاس سه‌ساله تهدید فنی نیست اگر: (i) ایندکس‌ها اعمال شوند، (ii) ledger و cache پیاده شود، (iii) استراتژی backup & PITR فعال گردد.  
این گزارش صرفاً تحلیلی است (هیچ تغییری در کد اعمال نشده) و آماده ورود به فاز طراحی/اجرا پس از تأیید شما می‌باشد.

---
پیوست A – رفرنس سریع الگوریتم تخصیص پیشنهادی (بهینه‌شده)
```
BEGIN;
	SELECT * FROM payments WHERE id=$pid FOR UPDATE;
	remaining := payment.amount - SUM(allocations.amount);
	IF remaining <= 0 THEN ROLLBACK; END IF;
	CURSOR invoices_cur FOR
		SELECT id, amount, allocated_total
		FROM invoice_balance_cache
		WHERE status_cached IN ('unpaid','partial')
		ORDER BY issue_date ASC
		FOR UPDATE SKIP LOCKED;
	FOR inv IN invoices_cur LOOP
		 need := inv.amount - inv.allocated_total;
		 portion := LEAST(need, remaining);
		 INSERT INTO payment_allocations(...portion...);
		 UPDATE invoice_balance_cache SET allocated_total=allocated_total+portion, remaining_amount=amount-(allocated_total+portion) ...;
		 remaining := remaining - portion;
		 EXIT WHEN remaining = 0;
	END LOOP;
	UPDATE payments SET is_allocated = (remaining=0) WHERE id=$pid;
COMMIT;
```

---
پیوست B – حداقل الزامات تست رگرسیون آینده
1. تخصیص پرداخت با سناریوهای: full, partial multi-invoice, overpayment, zero remainder.  
2. ویرایش فاکتور پس از partial allocation (نباید اجازه کاهش زیر allocated_total دهد).  
3. Reconciliation job: تزریق خطای مصنوعی و کشف deviation.  
4. Backup & Restore: ایجاد داده → dump → حذف جدول → بازیابی → تطبیق checksums.  

---
پایان گزارش.

