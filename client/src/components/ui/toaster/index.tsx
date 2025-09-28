/**
 * کامپوننت Toaster اولیه
 */
import React from 'react';

export interface ToasterProps {
  children?: React.ReactNode;
  className?: string;
}

export function Toaster({ children, className = '' }: ToasterProps) {
  return (
    <div className={`toaster ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './toaster';
