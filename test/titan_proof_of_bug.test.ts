
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../server/db.js';
import { payments, invoices, representatives } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { EnhancedPaymentAllocationEngine } from '../server/services/enhanced-payment-allocation-engine.js';

/**
 * TITAN PROTOCOL - PROOF OF BUG TEST
 * 
 * هدف: اثبات وجود باگ در payment allocation
 * وضعیت مورد انتظار: FAIL (تا زمان اصلاح باگ)
 * 
 * این تست باید شکست بخورد تا اثبات کند:
 * 1. فیلد isAllocated بروزرسانی نمی‌شود
 * 2. فیلد invoiceId تنظیم نمی‌شود
 * 3. مشکل در manual و auto allocation وجود دارد
 */
describe('TITAN PROOF-OF-BUG: Payment Allocation Critical Failure', () => {
  let testRepId: number;
  let testInvoiceId: number;
  let testPaymentId: number;

  beforeEach(async () => {
    // ایجاد داده‌های تست
    const [rep] = await db.insert(representatives).values({
      code: 'TITAN_TEST_REP',
      name: 'تست نماینده تایتان',
      panelUsername: 'titan_test',
      publicId: 'titan_test_public',
      isActive: true
    }).returning();
    testRepId = rep.id;

    const [invoice] = await db.insert(invoices).values({
      invoiceNumber: 'TITAN_TEST_INV_001',
      representativeId: testRepId,
      amount: '1000000',
      issueDate: '1403/01/01',
      status: 'unpaid'
    }).returning();
    testInvoiceId = invoice.id;

    const [payment] = await db.insert(payments).values({
      representativeId: testRepId,
      amount: '500000',
      paymentDate: '1403/01/02',
      description: 'تست پرداخت تایتان',
      isAllocated: false  // صراحتاً false تنظیم می‌کنیم
    }).returning();
    testPaymentId = payment.id;

    // اثبات وضعیت اولیه
    console.log('🔍 TITAN: Initial payment state:', {
      id: payment.id,
      isAllocated: payment.isAllocated,
      invoiceId: payment.invoiceId
    });
  });

  afterEach(async () => {
    await db.delete(payments).where(eq(payments.representativeId, testRepId));
    await db.delete(invoices).where(eq(invoices.representativeId, testRepId));
    await db.delete(representatives).where(eq(representatives.id, testRepId));
  });

  /**
   * تست اثبات باگ #1: Manual Allocation
   * این تست باید FAIL شود
   */
  it('PROOF-OF-BUG: Manual allocation fails to update isAllocated field', async () => {
    console.log('🚨 TITAN PROOF-OF-BUG TEST: Manual Allocation');
    
    // اجرای allocation
    const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
      testPaymentId,
      testInvoiceId,
      500000,
      'TITAN_TEST_USER',
      'اثبات باگ تایتان'
    );

    console.log('📊 TITAN: Allocation result:', result);

    // بررسی پایگاه داده
    const [updatedPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, testPaymentId));

    console.log('📊 TITAN: Payment after allocation:', {
      id: updatedPayment.id,
      isAllocated: updatedPayment.isAllocated,
      invoiceId: updatedPayment.invoiceId
    });

    // این assertion‌ها باید FAIL شوند اگر باگ وجود داشته باشد
    expect(result.success).toBe(true);
    expect(updatedPayment.isAllocated).toBe(true);  // احتمالاً FAIL می‌شود
    expect(updatedPayment.invoiceId).toBe(testInvoiceId);  // احتمالاً FAIL می‌شود
    
    console.log('✅ TITAN: If this passes, bug is FIXED!');
  });

  /**
   * تست اثبات باگ #2: Auto Allocation  
   * این تست باید FAIL شود
   */
  it('PROOF-OF-BUG: Auto allocation fails to update isAllocated field', async () => {
    console.log('🚨 TITAN PROOF-OF-BUG TEST: Auto Allocation');
    
    const result = await EnhancedPaymentAllocationEngine.autoAllocatePayment(testPaymentId);
    
    console.log('📊 TITAN: Auto allocation result:', result);

    const [updatedPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, testPaymentId));

    console.log('📊 TITAN: Payment after auto allocation:', {
      id: updatedPayment.id,
      isAllocated: updatedPayment.isAllocated,
      invoiceId: updatedPayment.invoiceId
    });

    // این assertion‌ها باید FAIL شوند
    expect(result.success).toBe(true);
    expect(updatedPayment.isAllocated).toBe(true);  // احتمالاً FAIL می‌شود
    expect(updatedPayment.invoiceId).toBe(testInvoiceId);  // احتمالاً FAIL می‌شود
    
    console.log('✅ TITAN: If this passes, bug is FIXED!');
  });

  /**
   * تست کنترلی: اثبات اینکه allocation اصلاً اجرا می‌شود
   */
  it('CONTROL TEST: Allocation engine responds (should pass)', async () => {
    console.log('🔍 TITAN CONTROL: Testing allocation engine response');
    
    const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
      testPaymentId,
      testInvoiceId,
      500000,
      'TITAN_CONTROL_USER',
      'تست کنترل'
    );

    // این تست باید pass شود تا اثبات کند engine کار می‌کند
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    
    console.log('✅ TITAN CONTROL: Engine responds correctly');
  });
});
