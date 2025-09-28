/**
 * Interface های مورد نیاز برای تایپ‌های موجود در routes.ts
 * این فایل برای رفع خطاهای TypeScript ایجاد شده است
 */

// Interface برای رفع خطاهای مربوط به نماینده
export interface RepresentativeData {
  representativeId: string;
  name?: string;
  status?: string;
  usageData?: any;
}

// Interface برای رفع خطاهای مربوط به مبلغ و تاریخ
export interface FinancialData {
  amount: number;
  issueDate?: Date | string;
  paymentDate?: Date | string;
}

// Interface برای رفع خطاهای مربوط به بچ
export interface BatchData {
  batchCode: string;
  periodStart: Date | string;
  periodEnd?: Date | string;
}

// Interface برای رفع خطاهای مربوط به validatedData در ایجاد فاکتور
export interface ValidatedInvoiceData {
  representativeId: string;
  status?: string;
  amount: number;
  issueDate: string | Date;
  usageData?: {
    type: string;
    description: string;
    createdBy: string;
    createdAt: string;
  };
}

// Interface برای رفع خطاهای مربوط به validatedData در ایجاد بچ فاکتور
export interface ValidatedInvoiceBatchData {
  batchCode?: string;
  periodStart: string | Date;
  periodEnd?: string | Date;
  status?: string;
  description?: string;
}
