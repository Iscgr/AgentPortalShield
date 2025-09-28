/**
 * Interface های مورد نیاز برای تایپ‌های موجود در storage.ts
 * این فایل برای رفع خطاهای TypeScript ایجاد شده است
 */

// Interface برای رفع خطاهای مربوط به ویرایش فاکتور
export interface InvoiceEditRecord {
  invoiceId: string;
  editedBy: string;
  editType: string;
  originalAmount?: number;
  editedAmount?: number;
  timestamp?: Date | string;
}

// Interface برای رفع خطاهای مربوط به تراکنش
export interface TransactionRecord {
  transactionId: string;
  amount?: number;
  timestamp?: Date | string;
  status?: string;
}

// Interface برای رفع خطاهای مربوط به پیکربندی
export interface ConfigRecord {
  configName: string;
  configCategory: string;
  lastModifiedBy: string;
  value?: any;
  enabled?: boolean;
}
