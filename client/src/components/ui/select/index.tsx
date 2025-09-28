/**
 * کامپوننت Select اولیه
 */
import React from 'react';

export interface SelectProps {
  children?: React.ReactNode;
  className?: string;
}

export function Select({ children, className = '' }: SelectProps) {
  return (
    <div className={`select ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './select';
