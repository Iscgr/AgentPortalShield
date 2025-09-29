# Memory Spine (حافظه عملیاتی فاز ۲)
آخرین بروزرسانی: E-D5-PythonIntegrationCompleted

## 1. مأموریت (Mission Statement)
پیاده‌سازی امن، مرحله‌ای و بدون کاهش دامنه‌ی مسئله برای: (۱) ایجاد زیرلجر تخصیص پرداخت‌ها، (۲) مهاجرت نوع مبلغ، (۳) ایجاد کش تراز فاکتور، (۴) ابزار پایش Drift، (۵) بسترسازی برای UI تخصیص جزئی، (۶) ادغام Python برای محاسبات حجمی و سازوکار آتی تطبیقی—all بدون نقض اصل «Enhance Not Eliminate».

## 2. اصول راهنما (Guiding Invariants)
Ref: plan.md §0 و §16.
- GI1: حذف ممنوع؛ فقط ارتقاء تدریجی.
- GI2: Ledger + Invariants تنها منبع حقیقت مالی نهایی بعد از Switch.
- GI3: همه مهاجرت‌ها با مسیر Rollback تعریف‌شده.
- GI4: Traceability → هر آیتم دارای شناسه قابل نگاشت.
- GI5: Feature Flags = گیت‌های ایمنی.
- GI6: Concurrency کنترل‌شده با تراکنش + قفل سطر ردیف.
- GI7: Python Integration = بهینه‌سازی محاسبات حجمی با fallback JavaScript.

## 2.1. Python Integration Decisions (E-D5)
- Architecture: FastAPI microservice approach (port 8001)
- Communication: HTTP API calls with JSON payload
- Precision: Python Decimal library for financial calculations
- Failover: Automatic fallback to Node.js on Python service failure
- Threshold: Python service activated for >50 records bulk calculations
- Feature Flag: 'PYTHON_FINANCIAL_CALCULATIONS' controls integration

## 3. اینورینت‌های مالی (Financial Invariants)
I1..I5 (پایه) و I6..I10 (افزوده در plan.md §16.7). تست‌ها باید ساختار زیر را پوشش دهند:
- I1: Σ alloc by payment ≤ payment.amount
- I2: Σ alloc by invoice ≤ invoice.amount
- I3: remaining = invoice.amount - Σ alloc
- I4: status mapping deterministic
- I5: representative debt = Σ(invoice.amount) - Σ(alloc)
- I6..I10: توسعه کنترلی (over-allocation، status_cached سازگار، drift threshold)
TODO: افزودن I11 در آینده (Cross-period integrity بعد از Partitioning)

## 4. سؤالات باز (Open Questions)
| ID | سؤال | اولویت | وضعیت | یادداشت |
|----|-------|--------|--------|---------|
| Q1 | آیا نیاز به ستون currency اکنون یا فاز C؟ | Medium | باز | multi-currency فعلاً مطرح نشده |
| Q2 | نمایه‌سازی بر اساس representative + aging نیاز به ایندکس ترکیبی مجزا؟ | High | باز | در فاز A4 تحلیل Explain (کاندید: invoices(representative_id, issue_date, id)) |
| Q3 | Policy آرشیو synthetic lines بعد از backfill؟ | Low | باز | شاید نگهداشت دائمی برای Audit |
| Q4 | Source of truth برای representative.total_debt بعد از Switch؟ | High | باز | احتمالاً فقط job recalculated |

## 5. تصمیمات (Decisions Log)
| ID | تاریخ | تصمیم | گزینه‌های بررسی‌شده | دلیل انتخاب | اثر | Revisit |
|----|-------|--------|----------------------|--------------|------|---------|
| D1 | set | استفاده DECIMAL(15,2) در فاز A | INT, NUMERIC | سرعت مهاجرت + سادگی | کاهش ریسک اولیه | فاز C ارز جدید |
| D2 | set | Dual-write shadow mode | direct switch | کاهش Drift ریسک | نیاز Flag | بعد از ثبات |
| D3 | iter2 | چارچوب multi-stage flags (stateful) | boolean flags ساده | نیاز به گذار چند مرحله‌ای | امکان rollout/rollback ظریف | بازبینی بعد از فاز B |
| D4 | iter2 | تشخیص mode تخصیص با state مستقیم | محاسبه بر اساس active boolean | سادگی و صراحت | جلوگیری از تفسیر مبهم | زمانی که enforce نزدیک |
| D5 | iter2 | فرمول driftRatio = diffAbs / max(legacyAllocatedSum,1) | تقسیم بر مجموع ledger | legacy مبنا فعلاً منبع سطح شناخته | امکان مقایسه پایدار | بعد از switch معکوس بررسی |
| D6 | iter3 | افزودن drift breakdown per representative | فقط متریک کلی | نیاز pinpoint ریشه | تمرکز بهینه رفع | بعد از backfill فعال |
| D7 | iter4 | استراتژی cache recompute on-demand (service) | trigger-only | انعطاف دیباگ و تست | امکان refresh انتخابی | پس از materialization کامل |
| D8 | iter5 | Runtime Guards + Partial Orphan Distribution | تأخیر تا فاز B، حذف guard | پیشگیری over-allocation قبل switch | ایمنی migration | بعد از switch بازبینی |
| D9 | iter6 | Cache Sync On-Write بدون Trigger | استفاده از trigger DB | کاهش پیچیدگی موقت | سازگاری تدریجی | هنگام افزایش حجم بررسی |
| D10 | iter6 | CAST Dry-Run Validation (amount_dec) | Swap فوری ستون، حذف TEXT | سنجش بدون ریسک → populate تدریجی | آماده‌سازی مرحله Rename | بعد از تثبیت drift |
| D11 | iter7 | Ingestion Grouping by contiguous admin_username + invoice_usage_items table | یک invoice به ازای هر رکورد، عدم ذخیره جزئیات | انطباق با ساختار واقعی فایل هفتگی، کاهش انفجار رکورد | Traceability ریزمصرف + کاهش پیچیدگی CAST | بعد از فاز B بازبینی نیاز partition |
| D12 | iter7 | Logging ESM Patch + Redis Health Noise Mitigation + Session Table Migration | حذف کامل health checker یا خاموشی موقت | حفظ observability بدون کاهش دامنه | کاهش نویز بحرانی و آماده‌سازی برای drift metrics پایدار | بازبینی هنگام ورود real Redis |
| D13 | iter8 | Ledger Read Switch با flag canary/full | direct fallback | کاهش ریسک drift با گذار تدریجی | نیاز به monitoring | بعد از Phase B |
| D14 | iter8 | Fix allocation-service calculateDebt | SQL مستقیم یا فرضیه | استفاده از cache با متد getRepresentativeDebt | پایه سلامت ledger read | monitoring drift بعدی |

## 6. ریفرنس Trace IDs (Mapping Skeleton)
Draft JSON (تولید بعد):
{
	"Schema-1": "E-A1",
	"RootCause-21": "E-A2",
	"DataModel-8": "E-A2/E-A3",
	"Scalability-1.8": "E-A4",
	"I7": "Invariant Test Suite"
}

## 7. عکس فوری شِما فعلی (Schema Snapshot – BEFORE)
Source: `shared/schema.ts` (lines 1-250 استخراج مؤلفه‌های مالی):
```
payments(id, representative_id FK→representatives.id, invoice_id FK→invoices.id, amount TEXT NOT NULL, payment_date TEXT, is_allocated BOOLEAN)
invoices(id, representative_id, amount DECIMAL(15,2), status TEXT(unpaid|paid|overdue), no derived remainder columns)
financial_transactions(id, transaction_id UNIQUE, type TEXT شامل 'PAYMENT_ALLOCATE', misuse as pseudo allocation)
representatives(total_debt DECIMAL snapshot field)
MISSING: payment_allocations, invoice_balance_cache, reconciliation_runs
MISSING: payments.amount_dec shadow column
GHOST FIELD: paidAmount / remaining referenced in logic (not in schema)
```
Assessment: تایید نیاز اپیک‌های E-A1..E-A3 و Addendum §16.1.

## 8. طراحی DDL پیشنهادی (Draft 1 - Post Schema Extraction)
Adjustments: استفاده IF NOT EXISTS، آماده برای اجرای امن چندباره در محیط dev.
```sql
-- جدول زیرلجر تخصیص
CREATE TABLE IF NOT EXISTS payment_allocations (
	id BIGSERIAL PRIMARY KEY,
	payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
	invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
	allocated_amount DECIMAL(15,2) NOT NULL CHECK (allocated_amount > 0),
	method TEXT NOT NULL CHECK (method IN ('auto','manual','backfill')),
	synthetic BOOLEAN NOT NULL DEFAULT false,
	idempotency_key TEXT,
	performed_by BIGINT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_payment_alloc_unique UNIQUE (payment_id, invoice_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- کش تراز فاکتور
CREATE TABLE IF NOT EXISTS invoice_balance_cache (
	invoice_id BIGINT PRIMARY KEY REFERENCES invoices(id) ON DELETE CASCADE,
	allocated_total DECIMAL(15,2) NOT NULL DEFAULT 0,
	remaining_amount DECIMAL(15,2) NOT NULL,
	status_cached TEXT NOT NULL,
	version INT NOT NULL DEFAULT 0,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_balance_status_rem ON invoice_balance_cache(status_cached, remaining_amount);

-- اجرای drift / آمار آشتی
CREATE TABLE IF NOT EXISTS reconciliation_runs (
	id BIGSERIAL PRIMARY KEY,
	scope TEXT NOT NULL, -- e.g. representative / global
	diff_abs DECIMAL(15,2) NOT NULL,
	diff_ratio DECIMAL(12,6) NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('OK','WARN','FAIL')),
	meta JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recon_status_created ON reconciliation_runs(status, created_at);

-- ستون shadow برای مبلغ پرداخت
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_dec DECIMAL(15,2);
```
NOTES:
- NULL در idempotency_key: در Postgres یونیک چند NULL را می‌پذیرد → در آینده برای idempotency واقعی شاید UNIQUE(idempotency_key) WHERE idempotency_key IS NOT NULL اضافه شود.
- Partial Index پیشنهادی آینده: CREATE INDEX IF NOT EXISTS idx_open_invoices ON invoices(status) WHERE status IN ('unpaid','partial','overdue');
- Trigger/Function برای sync کش در Draft بعدی (فاز A3) افزوده می‌شود—اینجا صرفاً ساختار پایه.

## 9. Feature Flags (State Matrix Draft)
| Flag | حالات | وابستگی | وضعیت اولیه | یادداشت |
|------|-------|----------|--------------|----------|
| allocation_dual_write | off, shadow, enforce | DDL ledger | off | شروع ایمن |
| ledger_backfill_mode | off, read_only, active | dual_write=shadow | off | فعال در backfill |
| allocation_read_switch | off, canary, full | balance_cache | off | بعد از صحت |
| active_reconciliation | off, dry, enforce | recon_runs | off | فاز B |
| outbox_enabled | off, on | outbox table | off | فاز C |

## 10. طرح تست اینورینت (Test Plan Skeleton)
Suites:
- migration-cast.spec.ts → صحت CAST + diff tolerance.
- ledger-invariants.spec.ts → I1..I10.
- dual-write-shadow.spec.ts → عدم Drift بین مدل قدیم و ledger.
- cache-consistency.spec.ts → version افزایش، remaining صحیح.
- reconciliation-passive.spec.ts → تولید رکوردها.

## 11. ریسک‌های فعال (Active Risk Focus)
| Risk | Trigger Window | Mitigation Hook | مانیتور |
|------|----------------|-----------------|---------|
| R1 (Cast Failure) | لحظه migration | pre-migration scan | log + abort |
| R2 (Ledger Drift) | shadow mode | invariant diff job | metrics |
| R11 (FT misuse) | قبل از switch | توقف درج pseudo | code review |

## 12. برنامه اجرای Iteration فعلی (Phase A / Iteration 1 Scope)
دامنه این ایتریشن: تثبیت حافظه، استخراج دقیق schema، نهایی‌سازی DDL Draft 1، تولید migration اولیه و اسکلت تست.

## 13. لاگ پیشرفت (Iteration Log)
| Timestamp | Step | مشاهده | اقدام بعدی |
|-----------|------|--------|-------------|
| T1 | Init Memory | ساختار اولیه ایجاد شد | استخراج package.json |
| T2 | package.json Parsed | اسکریپت tsc موجود، jest وجود ندارد | تصمیم به استفاده node:test موقت |
| T3 | Schema Extracted | TEXT amount + نبود ledger تایید شد | تولید DDL Draft |
| T4 | DDL Draft Created | جداول ledger/caches/recon تعریف شد | افزودن به schema.ts |
| T5 | schema.ts Updated | جداول جدید + ستون shadow افزوده شد | ایجاد migration 002 |
| T6 | Migration 002 Created | فایل 002_ledger_foundation.sql ایجاد شد | تست Type Check |
| T7 | Type Check Pass | بدون خطا پس از اصلاح تست | آماده گزارش Iteration End |
| T8 | AllocationService Added | dual-write wrapper افزوده شد | توسعه flags چندمرحله‌ای |
| T9 | Multi-Stage Flags Added | feature-flag-manager ارتقاء یافت | پیاده‌سازی ReconciliationService |
| T10 | ReconciliationService Added | drift metrics اولیه | اسکریپت drift-shadow |
| T11 | Drift Script + Test | npm script و تست شکل خروجی | بروزرسانی حافظه و تصمیمات |
| T12 | Memory Updated | D3..D5 ثبت شد | آماده فاز بعدی (endpoint shadow) |
| T13 | Shadow Endpoint Added | /api/allocations/shadow در دسترس | افزودن breakdown متریک |
| T14 | Drift Breakdown Added | per representative متریک v1 | backfill dry-run سرویس |
| T15 | Backfill Dry-Run Added | شناسایی کاندیدهای بدون ledger | تست invariants پایه |
| T16 | Basic Invariants Tests | I1..I3 حداقلی (skip در عدم DB) | drift breakdown test |
| T17 | Breakdown Test Added | ساختار خروجی تایید شد | logging WARN/FAIL |
| T18 | Drift Logging Added | WARN/FAIL کنسول طبقه‌بندی | بروزرسانی حافظه Iter3 |
| T19 | Backfill Active Method | درج synthetic batch ساده | توسعه cache service |
| T20 | Cache Service Added | recompute(invoiceId) نسخه +۱ | ایندکس‌های سخت‌سازی |
| T21 | Migration 003 Added | ایندکس‌های idempotency/partial | تست status invariants |
| T22 | Status Invariants Tests | I4/I5 پایه | تست backfill active |
| T23 | Backfill Active Test | ساختار خروجی تایید شد | بروزرسانی حافظه Iter4 |
| T24 | Runtime Guard Flag Added | allocation_runtime_guards ایجاد شد | افزودن منطق گارد در allocate |
| T25 | Allocation Guard Logic | پیشگیری over-allocation payment/invoice | الگوریتم توزیع آماده |
| T26 | Orphan Partial Distribution | distributePartialOrphans پیاده شد | batch cache recompute |
| T27 | Batch Cache Recompute | متد recomputeAll افزوده شد | endpoint متریک کش |
| T28 | Cache Metrics Endpoint & Extended Invariants | /api/allocations/cache-metrics + I8/I9 تست | آماده گزارش Iter5 |
| T29 | Cast Script Added | payments-cast-shadow.ts ایجاد شد | تست migration-cast |
| T30 | Migration Cast Test | اختلاف مجموع تحت آستانه چک | cache sync on-write |
| T31 | Allocation Cache Sync | recompute بعد از allocateFull | backfill sync |
| T32 | Backfill Cache Sync | recompute بعد از active/orphan | drift I10 تست |
| T33 | I10 Drift Test Added | per representative threshold | canary skeleton |
| T34 | Canary Read Skeleton | /api/allocations/canary-debt | بروزرسانی D9 |
| T35 | Local DB Provisioned | docker compose db + drizzle push | آماده اجرای CAST |
| T36 | CAST Dry-Run (Empty Dataset) | 0 rows → withinTolerance=true | نیاز داده تست برای سناریوی واقعی |
| T37 | Memory Updated Iter6 | D10 ثبت شد | آمادگی برای apply بعد از ورود داده |
| T38 | Ingestion Dry-Run Grouping | 1470 lines → 227 groups، sum=49,981,108 | اجرای apply برای درج واقعی |
| T39 | Ingestion Apply | 227 invoices/payments + 1470 usage_items | CAST dry-run روی داده واقعی |
| T40 | CAST Dry-Run (Real Data) | total payments=227 sumText=sumDecimal diff=0 tolerance pass | آماده CAST apply تدریجی |
| T41 | Logging ESM Patch Applied | ReferenceError require حذف شد | پایدارسازی لاگ برای تحلیل مالی |
| T42 | Session Table Migration Added | جدول session موجود و خطای pruning حذف | کاهش نویز دیتابیس |
| T43 | Redis Health Noise Mitigated | پرچم SKIP_REDIS_HEALTH + downgrade dev | baseline سلامت بدون CRITICAL کاذب |
| T44 | Debt Compare Endpoint Added | /api/allocations/debt-compare (legacy vs ledger vs cache) | پایه رصد drift قبل canary read |
| T45 | Ledger Read Switch Implemented | flag فعال، تست invariants سبز | بروزرسانی plan.md برای Phase B |
| T46 | Allocation Cache Service Enhanced | متد getRepresentativeDebt اضافه شد | تست E-B1 complete |
| T47 | Invariants I1-I5 Verified | تست‌های پایه سبز پس از db:push | آماده Phase C یا ادامه B |

## 14. مسیرهای بعدی (Next Anticipated Steps)
~~Phase A / Iteration 5 (پیشنهادی):~~
~~1. الگوریتم backfill جزئی (پرداخت بدون invoice → توزیع FIFO)~~
~~2. افزودن guard over-allocation live (I6 runtime check)~~
~~3. job اولیه sync سراسری cache (batch recompute)~~
~~4. metrics endpoint برای cache/version drift~~
~~5. مستند status transition تفصیلی + نمودار state~~

**فاز ۱ تکمیل شد در T44 - مورخ September 29, 2025**

## 15. NOTES موقت
این فایل منبع حقیقت داخلی طراحی است؛ هر تغییر باید با plan.md منطبق و در صورت divergence علت ثبت شود.

---
END_OF_MEMORY
