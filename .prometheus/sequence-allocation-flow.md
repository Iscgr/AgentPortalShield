# Sequence Diagram: Payment Allocation (Phase A Shadow Mode)

```mermaid
sequenceDiagram
    autonumber
    participant UI as Admin UI
    participant API as Express Route
    participant SVC as AllocationService (Wrapper)
    participant DB as PostgreSQL
    participant LEDGER as payment_allocations
    participant CACHE as invoice_balance_cache

    Note over UI: createPayment (existing flow)
    UI->>API: POST /payments {repId, invoiceId?, amount(text)}
    API->>DB: INSERT payments (amount TEXT)
    API-->>UI: 201 Created (paymentId)

    Note over UI: allocate (pre-partial, full allocation semantics)
    UI->>API: POST /payments/:id/allocate {invoiceId}
    API->>SVC: allocate(paymentId, invoiceId)
    activate SVC
    SVC->>DB: SELECT payment, invoice FOR UPDATE
    alt dual_write flag == shadow
        SVC->>LEDGER: INSERT payment_allocations (allocated_amount = invoice.amount or payment.amount)
        SVC->>DB: (legacy) UPDATE payments SET is_allocated=true, invoice_id=...
    else dual_write flag == enforce
        SVC->>LEDGER: INSERT payment_allocations
        SVC->>CACHE: UPDATE invoice_balance_cache (allocated_total += x, remaining = amount - allocated_total)
        SVC->>DB: UPDATE payments SET is_allocated=true
    end
    SVC-->>API: AllocationResult {legacyStatus, ledgerRecordId}
    deactivate SVC
    API-->>UI: 200 OK {status}

    Note over CACHE: In shadow mode not yet authoritative.
    Note over LEDGER: synthetic=false for new allocations; synthetic=true for backfill.
```

## Notes
- Shadow mode: cache not yet materialized; only ledger write side-effect.
- Enforce mode: cache updated transactionally after ledger insert.
- Backfill process (separate job) performs INSERT with method='backfill' synthetic=true.
