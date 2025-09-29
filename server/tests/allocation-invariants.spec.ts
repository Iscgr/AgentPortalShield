import { validateAllocations } from '../services/allocation-invariants.js';
import { strict as assert } from 'assert';

// ساده: تست فانکشن pure بدون نیاز به DB

function testSuccessScenario() {
  const result = validateAllocations(
    { paymentId: 1, paymentAmount: 100, alreadyAllocatedPayment: 0 },
    [
      { invoiceId: 10, invoiceAmount: 80, alreadyAllocatedInvoice: 0 },
      { invoiceId: 11, invoiceAmount: 50, alreadyAllocatedInvoice: 0 }
    ],
    [
      { invoiceId: 10, amount: 60 },
      { invoiceId: 11, amount: 30 }
    ]
  );
  assert.equal(result.ok, true, 'Expected validation ok=true');
  assert.equal(result.totalRequested, 90);
}

function testPaymentOverflow() {
  const result = validateAllocations(
    { paymentId: 2, paymentAmount: 50, alreadyAllocatedPayment: 0 },
    [ { invoiceId: 20, invoiceAmount: 200, alreadyAllocatedInvoice: 0 } ],
    [ { invoiceId: 20, amount: 60 } ]
  );
  assert.equal(result.ok, false, 'Should fail due to payment overflow');
  assert(result.violations.some(v => v.startsWith('PAYMENT_OVERFLOW')), 'Missing PAYMENT_OVERFLOW violation');
}

function testInvoiceOverflow() {
  const result = validateAllocations(
    { paymentId: 3, paymentAmount: 500, alreadyAllocatedPayment: 0 },
    [ { invoiceId: 30, invoiceAmount: 40, alreadyAllocatedInvoice: 0 } ],
    [ { invoiceId: 30, amount: 45 } ]
  );
  assert.equal(result.ok, false, 'Should fail due to invoice overflow');
  assert(result.violations.some(v => v.startsWith('INVOICE_OVERFLOW')), 'Missing INVOICE_OVERFLOW violation');
}

function testMixedViolations() {
  const result = validateAllocations(
    { paymentId: 4, paymentAmount: 10, alreadyAllocatedPayment: 0 },
    [ { invoiceId: 40, invoiceAmount: 5, alreadyAllocatedInvoice: 0 }, { invoiceId: 9999, invoiceAmount: 7, alreadyAllocatedInvoice: 0 } ],
    [ { invoiceId: 40, amount: 6 }, { invoiceId: 9999, amount: 0 } ]
  );
  assert.equal(result.ok, false);
  const expect = ['INVOICE_OVERFLOW','NON_POSITIVE_AMOUNT'];
  expect.forEach(sig => {
    const matched = result.violations.some(v => v.includes(sig));
    assert(matched, `Expected violation ${sig}`);
  });
}

// Execute tests
try {
  testSuccessScenario();
  testPaymentOverflow();
  testInvoiceOverflow();
  testMixedViolations();
  console.log('allocation-invariants.spec.ts PASS');
} catch (e) {
  console.error('allocation-invariants.spec.ts FAIL', e);
  process.exit(1);
}
