
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../server/db.js';
import { payments, invoices, representatives } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { EnhancedPaymentAllocationEngine } from '../server/services/enhanced-payment-allocation-engine.js';

describe('SYNAPSE Payment Allocation Bug Validation', () => {
  let testRepId: number;
  let testInvoiceId: number;
  let testPaymentId: number;

  beforeEach(async () => {
    // Create test representative
    const [rep] = await db.insert(representatives).values({
      code: 'TEST_REP',
      name: 'Test Representative',
      panelUsername: 'test_panel',
      publicId: 'test_public_id',
      isActive: true
    }).returning();
    testRepId = rep.id;

    // Create test invoice
    const [invoice] = await db.insert(invoices).values({
      invoiceNumber: 'TEST_INV_001',
      representativeId: testRepId,
      amount: '1000',
      issueDate: '1403/01/01',
      status: 'unpaid'
    }).returning();
    testInvoiceId = invoice.id;

    // Create test payment
    const [payment] = await db.insert(payments).values({
      representativeId: testRepId,
      amount: '500',
      paymentDate: '1403/01/02',
      description: 'Test payment',
      isAllocated: false
    }).returning();
    testPaymentId = payment.id;
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(payments).where(eq(payments.representativeId, testRepId));
    await db.delete(invoices).where(eq(invoices.representativeId, testRepId));
    await db.delete(representatives).where(eq(representatives.id, testRepId));
  });

  it('should maintain isAllocated=true after manual allocation', async () => {
    // Execute manual allocation
    const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
      testPaymentId,
      testInvoiceId,
      500,
      'TEST_USER',
      'Test allocation'
    );

    expect(result.success).toBe(true);

    // Verify original payment is marked as allocated
    const [updatedPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, testPaymentId));

    // THIS SHOULD PASS BUT CURRENTLY FAILS
    expect(updatedPayment.isAllocated).toBe(true);
    expect(updatedPayment.invoiceId).toBe(testInvoiceId);
  });

  it('should maintain isAllocated=true after auto allocation', async () => {
    // Execute auto allocation
    const result = await EnhancedPaymentAllocationEngine.autoAllocatePayment(testPaymentId);

    expect(result.success).toBe(true);

    // Verify original payment is marked as allocated
    const [updatedPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, testPaymentId));

    // THIS SHOULD PASS BUT CURRENTLY FAILS
    expect(updatedPayment.isAllocated).toBe(true);
    expect(updatedPayment.invoiceId).toBe(testInvoiceId);
  });
});
