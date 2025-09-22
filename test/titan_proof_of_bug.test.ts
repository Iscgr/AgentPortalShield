
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../server/db.js';
import { payments, invoices, representatives } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { EnhancedPaymentAllocationEngine } from '../server/services/enhanced-payment-allocation-engine.js';

describe('TITAN-O Payment Allocation Bug Proof', () => {
  let testRepId: number;
  let testInvoiceId: number;
  let testPaymentId: number;

  beforeEach(async () => {
    // Create test representative
    const [rep] = await db.insert(representatives).values({
      code: 'TEST_REP_TITAN',
      name: 'Test Representative',
      panelUsername: 'test_panel',
      publicId: 'test_public_id_titan',
      isActive: true
    }).returning();
    testRepId = rep.id;

    // Create test invoice
    const [invoice] = await db.insert(invoices).values({
      invoiceNumber: 'INV_TEST_TITAN_001',
      representativeId: testRepId,
      amount: '1000',
      issueDate: '1404/6/31',
      status: 'unpaid'
    }).returning();
    testInvoiceId = invoice.id;

    // Create test payment
    const [payment] = await db.insert(payments).values({
      representativeId: testRepId,
      amount: '500',
      paymentDate: '1404/6/31',
      description: 'Test payment for allocation',
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

  it('TITAN-O BUG PROOF: Payment allocation should maintain isAllocated=true but currently fails', async () => {
    // Execute manual allocation
    const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
      testPaymentId,
      testInvoiceId,
      500,
      'TITAN_TEST_USER',
      'Proof of bug test'
    );

    expect(result.success).toBe(true);

    // Verify original payment is marked as allocated
    const [updatedPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, testPaymentId));

    // THIS SHOULD PASS BUT CURRENTLY FAILS - PROOF OF BUG
    expect(updatedPayment.isAllocated).toBe(true);
    expect(updatedPayment.invoiceId).toBe(testInvoiceId);
    
    // Verify invoice status is updated
    const [updatedInvoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.id, testInvoiceId));
    
    expect(updatedInvoice.status).toBe('partial');
  });
});
