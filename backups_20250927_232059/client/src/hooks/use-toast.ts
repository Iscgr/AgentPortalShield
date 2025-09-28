/**
 * هوک برای نمایش پیغام‌های toast
 */
import { useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { message, type, id };
    
    setToasts((prev) => [...prev, newToast]);
    
    // حذف خودکار پیغام بعد از مدتی
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    
    return id;
  };
  
  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  // برای سازگاری با کد قبلی که از toast به جای toasts استفاده می‌کند
  const toast = toasts.length > 0 ? toasts[toasts.length - 1] : null;
  
  return {
    toast,  // برای سازگاری با کد قبلی
    toasts,
    showToast,
    hideToast
  };
}
