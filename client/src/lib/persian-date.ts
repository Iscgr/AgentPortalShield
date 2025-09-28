/**
 * ابزارهای کار با تاریخ شمسی و فرمت‌های فارسی
 */

/**
 * تبدیل تاریخ میلادی به شمسی
 */
export function formatPersianDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // تبدیل به تاریخ شمسی
  // برای استفاده واقعی، می‌توانید از کتابخانه‌هایی مانند moment-jalaali استفاده کنید
  return d.toLocaleDateString('fa-IR');
}

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, x => persianDigits[parseInt(x)]);
}

/**
 * فرمت کردن اعداد به عنوان مبلغ (با جداکننده هزارگان)
 */
export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '۰';
  
  // فرمت کردن عدد با جداکننده هزارگان
  const formattedAmount = numericAmount.toLocaleString('fa-IR');
  
  return formattedAmount;
}

/**
 * تبدیل تاریخ شمسی به میلادی
 */
export function parsePersianDate(persianDateStr: string): Date | null {
  // پیاده‌سازی ساده
  // برای استفاده واقعی، می‌توانید از کتابخانه‌هایی مانند moment-jalaali استفاده کنید
  try {
    // این تنها یک مقدار ساختگی است
    return new Date();
  } catch (e) {
    console.error('Error parsing Persian date:', e);
    return null;
  }
}

/**
 * تبدیل اعداد فارسی به انگلیسی
 */
export function toEnglishDigits(persianStr: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  return persianStr.replace(/[۰-۹]/g, char => {
    const index = persianDigits.indexOf(char);
    return index !== -1 ? englishDigits[index] : char;
  });
}

/**
 * دریافت تاریخ فعلی شمسی
 */
export function getCurrentPersianDate(): string {
  return formatPersianDate(new Date());
}

/**
 * بررسی اینکه آیا تاریخ سررسید گذشته است
 */
export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  return due < now;
}
