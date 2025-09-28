export function toPersianDigits(str: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str.toString();
  for (let i = 0; i < englishDigits.length; i++) {
    result = result.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
  }
  return result;
}

export function toEnglishDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  for (let i = 0; i < persianDigits.length; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  return result;
}

export function normalizeDateFormat(dateStr: string): string {
  // Convert Persian digits to English and ensure consistent format
  const englishDate = toEnglishDigits(dateStr);
  
  // Handle different date formats
  if (englishDate.includes('/')) {
    const parts = englishDate.split('/');
    if (parts.length === 3) {
      // Ensure YYYY/MM/DD format with zero-padding
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
  }
  
  return englishDate;
}

export function getCurrentPersianDate(): string {
  const now = new Date();
  const persianDate = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'persian'
  }).format(now);
  
  // Convert to YYYY/MM/DD format with Persian digits
  const parts = persianDate.split('/');
  const formattedDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
  return toPersianDigits(formattedDate);
}

export function formatPersianDate(dateString: string): string {
  return toPersianDigits(dateString);
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '۰';
  
  const formatted = num.toLocaleString('fa-IR');
  return toPersianDigits(formatted);
}

export function getPersianMonthName(monthNumber: number): string {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
    'مرداد', 'شهریور', 'مهر', 'آبان',
    'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[monthNumber - 1] || '';
}

export function parsePersianDate(persianDate: string): { year: number, month: number, day: number } {
  const englishDate = toEnglishDigits(persianDate);
  const parts = englishDate.split('/');
  
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]),
    day: parseInt(parts[2])
  };
}

export function comparePersianDates(date1: string, date2: string): number {
  const d1 = parsePersianDate(date1);
  const d2 = parsePersianDate(date2);
  
  if (d1.year !== d2.year) return d1.year - d2.year;
  if (d1.month !== d2.month) return d1.month - d2.month;
  return d1.day - d2.day;
}

export function isOverdue(dueDate: string): boolean {
  const currentDate = getCurrentPersianDate();
  return comparePersianDates(dueDate, currentDate) < 0;
}
