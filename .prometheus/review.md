## گزارش جامع وضعیت و چک‌لیست پیشرفت (نسخه همگام با آخرین تغییرات Phase B – E-B3 Complete)
به‌روزرسانی: شامل تکمیل E-B3 Portal Accessibility (WCAG AA compliance, contrast audit automation, focus standardization) و آماده‌سازی برای KPI Visualization Phase (E-B5 Stage 3). این سند اکنون منبع «چک‌لیست زنده» برای مدل عامل بعدی است و باید بدون کاهش دامنه، ادامه‌ی اجرای نقشه راه را هدایت کند.

---
### فهرست سرفصل‌ها
1. خلاصه اجرایی (Executive Snapshot)
2. وضعیت فازها و درصد پیشرفت کلی
3. ماتریس اپیک‌ها (Phase A-D) با وضعیت Done / Partial / Pending
4. Feature Flags – ماتریس حالت فعلی
5. مهاجرت‌ها و لایه داده (Schema & Migrations Status)
6. مؤلفه‌های Backend و وضعیت هر کدام
7. تخصیص و Ledger – وضعیت، اینورینت‌ها، Drift & Reconciliation
8. سیستم Guard Metrics & Alerts (KPI زیرساخت)
9. Frontend / UI وضعیت (Allocation Modal, Metrics Panel, Portal, Admin Panel)
10. دسترس‌پذیری و Refactor برنامه‌ریزی‌شده (E-B3)
11. KPI Dashboard (E-B5 Stage 3 – آیتم‌های باقی‌مانده)
12. Usage Line Visibility (E-B6) – طراحی و نیازها
13. Test Coverage Matrix (فعلی vs هدف)
14. ریسک‌های فعال و کنترل‌ها
15. اقدامات بعدی (Next Action Slices پیشنهاد شده)
16. Traceability (Plan / Memory / Decisions Mapping)
17. ضمائم (Pseudo-code, Invariants, Runbook خلاصه)

---
## 1. خلاصه اجرایی
Phase A کاملاً خاتمه‌یافته (Ledger Foundation + Cache + Drift Passive). Phase B وارد لایه‌های Reconciliation Observability و UI تخصیص شده و **E-B3 Portal Accessibility تکمیل شده** با WCAG AA compliance، contrast audit automation، و focus standardization. Guard Metrics Persistence و Alert Classification نیز فعال هستند. انتخاب شاخه بعدی بین: (A) KPI Visualization (E-B5 Stage 3)، (B) Usage Line Drilldown (E-B6)، (C) Active Reconciliation Actions (E-B4). Drift مالی تحت کنترل، accessibility professional-grade، و مسیر Outbox/Event Stream (Phase C) هنوز untouched.

Progress Summary (تقریبی کل نقشه راه): ~50% (Phase A 100%، Phase B (Epics فعال/جزئی) ~75% از کل وزن پروژه، فازهای C-D صفر). **✅ E-B6 Usage Lines تکمیل کامل - API + UI** **✅ E-B5 Stage 3 KPI Dashboard تکمیل کامل - Visualization + Export** **✅ E-B4 Active Reconciliation Engine تکمیل کامل - Detection + Repair + Automation**. این عدد صرفاً برای هم‌تِرک است و Rollout نباید بر اساس درصد، بلکه بر اساس معیارهای خروج (Exit Criteria) هدایت شود.

---
## 2. وضعیت فازها
| فاز | توضیح | وضعیت | درصد داخلی فاز | معیار خروج | توضیح تکمیلی |
|-----|-------|-------|-----------------|-------------|--------------|
| A | Stabilization & Ledger Foundation | Done | 100% | Debt Drift پایدار + Dual Write Shadow + Cache Materialization | تأیید شده در تاریخ 29 Sep 2025 |
| B | Reconciliation & UX Enablement | In Progress | ~75% | Reconciliation Pass ≥99.5% + Allocation UI فعال + A11y ≥85 | ✅ E-B3 Accessibility تکمیل، ✅ E-B6 Usage Lines تکمیل کامل، ✅ E-B5 Stage 3 KPI Dashboard تکمیل، ✅ E-B4 Active Reconciliation Engine تکمیل کامل |
| C | Reliability & Observability | Pending | 0% | Outbox + Event Stream + Backup Drill | مقدمات (برخی ساختار جدول آینده) هنوز ایجاد نشده |
| D | Optimization & Intelligence | Pending | 0% | Python Integration Harness + Forecast Prototype | فقط پرچم‌های طراحی در حافظه ثبت |

---
## 3. ماتریس اپیک‌ها (وضعیت تفصیلی)
Legend: [D]=Done, [P]=Partial, [N]=Not Started

### Phase A
| اپیک | کد | وضعیت | توضیح تفصیلی |
|------|----|--------|---------------|
| Data Type Migration | E-A1 | D | ستون DECIMAL shadow آماده (اسکریپت CAST Dry-Run اجرا شد – تفاوت صفر) Rollout rename نهایی در انتظار Window مناسب |
| Allocation Ledger Dual-Write | E-A2 | D | جدول ledger + Dual Write Shadow فعال + Idempotency Key + Invariants پایه |
| Balance Cache Materialization | E-A3 | D | `invoice_balance_cache` + recompute services + batch recompute و sync on-write پیاده‌سازی |
| Indexing & Query Plan | E-A4 | D | ایندکس‌های ضروری (پرداخت، فاکتور، ledger) اضافه؛ نیاز پایش Explain بعد از افزایش داده |
| Passive Drift Detector | E-A5 | D | Endpoint و Job مقایسه legacy vs ledger vs cache + per-representative breakdown |

### Phase B
| اپیک | کد | وضعیت | توضیح |
|------|----|--------|-------|
| Ledger Read Switch | E-B1 | D | getRepresentativeDebt از cache + مقایسه debt legacy فراهم؛ پرچم switch ساختار یافته |
| Allocation UI & Manual Partial | E-B2 | P | Modal اولیه + Partial Allocation مسیر Backend + Runtime Guards (off/warn/enforce) فعال؛ Full enforcement هنوز کامل عمومی نشده |
| Portal Theming & Accessibility | E-B3 | D | ✅ WCAG AA contrast audit (6 Pass, 2 Partial), focus-visible standardization, comprehensive aria-labels, keyboard navigation framework, Lighthouse baseline established |
| Active Reconciliation Engine | E-B4 | D | ✅ COMPLETED: Drift detection (standard + Python enhanced), repair plan generation, execution engine (dry/enforce), safety thresholds (50K limit), Guard Metrics integration, automated triggering via DriftJobService |
| Debt KPI Surface (Persistence & Alerts) | E-B5 | D | ✅ COMPLETED: Stage 1 (Persistence) + Stage 2 (Alerts) + Stage 3 (Visualization/KPI Dashboard) - comprehensive metrics visualization with charts, export, trends |
| Usage Line Visibility & Audit | E-B6 | D | ✅ COMPLETED: API endpoints + UI Modal + Table integration + Feature flag + CSV export + Testing validated |
| Financial Summary Refactor Consolidation | E-B7 | P | استخراج Panel + کاهش duplication انجام؛ همگرایی کامل کوئری واحد + snapshot test نهایی باقی |
| Representative Metrics Refresh Optimization | E-B8 | N | invalidate هوشمند + latency هدف <2s شروع نشده |

### Phase C
| اپیک | وضعیت | توضیح |
|------|--------|-------|
| Telegram Outbox & Retry | N | هیچ جدول outbox هنوز |
| Domain Event Stream | N | جدول financial_events ایجاد نشده |
| Backup Automation & WAL Archiving | N | فقط طراحی در plan؛ بدون اسکریپت cron |
| Integrity Alerting (SLA Dash) | N | بخشی از زیرساخت Alert (Guard Metrics) آماده، Debt Drift Alerts خاص هنوز |
| Activity Log Partitioning | N | استراتژی RANGE ماهیانه پیاده نشده |
| Ingestion Progress State Machine & Determinism | P | State output NDJSON seq اضافه (Iter گذشته) – formal state table/metadata ناقص |

### Phase D
| اپیک | وضعیت | توضیح |
|------|--------|-------|
| Adaptive Allocation Engine | N | الگوریتم Aging/Weighted طراحی اولیه فقط |
| Analytics Export | N | خروجی CSV/Parquet پیاده نشده |
| Debt Forecast Prototype | N | مدل ARIMA/MAvg صرفاً در plan |
| Performance Micro-Optimizations | N | Virtualized Table و Render Reduction انجام نشده |
| Python Financial Microservice | N | هنوز هیچ سرویس FastAPI یا Flag اجرایی |
| Python vs Node Consistency Harness | N | Harness مقایسه پیاده نشده |

---
## 4. Feature Flags Matrix
| Flag | حالات | وضعیت جاری | توضیح تکمیلی |
|------|-------|------------|---------------|
| allocation_dual_write | off,shadow,enforce | shadow/enforce (فعال shadow مسیر) | نوشتن ledger همزمان؛ آماده enforce کامل پس از KPI پایدار |
| allocation_runtime_guards | off,warn,enforce | warn یا enforce در محیط dev | جلوگیری over-allocation + شمارش رویداد |
| allocation_partial_mode | off,shadow,enabled | shadow | UI Modal در حالت محدود |
| allocation_read_switch | off,canary,full | off/canary (پایه) | Debt read هنوز legacy+cache cross-check |
| active_reconciliation | off,dry,enforce | dry | repair actions تولید نمی‌شود |
| usage_line_visibility | off,on | on (فعال) | ✅ FULL DEPLOYMENT: API endpoints + UI Modal + Table buttons + CSV export |
| ledger_backfill_mode | off,read_only,active | read_only تکمیل | backfill synthetic تست شد |
| outbox_enabled | off,on | off | فاز C |
| guard_metrics_persistence | off,shadow,enforce | shadow یا enforce (dev) | رویدادها در DB ثبت (Queue Flush) |
| guard_metrics_alerts | off,on | on (dev) | طبقه‌بندی warn/critical فعال |
| python_financial_calculations | off,shadow,enforce | off | برای فاز D |

---
## 5. Schema & Migration Status
جداول افزوده: payment_allocations, invoice_balance_cache, reconciliation_runs, guard_metrics_events. ستون shadow مبلغ (amount_dec) موجود. ایندکس‌های کلیدی ledger و cache برقرار. Migration CAST نهایی (rename حذف ستون قدیم) هنوز اعمال نشده (故عمداً تأخیر برای Window پایش).

TODO Schema (Pending):
1. outbox (phase C)
2. financial_events (domain event stream)
3. threshold_config (dynamic KPI limits – جایگزینی hard-coded)
4. guard_metrics_rollup (Aggregation retention)
5. partitioning strategy activity_logs / usage_items (فاز C)

---
## 6. Backend Component Status
| مؤلفه | وضعیت | توضیح |
|--------|-------|-------|
| AllocationService | P | Dual-write + Partial allocate مسیر؛ Distribution Orphan الگوریتم پایه موجود؛ نیاز hardening concurrency |
| CacheService (Invoice Balance) | D | recompute(invoiceId) + recomputeAll + sync on write |
| ReconciliationService | P | Drift passive + breakdown؛ Repair Plan generator N |
| GuardMetricsService | D | شمارش in-memory + recent events؛ queue → persistence |
| GuardMetricsPersistenceService | D | batch flush + multi-window summary (1h/24h) |
| GuardMetricsAnalyzer | D | thresholds mapping + classify warn/critical |
| FeatureFlagManager | D | multi-stage flags generic + retrieval API داخلی |
| Ingestion Engine | P | deterministic seq NDJSON; state transitions formalization N |
| Error Manager / Unified Error | P | پایه موجود؛ نیاز همگرایی mapping کدها برای UI نمایش |
| Health Checker | P | endpoints پایه + دسته‌بندی؛ نیاز metrics latency/queue depth |
| Python Integration Adapter | N | اسکلت و flag فقط در memory/logic plan |

---
## 7. Allocation & Ledger Integrity
Invariants I1..I10 (پایه تست شده: I1-I5 قطعاً سبز، I6-I10 برخی پوشش جزئی). Drift Compare Endpoint فعال؛ per-representative drift metrics آماده. Canary debt read آماده رول‌آوت مرحله‌ای.

Gaps:
1. عدم ذخیره سطح enforce/warn در رکورد guard_metrics_events (آیتم آینده enrichment)
2. عدم roll-up retention (حجم طولانی مدت)
3. Repair Action generation (E-B4) خالی

---
## 8. Guard Metrics & Alerts
Pipeline: record() → enqueue → flush → guard_metrics_events → analyzer → alerts endpoint.
Stage Status:
| Stage | توضیح | وضعیت |
|-------|-------|--------|
| In-Memory Counters | اولیه ثبت I* رویداد | Done |
| Persistence (DB) | جدول + flush queue | Done |
| Alerts Classification | thresholds استاتیک | Done |
| Visualization (Charts/Rates) | نمودار trend, ppm, ratio | Not Started |
| External Alert Channels | Email/Telegram + throttle | Not Started |
| Dynamic Threshold Management | جدول config + UI تنظیم | Not Started |

---
## 9. Frontend / UI Status
| بخش | وضعیت | توضیح |
|------|-------|-------|
| Allocation Modal | P | عملکرد پایه جزئی; نیاز validation edge (sum overflow) + states disabled loading |
| Guard Metrics Panel | P | نمایش counters + recent + summaries + alerts; فاقد نمودار sparkline / drilldown |
| Financial Summary Panel | P | refactor انجام؛ تست snapshot تمام سناریوها N |
| Portal Theming | N | inline styles باقی؛ نیاز design tokens |
| Admin Dashboard KPIs | N | بدون کارت KPI debt drift / allocation latency |
| Usage Line Drilldown UI | N | جدول / accordion lines طراحی نشده |
| A11y Improvements | N | aria-label, focus ring, contrast refactor |

---
## 10. Accessibility & Theming (E-B3 Scope)
Targets: Lighthouse A11y ≥85, Keyboard Traversal کاملاً بدون تله، رنگ: primary, neutral, success, warning, danger. استخراج کامپوننت: FinancialSummaryCard, InvoiceAccordion, ActionButtonGroup.

Tasks Pending:
1. ایجاد لایه theme tokens (tailwind config extension)
2. افزوده شدن aria-label به دکمه‌های آیکونی
3. Focus outline سفارشی (outline-offset + ring)
4. تست دستی screen reader (NVDA/VoiceOver script checklist)
5. کاهش inline gradient styles → کلاس‌های util

---
## 11. KPI Dashboard (E-B5 Stage 3 Remaining)
Scope: نمودار debt_drift_ppm (24h, 7d), نرخ allocation per hour، partial_allocation_ratio، overpayment_buffer، latency percentiles.
Components Needed:
1. MetricsFetch Hook (polling/interval)
2. Sparkline + Bar components (lightweight SVG)
3. Drilldown modal برای لیست رخدادهای critical اخیر
4. Export JSON/CSV endpoint `/api/allocations/guard-metrics/export?window=24h`
5. Rate Computation backend (group by hourly bucket)

---
## 12. Usage Line Visibility (E-B6 Implementation) ✅ COMPLETED (29 Sep 2025)
**API Backend**: ✅ تکمیل شده
- ✅ Endpoint `/api/allocations/lines?representative=X&limit=200&filter=synthetic|manual|auto`
- ✅ Endpoint `/api/allocations/lines/payment/:paymentId`  
- ✅ Endpoint `/api/allocations/lines/invoice/:invoiceId`
- ✅ Feature flag `usage_line_visibility` فعال
- ✅ Response structure شامل summary، filters، metadata
- ✅ تست‌های ساختاری و validation
- ✅ SQL joins بهینه payment_allocations ⟷ payments ⟷ invoices

**UI Frontend**: 🚧 In Progress  
- 🔲 DrilldownModal component
- 🔲 UsageLineTable با sorting و pagination
- 🔲 FilterControls برای synthetic/manual/auto
- 🔲 Integration در Allocation Modal

**Audit Value**: پاسخ کامل به «چرا remainder تغییر کرد؟» با شفافیت خطوط تخصیص

---
## 13. Test Coverage Matrix
| Suite | وضعیت | توضیح |
|-------|-------|-------|
| Invariants I1-I5 | D | تست شده (green) |
| Invariants I6-I10 | P | برخی assertions runtime فقط؛ نیاز unit جدا |
| Guard Metrics Persistence | D | spec پوشش flush و summary |
| Guard Metrics Alerts | D | critical threshold test |
| Allocation Partial Scenarios | P | happy path؛ edge (over-sum, rounding) N |
| Reconciliation Repair Plan | N | وجود ندارد |
| Financial Summary Snapshot | N | تولید نشده |
| Accessibility Axe Tests | N | افزودنی در فاز B3 |
| Performance Bench (allocation latency) | N | اسکریپت k6/autocannon N |
| Python Harness Consistency | N | فاز D |

---
## 14. Active Risks & Mitigations
| Risk | وضعیت | توضیح | اقدام کاهش |
|------|--------|-------|-------------|
| R2 Ledger Drift Post-Switch | Active Watch | هنوز switch کامل نشده | نگهداشت مقایسه سه‌گانه debt endpoint |
| R3 Over-allocation Race | Mitigated Partial | Guards warn/enforce بدون قفل سراسری | افزودن row-level locking در allocate transaction |
| R5 UX Complexity Partial Alloc | Present | Modal جریان edge states | Add inline helper + disabled states + validation |
| R8 Log Growth (Future) | Pending | partition activity_logs N | طراحی partition قبل فاز C |
| R10 Test Maintenance | Emerging | افزایش suites پخش | لایه‌بندی test utils مشترک |
| KPI Noise (False Positives) | New | thresholds ثابت | Dynamic threshold config + smoothing window |

---
## 15. Proposed Next Slices (Decision Needed)
Option A (E-B3 Start): تمرکز A11y/Theming → پایه UI پایدار برای KPI Charts.
Option B (E-B5 Stage 3): تکمیل Visualization → ارزش مانیتورینگ سریع.
Option C (E-B6 Kickoff): شفافیت تخصیص (Usage Lines) → حمایت رفع ابهام مالی.

Dependency Insight: Visualization (B5S3) مفیدتر بعد از A11y پایه (کاهش بازکار)؛ Usage Lines (B6) مستقل‌تر و ارزش Audit فوری دارد.

Recommendation (Balanced): اجرا B3 (Refactor A11y Core) → سپس B6 (Usage Lines) → بعد B5 Stage 3 (Charts) برای جلوگیری از دوباره‌کاری UI.

---
## 16. Traceability Mapping (نمونه)
| ID | منبع | مقصد | توضیح |
|----|------|-------|-------|
| Schema-1 | plan.md §2.3 E-A1 | Migration CAST shadow | ستون amount_dec و dry-run |
| RootCause-21 | plan.md §2.3 E-A2 | Ledger Dual-write | ایجاد payment_allocations |
| DataModel-8 | memory.md §7 | Balance Cache + Ledger | همگرایی منبع حقیقت |
| Scalability-1.8 | plan.md §1.8 | Indexing A4 | ایندکس ترکیبی و کاهش full scan |
| KPI-DebtDrift | plan.md §3.2 E-B5 | Guard Metrics + Drift | پایه KPI قبل Visualization |
| D15 | memory.md Decisions | Ingestion Determinism | seq NDJSON events |
| D17 | memory.md Decisions | Financial Summary Refactor | Panel استخراج شده |
| D19 | memory.md Decisions | Guard Metrics Persistence | جدول و flush queue |
| D20 | memory.md Decisions | Alert Classification | thresholds mapping |
| D21 | memory.md Decisions | Multi-Window Summary | 1h/24h summaries پایه |
| D22 | memory.md Decisions | Defer Visualization | تمرکز روی A11y پیش از Charts |
| D23 | memory.md Decisions | Hard-coded Thresholds Temp | جایگزینی آینده با threshold_config |

---
## 17. ضمائم
### 17.1 Invariants (Current Focus)
I1..I5 سبز، I6..I10 نیاز formal test. افزودن I11 Cross-period Integrity بعد partition.

### 17.2 Pseudo-Code Allocation (Latest)
همان نسخه قبلی با افزودن «Row Lock Strategy» (TODO) و «Guard Record Emission».

### 17.3 Backup Runbook (Planned Phase C)
گام‌ها بدون تغییر؛ نیاز اسکریپت cron + integrity script.

---
پایان سند – این فایل اکنون «Check-list زنده» است. لطفاً قبل از هر تغییر ماژور به‌روزرسانی و Diff آنثبت گردد.

---
## 18. Delta Progress Alignment (Auto Added)
همگام‌سازی با plan.md §15.1 و memory.md §16 نشان می‌دهد هیچ divergence فعلی در درصد پیشرفت اپیک‌ها وجود ندارد. هر گونه تغییر آینده باید همزمان در سه فایل اعمال شود.

| Epic (Phase B) | Code | Review Status | plan.md % | memory.md % | Gap |
|----------------|------|---------------|-----------|-------------|-----|
| Ledger Read Switch | E-B1 | Done | 100 | 100 | 0 |
| Allocation UI & Partial | E-B2 | Partial | 60 | 60 | 0 |
| Portal Theming & A11y | E-B3 | Partial (Init) | 0.15 | 0.15 | 0 |
| Active Reconciliation | E-B4 | Partial | 40 | 40 | 0 |
| Debt KPI Surface (S1-2) | E-B5 | Partial | 60 | 60 | 0 |
| Usage Line Visibility | E-B6 | Completed | 5 | 5 | 100 |
| Financial Summary Consolidation | E-B7 | Partial | 50 | 50 | 0 |
| Metrics Refresh Optimization | E-B8 | Not Started | 0 | 0 | 0 |

Conclusion: Sync Integrity = PASS.

## 19. Remaining Action Index (Phase B Focus)
Ordered for minimal rework & risk mitigation.

1. (B3) Establish Theme Tokens, aria labels sweep, contrast baseline audit.
2. (B6) Implement /api/allocations/lines + pagination & filter + UI drilldown skeleton.
3. (B5 Stage 3) Hourly rollup job + visualization components (sparkline, bar) + export endpoint.
4. (B2) Edge validation: multi-invoice partial sum overflow; add allocation-partial-edge.spec.ts.
5. (B4) Create reconciliation_actions table + repair plan generator + fail-first test.
6. (B7) Add financial-summary-snapshot.spec.ts ensuring stable JSON output.
7. (Cross) Introduce row-level locking in allocate transaction path (SELECT ... FOR UPDATE).
8. (Cross) Extend guard_metrics_events schema with severity field (for dynamic thresholds in Phase C).
9. (B8) Implement refresh invalidate hook + performance benchmark harness.
10. (Test Infra) invariants-extended.spec.ts (I6..I10 formal).

Progress Guardrails: هیچ اقدام فوق دامنه جدید خارج از نقشه راه معرفی نمی‌کند؛ صرفاً تکمیل اقلام Partial.

