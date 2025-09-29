import { createHash } from 'crypto';

/**
 * stableIdempotencyKey
 * ورودی: paymentId, invoiceId, amount (عدد یا رشته قابل تبدیل به عدد)
 * خروجی: کلید پایدار با فرمت sha256:p:<hash>
 * هدف: اجتناب از برخورد و قابل تکرار بودن در retry ها بدون تکیه به Date.now()
 */
export function stableIdempotencyKey(paymentId: number, invoiceId: number, amount: number | string): string {
  const amt = typeof amount === 'number' ? amount : Number(amount);
  const base = `${paymentId}|${invoiceId}|${amt.toFixed(6)}`; // نرمال‌سازی تا 6 رقم اعشار برای ثبات
  const h = createHash('sha256').update(base).digest('hex');
  return `sha256:p:${h.slice(0,32)}`; // کوتاه‌سازی برای خوانایی، 128bit اول کافی است برای برخورد بسیار کم
}
