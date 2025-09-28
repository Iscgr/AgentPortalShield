/**
 * تعاریف مشترک schema بین سرور و کلاینت
 */

// مدل‌های پایه برای داده‌ها
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'agent' | 'user';
  permissions?: string[];
  isActive?: boolean;
}

export interface Invoice {
  id: string;
  title: string;
  amount: number;
  status: 'draft' | 'pending' | 'paid' | 'canceled';
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  // سایر فیلدهای مورد نیاز
}

export interface Representative {
  id: string;
  name: string;
  code: string;
  panelUsername?: string;
  isActive?: boolean;
}

// نوع‌های کمکی
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export type PaginatedResult<T = any> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// این فایل می‌تواند بر اساس نیاز پروژه گسترش یابد
