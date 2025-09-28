/**
 * ابزارهای کار با تاریخ شمسی
 */

export function formatPersianDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // تبدیل به تاریخ شمسی - این یک پیاده‌سازی ساده است
  // برای استفاده واقعی، می‌توانید از کتابخانه‌هایی مانند moment-jalaali استفاده کنید
  return d.toLocaleDateString('fa-IR');
}

export function parsePersianDate(dateStr: string): Date {
  // پیاده‌سازی پارس تاریخ شمسی
  // این یک پیاده‌سازی mockup است
  return new Date();
}
