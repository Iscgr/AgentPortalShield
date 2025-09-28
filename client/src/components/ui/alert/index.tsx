/**
 * کامپوننت Alert اولیه
 */
import React from 'react';

export interface AlertProps {
  children?: React.ReactNode;
  className?: string;
}

export function Alert({ children, className = '' }: AlertProps) {
  return (
    <div className={`alert ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './alert';
