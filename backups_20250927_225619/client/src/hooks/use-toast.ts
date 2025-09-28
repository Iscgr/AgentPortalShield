/**
 * هوک برای نمایش پیغام‌ها
 */
import { useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  message: string;
  type: ToastType;
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast = { message, type, id };
    
    setToasts((prev) => [...prev, toast]);
    
    // حذف خودکار پیغام بعد از مدتی
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    
    return id;
  };
  
  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  return { toasts, showToast, hideToast };
}
