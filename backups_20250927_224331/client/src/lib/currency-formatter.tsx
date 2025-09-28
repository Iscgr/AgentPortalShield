// Persian Currency Formatter Utility
export const CurrencyFormatter = new Intl.NumberFormat('fa-IR', {
  style: 'currency',
  currency: 'IRR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Alternative formatting functions
export const formatCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '0 ریال';
  return CurrencyFormatter.format(numericAmount);
};

export const formatNumber = (num: number | string): string => {
  const numericAmount = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericAmount)) return '0';
  return new Intl.NumberFormat('fa-IR').format(numericAmount);
};