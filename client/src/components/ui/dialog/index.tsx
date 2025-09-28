/**
 * کامپوننت Dialog اولیه
 */
import React from 'react';

export interface DialogProps {
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({ children, className = '' }: DialogProps) {
  return (
    <div className={`dialog ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './dialog';
