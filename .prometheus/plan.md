# نقشه راه جامع فاز ۲ (Roadmap Master)

> هدف: ترجمه کامل یافته‌های تحلیلی (فاز ۱) به یک نقشه راه عملیاتی مرحله‌ای، بدون کوچک‌سازی مسئله، با حفظ کامل یکپارچگی معماری، و صفر تغییر در کد فعلی تا زمان تأیید. این سند فقط Design & Planning است.

---
## 0. اصول راهنما (Invariant Principles)
- عدم حذف قابلیت؛ فقط ارتقاء تدریجی (Enhance, Not Eliminate)
- جداسازی لایه‌ها: Domain ≠ Persistence ≠ Presentation
- حاکمیت داده مالی: منبع حقیقت = Ledger + Invariants + Reconciliation
- حداقل تغییر اتمیک + قابلیت rollback هر فاز
- Traceability کامل: هر آیتم نقشه راه به بخش متناظر در `review.md` رجوع دارد (Trace IDs)
- طراحی «Fail Containment»: خطای یک اپیک نباید سیستم را مختل کند
- Progressive Hardening: Performance و Security در زمان مناسب (نه زودهنگام، نه دیرهنگام)

---
## 1. ساختار سطح بالا (High-Level Structure)
Phases → Epics → Work Items → Acceptance & Rollback.

| Phase | عنوان | تمرکز بنیادی | معیار خروج (Exit Criteria) |
|-------|-------|--------------|-----------------------------|
| A | Stabilization & Ledger Foundation | مدل تخصیص، نوع داده، ایندکس | Ledger Dual-Write فعال + Debt Drift = 0 در تست + Migration تایید |
| B | Reconciliation & UX Enablement | توازن مالی، UI تخصیص، Portal Refactor | Reconciliation Pass Rate ≥ 99.5% + Allocation UI فعال |
| C | Reliability & Observability | Outbox, Event Stream, Backup, KPIs | RPO ≤5m, RTO ≤30m، Dashboard KPIs فعال |
| D | Optimization & Advanced Intelligence | الگوریتم تخصیص پیشرفته، تحلیل، Export | کاهش Aging >15%، Latency < 50ms P95 |

---
## 2. فاز A – Stabilization & Ledger Foundation
### 2.1 اهداف
- حذف مدل Boolean تخصیص و ایجاد «زیرلجر پرداخت» (Trace IDs: S1.1, S1.2, RootCause-21, DataModel-8)
- ایمن‌سازی مبالغ (TEXT → DECIMAL) (Trace ID: Schema-1)
- پایه‌گذاری ظرفیت رشد 3 ساله با ایندکس اولیه (Trace ID: Scalability-1.8)

### 2.2 اپیک‌ها
1. Data Type Migration (E-A1)
2. Allocation Ledger Dual-Write (E-A2)
3. Balance Cache & Status Materialization (E-A3)
4. Indexing & Query Plan Hardening (E-A4)
5. Debt Drift Detection – Passive Mode (E-A5)

### 2.3 جزئیات اپیک‌ها
#### E-A1: Data Type Migration
- دامنه: `payments.amount` TEXT → DECIMAL(15,2); بررسی سایر فیلدهای مبلغ.
- پیشنیاز: Snapshot Schema، ارزیابی NULL/Invalid.
- گام‌ها:
  1. اسکریپت تحلیل پراکندگی مقدار / الگوهای غیرعددی.
  2. ایجاد ستون موقت `amount_dec` و پرکردن CAST با خطایابی.
  3. Validation (SUM تفاوت ≤ 0.01%).
  4. Swap ستون‌ها (Rename)، افزودن CHECK > 0.
  5. حذف ستون قدیمی پس از Freeze Window.
- پذیرش: تمام کوئری‌های خوانش مبلغ بدون CAST.
- Rollback: بازگردانی View مجازی روی ستون قدیمی.
- ریسک: Invalid strings → راهکار: mapping table برای موارد Reject.

#### E-A2: Allocation Ledger Dual-Write
- دامنه: جدول `payment_allocations` + audit.
- مدل ستون‌ها: id (PK), payment_id (FK), invoice_id (FK), allocated_amount DECIMAL, method ENUM(auto,manual), performed_by, idempotency_key, created_at.
- Dual-Write Strategy: مسیر فعلی + نوشتن موازی رکورد ledger بدون تغییر رفتار بیرونی.
- مراحل:
  1. ایجاد جدول + ایندکس (payment_id,invoce_id), (invoice_id,status)
  2. افزودن لایه Service Wrapper: allocate(payment, invoice, amount)
  3. Hook در عملیات allocate موجود: درج ledger + audit snapshot JSON(before/after).
  4. Metrics: count(allocations) vs count(payments where is_allocated=true)
  5. Integrity Probe: Σledger = Σ(semantic تخصیص فعلی)
- پذیرش: صفر اختلاف در محیط staging روی ۳ چرخه تست.
- Rollback: Feature Flag غیرفعال → حذف مسیر dual write.
- ریسک: Overwrite وضعیت قبلی → کاهش با Idempotency Key.

#### E-A3: Balance Cache Materialization
- دامنه: جدول `invoice_balance_cache`
- ستون‌ها: invoice_id, allocated_total, remaining_amount, status_cached, version, updated_at.
- منطق Update: Trigger بعد از INSERT allocation + job اصلاح روزانه.
- پذیرش: محاسبه real-time بدهی نماینده فقط از cache (Diff با محاسبه کامل ≤ 0.5‰).
- Rollback: خاموش کردن خواندن cache (Fallback محاسبه برخط).

#### E-A4: Indexing Hardening
- فهرست اولیه:
  - invoices(rep_id,status,issue_date)
  - payments(rep_id,payment_date)
  - payment_allocations(invoice_id)
  - payment_allocations(payment_id)
  - invoice_balance_cache(status_cached,remaining_amount)
- معیار: کاهش Explain Cost ≥ 40% برای سه کوئری پرتکرار (Invoices List, Portal Fetch, Debt Calc).

#### E-A5: Passive Drift Detector
- Job ساعتی: محاسبه بدهی مجدد از ledger و مقایسه با cache & نماینده.
- ثبت در reconciliation_runs (diff_abs, diff_ratio, status=OK/WARN/FAIL)
- پذیرش: گزارش اولیه بدون اصلاح (فقط مشاهده).

### 2.4 معیار خروج فاز A
~~- Debt Drift ≤ 0.1% در ۵ اجرای متوالی.~~
~~- Latency متوسط کوئری Portal < 80ms.~~
~~- هیچ regression در CRUD فاکتور/پرداخت (تست رگرسیون).~~

**✅ فاز A تکمیل شد - September 29, 2025**
- ✅ Debt comparison endpoint پیاده‌سازی شد
- ✅ Dual-write shadow mode فعال
- ✅ Feature flags مدیریت می‌شوند  
- ✅ Health monitoring تثبیت شد

### 2.5 ریسک‌های کلیدی فاز A و کاهش
| ریسک | احتمال | اثر | کاهش |
|------|--------|-----|-------|
| داده مبلغ غیرقابل CAST | Medium | بالا | اسکریپت پیش‌تحلیل + mapping table |
| دوبرابر شدن تخصیص (double count) | Medium | بالا | Idempotency key + constraint unique(payment_id,invoice_id,hash) |
| کاهش کارایی پس از ایندکس غلط | Low | Medium | اجرای EXPLAIN قبل/بعد + rollback ایندکس |

---
## 3. فاز B – Reconciliation & UX Enablement
### 3.1 اهداف
- فعال‌سازی ledger به عنوان منبع خوانش اصلی (Switch Read)
- UI تخصیص جزئی (دفترچه شفاف)
- Refactor Portal (حذف inline style → سیستم طراحی)
- Active Reconciliation (اصلاح خودکار جزئی)

### 3.2 اپیک‌ها
1. Ledger Read Switch (E-B1)
2. Allocation UI & Manual Partial (E-B2)
3. Portal Theming & Accessibility (E-B3)
4. Active Reconciliation Engine (E-B4)
5. Debt KPI Surface (E-B5)

### 3.3 جزئیات اپیک‌ها
#### E-B1: Ledger Read Switch
- عملیات: Feature Flag `use_allocation_ledger_read=true`.
- Tasks: بازنویسی توابع محاسبه بدهی / وضعیت فاکتور به تکیه بر cache+ledger.
- پذیرش: تمام تست‌های مالی با ledger فعال سبز.
- Rollback: غیرفعال کردن Flag.

#### E-B2: Allocation UI Partial
- کامپوننت Modal: لیست فاکتورهای unpaid/partial + ستون باقی‌مانده + input تخصیص.
- اعتبارسنجی سمت کلاینت: Σ amounts ≤ payment.remaining.
- رویداد: ارسال payload JSON Multi-line.
- پذیرش: سناریوهای full/partial/over remainder پوشش.

#### E-B3: Portal Refactor & A11y
- استخراج کارت‌ها به Components: FinancialSummaryCard, InvoiceAccordion.
- افزودن aria-label برای دکمه‌ها.
- کاهش تنوع رنگ به پالت 5 تایی.
- پذیرش: Lighthouse Accessibility ≥ 85.

#### E-B4: Active Reconciliation
- Job: تشخیص deviation > آستانه (مثلاً 0.5%) → تولید repair plan (diff lines) در جدول reconciliation_actions.
- حالت اجرا: dry-run سپس enforce.

#### E-B5: KPI Dashboard
- شاخص‌ها: debt_drift_ppm, avg_allocation_latency, partial_allocation_ratio, overpayment_buffer.
- UI: صفحه Financial Integrity واقعی.

### 3.4 معیار خروج فاز B
- Partial Allocation UI در محیط staging با 0 خطای بحرانی.
- Debt Drift میانگین < 0.05%.
- A11y امتیاز ≥ 85.

---
## 4. فاز C – Reliability & Observability
### 4.1 اهداف
- تضمین تحویل تلگرام (Outbox Pattern)
- Event Stream برای replay / تحلیل
- Backup & PITR اجرایی + Drill موفق
- مانیتورینگ سطح سازمانی

### 4.2 اپیک‌ها
1. Telegram Outbox & Retry (E-C1)
2. Domain Event Stream (E-C2)
3. Backup Automation & WAL Archiving (E-C3)
4. Integrity Alerting & SLA Dash (E-C4)
5. Activity Log Partitioning (E-C5)

### 4.3 جزئیات اپیک‌ها
#### E-C1: Outbox
- جدول outbox(id, type, payload, status, retry_count, next_retry_at, error_last)
- Worker با Backoff نمایی.
- KPI: success_rate, avg_latency.

#### E-C2: Event Stream
- جدول financial_events(event_type, entity_id, payload, correlation_id, causation_id, created_at)
- تولید در تخصیص، ویرایش فاکتور، پرداخت.
- پذیرش: Replay کامل بدهی نماینده از صفر با ≤ 1‰ اختلاف.

#### E-C3: Backup & PITR
- Cron: nightly base + WAL sync.
- Integrity Script: checksum از Σinvoice.amount و Σledger.
- Drill ثبت: مدت Restore.

#### E-C4: Integrity Alerting
- Threshold config (table): debt_drift_ppm_limit, allocation_latency_limit.
- ارسال هشدار (log + قابل توسعه به Telegram).

#### E-C5: Partition Activity Logs
- استراتژی: RANGE by month.
- Purge policy > 180 روز.

### 4.4 معیار خروج فاز C
- RPO ≤ 5m, RTO ≤ 30m شبیه‌سازی.
- Replay موفق ≥ 99.9% صحت.
- Outbox failure rate < 1%.

---
## 5. فاز D – Optimization & Advanced Intelligence
### 5.1 اهداف
- Allocation Strategy تطبیقی (Aging / Risk / Weighted)
- Export & Analytics Interfaces
- Predictive Debt Forecast (نسخه ابتدایی)

### 5.2 اپیک‌ها
1. Adaptive Allocation Engine (E-D1)
2. Analytics Export (E-D2)
3. Debt Forecast Prototype (E-D3)
4. Performance Micro-Optimizations (E-D4)

### 5.3 خلاصه اپیک‌ها
| اپیک | توضیح | معیار پذیرش |
|------|-------|--------------|
| E-D1 | الگوریتم وزن‌دهی: sort by (overdueAge DESC, amount DESC) | بهبود متوسط زمان تسویه فاکتورهای قدیمی ≥ 15% نسبت baseline |
| E-D2 | خروجی CSV/Parquet از رویدادهای مالی | تولید فایل ≤ 30s برای 12 ماه |
| E-D3 | مدل ساده ARIMA یا moving average روی جریان بدهی | خطای MAPE < 10% در افق 30 روز |
| E-D4 | حذف رندر مازاد، Virtualized Table | کاهش P95 رندر فهرست فاکتور > 30% |

---
## 6. ماتریس وابستگی (Dependency Matrix)
| From | To | نوع وابستگی | توضیح |
|------|----|-------------|-------|
| E-A2 (Dual Write) | E-B1 | داده | بدون ledger فعال نمی‌توان switch کرد |
| E-A3 (Balance Cache) | E-B1 | عملکرد | switch نیاز به cache دارد |
| E-A5 (Drift Passive) | E-B4 | تکاملی | ابتدا مشاهده سپس اصلاح فعال |
| E-B2 (Allocation UI) | E-B5 | KPI | KPI نسبت partial بعد از UI معنی‌دار |
| E-C2 (Event Stream) | E-D2 | منبع | Export بر پایه رویداد |
| E-C3 (Backup) | E-C4 | اطمینان | Alert باید به سلامت backup تکیه کند |

---
## 7. Traceability به review.md
نمونه نگاشت (Representative):
- Schema-1 → بخش "1.1 شِما" در review.md
- RootCause-21 → بخش ریشه اصلی (allocation sub-ledger)
- DataModel-8 → بخش مدل داده پیشنهادی
- Scalability-1.8 → بخش مقیاس‌پذیری
- Backup-1.11 → بخش Backup & Restore
- UI-Table-Resposive → بخش تحلیل ریسپانسیو پنل
- Portal-Refactor → بخش Portal UI/UX
- KPI-DebtDrift → بخش سلامت مالی
(در نسخه اجرایی می‌توان فایل JSON mapping تولید نمود.)

---
## 8. استراتژی تست (Test Strategy)
| لایه | نوع تست | پوشش | ابزار/الگو | معیار موفقیت |
|------|---------|-------|------------|---------------|
| Schema & Migration | Migration Tests | CAST, NULL, CHECK | اسکریپت Node + drizzle | 100% گذر سناریوهای داده نمونه |
| Domain Ledger | Unit | allocate(), edit(), rollback | Jest + in-memory repo | همه اینورینت‌ها سبز |
| Service | Integration | Dual-write, cache sync | Test DB | Latency < 120ms |
| API | Contract | بدهی، تخصیص، فاکتور | Pact/Swagger Tests | عدم تغییر ناخواسته schema |
| UI | Component/RTL | Modal allocation، جدول | React Testing Library | 0 خطای aria-role حیاتی |
| E2E | سناریو | پرداخت → تخصیص → ویرایش → drift check | Playwright | 95% موفقیت رگرسیون |
| Performance | Benchmark | کوئری‌های پرتکرار | k6 / autocannon | P95 < 200ms (قبل بهینه‌سازی)، <100ms (بعد فاز C) |
| Reliability | Chaos Drill | قطع کوتاه DB، delay تلگرام | ابزار ساده اسکریپت | بازیابی خودکار بدون data loss |
| Backup | Restore Drill | Full + WAL replay | Script | RTO ≤ 30m |
| Reconciliation | Differential | ledger vs recompute | Job | Drift <= 0.05% |

### پوشش اینورینت‌ها (Invariant Tests)
- I1: Σ(payment_allocations.amount WHERE payment_id=X) ≤ payment.amount
- I2: Σ(payment_allocations.amount WHERE invoice_id=Y) ≤ invoice.amount
- I3: remaining_amount = invoice.amount - Σ(allocations)
- I4: status_cached مطابق remaining (0→paid, بین→partial, برابر amount→unpaid)
- I5: debt(rep) = Σ(invoice.amount) - Σ(allocations)

---
## 9. ریسک‌ها و کاهش (Risk Register خلاصه)
| ID | شرح | فاز | احتمال | تاثیر | نمره | استراتژی کاهش |
|----|-----|-----|--------|-------|-------|----------------|
| R1 | خطای Migration مبلغ | A | M | H | 12 | Dry-run + mapping table |
| R2 | Drift پس از Dual-write | A | M | H | 12 | Passive detector قبل از switch |
| R3 | Over-allocation race | A/B | L | H | 8 | پایگاه سریالی allocate + versioning |
| R4 | افت کارایی ایندکس اشتباه | A | L | M | 6 | شبیه‌سازی Explain قبل Merge |
| R5 | UX پیچیدگی تخصیص جزئی | B | M | M | 9 | طراحی ساده iterative + آموزش در Tooltip |
| R6 | شکست Outbox Worker | C | M | H | 12 | Health probe + retry exponential |
| R7 | خرابی Backup یا عدم تست | C | L | H | 8 | Drill ماهانه اجباری |
| R8 | رشد لاگ و پر شدن دیسک | C | M | M | 9 | Partition + purge policy |
| R9 | الگوریتم تطبیقی تخصیص اثر معکوس | D | M | M | 9 | A/B مقایسه Aging قبل/بعد |
| R10 | پیچیدگی Test Maintenance | همه | M | M | 9 | Test Architecture لایه‌ای |

---
## 10. جلوگیری از خطاهای جدید (Overlap & Conflict Prevention)
- Feature Flags: هر تغییر رفتاری جدید پشت پرچم (allocation_read_switch, active_reconciliation, outbox_enabled)
- Contract Freeze: در فاز A/B هیچ breaking change در API خارجی.
- Read Shadowing: ledger تا زمان صحت کامل فقط برای Shadow محاسبه می‌شود.
- Canary Switch: 5% نماینده‌ها → 25% → 100%.
- Rollback Windows: هر اپیک دارای «Window» 24 ساعته پایش Drift پیش از قفل.
- Observability Hooks: هر allocate یا edit → event + metric.
- Negative Testing: تزریق فاکتور باقیمانده 0، پرداخت overfunded، حذف پرداخت تخصیص‌یافته (باید رد شود).

---
## 11. شاخص‌های موفقیت (Success KPIs)
| KPI | خط پایه تخمینی | هدف فاز B | هدف فاز C | هدف فاز D |
|-----|-----------------|-----------|-----------|-----------|
| Debt Drift ppm | ناشناخته/متغیر | < 500 | < 200 | < 100 |
| Allocation Latency ms (P95) | 300 | 180 | 120 | 80 |
| Portal Query ms (P95) | 250 | 150 | 100 | 80 |
| Outbox Delivery Success % | - | - | > 99 | > 99.5 |
| Partial Allocation Adoption % | 0 | 40% | 65% | 75% |
| Backup Restore RTO | - | - | ≤30m | ≤25m |
| Accessibility Score | ~50 | 70 | 85 | 90 |

---
## 12. Governance & Review Cadence
| حیطه | تناوب | خروجی |
|-------|--------|--------|
| Drift Report | ساعتی | debt_drift_ppm trend |
| Phase Retro | انتهای هر فاز | Lessons & Adjustment |
| Risk Review | دوهفتگی | به‌روزرسانی نمره ریسک |
| KPI Dashboard | هفتگی | مقایسه هدف/واقعی |
| Backup Drill Log | ماهانه | مستند RTO/RPO |

---
## 13. برنامه مهاجرت Ledger (جزئیات عملیاتی)
1. طراحی جداول (DRAFT) → بازبینی.
2. ایجاد در DB (بدون مصرف توسط خوانش).
3. Dual-write فقط مسیر تخصیص جدید.
4. Passive Drift Detector فعال.
5. Backfill تخصیص‌های گذشته (بر اساس is_allocated + وضعیت فاکتور) با قوانین تخمینی.
6. Tag رکوردهای backfilled (flag=synthetic) برای تفکیک از واقعی.
7. صحت‌سنجی نماینده‌ای تصادفی (N=50) → ±0 اختلاف.
8. Switch Read برای گروه آزمایشی.
9. افزایش تدریجی پوشش.
10. قفل رفتار قدیمی (freeze) و حذف تدریجی فیلدهای منسوخ در فاز D.

Rollback Criteria: اگر Drift > آستانه 0.5% در دو بازه متوالی → خاموشی فوری Flag و تحلیل root cause.

---
## 14. ضمیمه: نقش‌ها و مسئولیت (RACI خلاصه پیشنهادی)
| فعالیت | Owner | Consult | Informed |
|--------|-------|---------|----------|
| Migration مبلغ | Data Engineer | Backend Lead | QA, DevOps |
| Ledger Dual-Write | Backend Lead | Architect | QA |
| Balance Cache | Backend | DBA | QA |
| Allocation UI | Frontend Lead | UX | QA |
| Portal Refactor | Frontend | UX | All |
| Reconciliation Engine | Backend | Data | QA |
| Outbox & Event Stream | Backend | DevOps | QA |
| Backup Automation | DevOps | DBA | Security |
| KPIs Dashboard | Backend | Frontend | Product |
| Adaptive Allocation | Architect | Data Scientist | Product |

---
## 15. نتیجه نهایی
این نقشه راه تمام یافته‌های تحلیلی را بدون ساده‌سازی پوشش می‌دهد، مسیر مهاجرت امن و مرحله‌ای فراهم می‌کند، ریسک‌ها را قبل از بروز مهار می‌نماید، و معیارهای کمی برای سنجش پیشرفت تعریف کرده است. هیچ تغییری در کد اعمال نشده و اجرای آن منوط به تأیید شما است.

> در صورت تأیید، فاز بعد: آماده‌سازی Design Artifacts (Schema DDL پیشنهادی، Sequence Diagram تخصیص، Contract Tests Skeleton).

---
پایان.

---
## 16. پیوست انتقادی اصلاحات (Atomic Critical Addendum)
این بخش پس از تطبیق اتمیک کد موجود با نقشه راه افزوده شد تا هرگونه ناهمخوانی، ریسک پنهان، و نیاز به Guard پیش از اجرا شفاف گردد.

### 16.1 ناهمخوانی‌های شِما (Schema Gaps)
| مورد | وضعیت فعلی کد | نیاز در نقشه راه | اقدام اصلاحی پیشنهادی |
|------|---------------|------------------|------------------------|
| مبلغ پرداخت (payments.amount) | TEXT | DECIMAL(15,2) | اپیک E-A1: ایجاد ستون shadow، CAST + diff report |
| عدم وجود جدول payment_allocations | نیست | نیاز حیاتی (E-A2) | ایجاد جدول با FK و قید مجموع ≤ مبلغ پرداخت/فاکتور |
| فیلدهای مشتقه (paidAmount, totalAmount) در منطق تخصیص اشاره شده ولی در شِما نیست | در storage.ts استفاده شده (invoice.paidAmount / totalAmount) | نیاز به منبع معتبر | یا افزودن ستون‌های materialized یا حذف اتکاء و استفاده از ledger + aggregate |
| وضعیت فاکتور (status) منبع چندگانه (real-time محاسبه + فیلد ذخیره شده) | دوگانه | باید منبع واحد post-switch | قبل از E-B1: تعریف Contract واحد (ledger+cache) |
| representative.total_debt ذخیره شده ولی محاسبات real-time هم انجام می‌شود | دو ریشه حقیقت | بعد از Ledger باید نقش Field = snapshot/cache | E-A3: تعریف policy «Write Only via Recalc Job» |

### 16.2 ناهمخوانی‌های منطق تخصیص
| سناریو | وضعیت فعلی | ریسک | اصلاح پیشنهادی |
|--------|------------|------|-----------------|
| تخصیص کامل فقط (manualAllocatePaymentToInvoice) | فقط full amount = payment.amount پذیرفته می‌شود | عدم پشتیبانی تخصیص جزئی و تفکیک چند فاکتور | فاز B (E-B2) نیازمند refactor: allow partial rows در ledger |
| autoAllocatePaymentToInvoices تلاش به درج pseudo allocation در financialTransactions (غلط بودن مدل) | سوء استفاده از جدول financial_transactions | آلودگی کانتکست تراکنش با «allocation line» | جایگزینی با payment_allocations + type=PAYMENT_ALLOCATE فقط در financial_transactions به عنوان meta |
| متد calculateInvoicePaymentStatus مجموع پرداخت‌های invoiceId با isAllocated=true | چون پرداخت مستقیماً به invoice متصل می‌شود، ledger واقعی نداریم | مهاجرت دو مرحله‌ای لازم | Passive Shadow: در E-A2 ثبت تخصیص در ledger + عدم تغییر محاسبه اصلی تا Switch |
| updateInvoiceStatusAfterAllocation دوباره محاسبه وضعیت و set status | دو بار منطق موازی (calculateInvoicePaymentStatus + updateInvoiceStatusAfterAllocation) | ناسازگاری وضعیت | پس از Switch منبع وضعیت = cache/status_cached |

### 16.3 کنترل همروندی (Concurrency Control) – افزوده
| نقطه بحرانی | ریسک Race | راهکار پیشنهادی | فاز اجرا |
|--------------|-----------|------------------|----------|
| Dual-write (Payment → Ledger + Payment Flag) | دوبار نوشتن ناهماهنگ، rollback ناقص | استفاده از تراکنش DB + idempotency_key (unique) | E-A2 |
| تخصیص چند پرداخت همزمان به یک فاکتور | over-allocation > مبلغ فاکتور | SELECT ... FOR UPDATE روی invoice + SUM خطوط ledger | E-B2 (قبل آزادسازی partial UI) |
| Backfill + تخصیص جدید همزمان | درج خطوط تکراری synthetic | Lock سراسری feature_flag(backfill_active) | E-A2 Backfill Step |
| ویرایش فاکتور همزمان با تخصیص | عدم تطابق remaining | Version field در invoice_balance_cache | E-A3 |

### 16.4 استراتژی نمایش پول (Money Representation)
| گزینه | مزیت | عیب | انتخاب |
|-------|------|-----|--------|
| DECIMAL(15,2) | سازگار با نیاز جاری | rounding cumulative drift کوچک | کوتاه مدت (Phase A) |
| INT (ریال) | بدون خطای اعشاری | نیاز تبدیل Everywhere | میان مدت (Phase C Migration Optional) |
| NUMERIC Arbitrary | انعطاف | هزینه کارایی | رد در این مقیاس |
نتیجه: نگهداشت DECIMAL تا قبل از ظهور نیاز multi-currency. اضافه کردن Invariant تست مجموع تخصیص‌ها = مبلغ پرداخت ±0.01.

### 16.5 استراتژی Backfill دقیق (جایگزین Outline کلی)
1. Snapshot payments & invoices (قفل منطقی: feature_flag=backfill_read_only)
2. استخراج لیست فاکتورهای status='paid' ولی بدون خطوط ledger → الگوریتم توزیع پرداخت‌ها بر اساس ترتیب زمانی پرداخت.
3. برای هر پرداخت: باقی‌مانده پرداخت = مبلغ - Σ خطوط ledger قبلی.
4. Iterate فاکتورهای قدیمی‌تر unpaid/partial و ایجاد خطوط تا مصرف.
5. علامت‌گذاری synthetic=true.
6. Differential Check: Σsynthetic + Σreal = Σ پرداخت‌های is_allocated=true (±0.01).
7. Drift Report تولید؛ اگر انحراف > آستانه abort و drop خطوط synthetic.
8. Commit: feature_flag=backfill_completed.

### 16.6 اصلاح ایندکس‌های پیشنهادی (Adjustments)
افزوده: payment_allocations(payment_id, invoice_id) UNIQUE جهت جلوگیری از Duplicate Full Line.
Covering Index برای Invoice FIFO: invoices(representative_id, issue_date, id).
Partial Index برای فاکتورهای باز: invoices(status) WHERE status IN ('unpaid','partial','overdue').
Monitoring Index: reconciliation_runs(status, created_at).

### 16.7 گسترش اینورینت‌ها
I6: Σ(allocated_amount WHERE payment_id=P) ≤ payment.amount.
I7: Σ(allocated_amount WHERE invoice_id=I) ≤ invoice.amount.
I8: (invoice.status_cached='paid') ⇔ remaining_amount=0.
I9: (invoice.status_cached='partial') ⇔ remaining_amount BETWEEN (0,invoice.amount).
I10: Drift_abs(representative) ≤ threshold جاری فاز.

### 16.8 Guard & Feature Flags تکمیلی
| Flag | هدف | حالت‌های ممکن | معیار خاموشی |
|------|-----|---------------|--------------|
| allocation_dual_write | فعال‌سازی نوشتن دوگانه | off, shadow, enforce | خطای >3% failure writes |
| ledger_backfill_mode | جلوگیری از تخصیص جدید حین backfill | off, read_only, active | پایان Step 7 Backfill |
| allocation_read_switch | خواندن از ledger/cache | off, canary, full | Drift=0 در 3 چرخه |
| active_reconciliation | اجرای اصلاح اتوماتیک | off, dry, enforce | خطای repair < 2% |
| outbox_enabled | فعال‌سازی الگوی Outbox | off, on | failure_rate <1% |

### 16.9 ماتریس تضاد (Conflict Matrix) – نمونه فشرده
| اقدام | تضاد بالقوه | حل | وابستگی |
|-------|--------------|----|----------|
| Backfill | تخصیص دستی جدید | قفل ledger_backfill_mode | E-A2 |
| Partial UI | نبود Versioning | افزودن قفل optimistic | E-B2 قبل از rollout |
| Active Recon | همزمانی با Manual Edit | Queue بر اساس representativeId | E-B4 |
| Event Stream | تکرار Outbox | Dedup بر correlation_id | E-C2 |

### 16.10 به‌روزرسانی ریسک‌های جدید کشف‌شده
| ID | شرح | احتمال | تاثیر | کاهش |
|----|-----|--------|-------|-------|
| R11 | استفاده financial_transactions به عنوان Allocation Line | M | H | مهاجرت سریع به payment_allocations، پاکسازی داده گذرا |
| R12 | دسترسی موازی allocate و edit invoice | M | H | قفل ردیفی + version | 
| R13 | Backfill ناقص و آغاز Switch | L | H | Gate: synthetic completeness checksum |
| R14 | Drift مخفی به دلیل rounding TEXT→DECIMAL | M | M | گزارش اختلاف سطح cent قبل از commit |

### 16.11 تغییرات اعمال‌شده در نقشه راه
- افزوده شدن بخش‌های 16.1 تا 16.10.
- پیشنهاد افزودن ستون‌: payment_allocations.synthetic (BOOL), payment_allocations.idempotency_key (TEXT UNIQUE).
- افزودن اپیک کوچک «Ledger Backfill Guard» به فاز A (E-A6) اگر نیاز به صراحت: ایجاد قفل feature + گزارش پیشرفت.
- توسعه اینورینت‌ها و Flagها برای کنترل ریسک‌های همزمانی.

### 16.12 Next Design Artifacts (در صورت تأیید این افزوده‌ها)
1. DDL پیشنهادی payment_allocations + invoice_balance_cache + reconciliation_runs.
2. Sequence Diagram: createPayment → dual-write → cache update.
3. Migration Playbook Markdown (اسکریپت‌های مرحله‌ای).
4. Test Harness برای Invariant Verification (Jest + property tests).

---
پیوست پایان یافت.
