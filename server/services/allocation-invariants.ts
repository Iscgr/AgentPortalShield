/**
 * Allocation Invariants Validator (Slice 2)
 * پوشش I1, I2, I6, I7 اولیه در سطح محاسبات ورودی پیش از DB.
 */

export interface AllocationLineInput {
  invoiceId: number;
  amount: number;
  idempotencyKey?: string;
}

export interface PaymentContextSnapshot {
  paymentId: number;
  paymentAmount: number; // مبلغ کل پرداخت
  alreadyAllocatedPayment?: number; // Σ allocations قبلی پرداخت (در صورت نیاز)
}

export interface InvoiceSnapshot {
  invoiceId: number;
  invoiceAmount: number;
  alreadyAllocatedInvoice: number; // Σ allocations قبلی فاکتور
}

export interface AllocationValidationResult {
  ok: boolean;
  violations: string[];
  totalRequested: number;
  paymentRemaining?: number;
  perInvoiceRemaining?: Record<number, number>;
}

/**
 * محاسبه و اعتبارسنجی اینورینت‌ها خارج از DB برای fail fast.
 */
export function validateAllocations(
  payment: PaymentContextSnapshot,
  invoices: InvoiceSnapshot[],
  lines: AllocationLineInput[],
  { tolerance = 1e-6 }: { tolerance?: number } = {}
): AllocationValidationResult {
  const violations: string[] = [];
  if (!lines.length) return { ok: false, violations: ['EMPTY_LINES'], totalRequested: 0 };

  const totalRequested = lines.reduce((s, l) => s + (l.amount || 0), 0);
  if (totalRequested <= 0) violations.push('NON_POSITIVE_TOTAL');

  const paymentRemainingBase = payment.paymentAmount - (payment.alreadyAllocatedPayment || 0);
  if (totalRequested - paymentRemainingBase > tolerance) {
    violations.push(`PAYMENT_OVERFLOW requested=${totalRequested} remaining=${paymentRemainingBase}`);
  }

  const invoiceMap: Record<number, InvoiceSnapshot> = {};
  for (const inv of invoices) invoiceMap[inv.invoiceId] = inv;

  const perInvoiceRemaining: Record<number, number> = {};
  for (const line of lines) {
    if (!invoiceMap[line.invoiceId]) {
      violations.push(`INVOICE_NOT_FOUND invoice=${line.invoiceId}`);
      continue;
    }
    if (!(line.amount > 0)) {
      violations.push(`NON_POSITIVE_AMOUNT invoice=${line.invoiceId}`);
      continue;
    }
    const snap = invoiceMap[line.invoiceId];
    const remaining = snap.invoiceAmount - snap.alreadyAllocatedInvoice;
    perInvoiceRemaining[line.invoiceId] = remaining;
    if (line.amount - remaining > tolerance) {
      violations.push(`INVOICE_OVERFLOW invoice=${line.invoiceId} amount=${line.amount} remaining=${remaining}`);
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    totalRequested,
    paymentRemaining: paymentRemainingBase,
    perInvoiceRemaining
  };
}
