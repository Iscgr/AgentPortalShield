/**
 * کامپوننت Table اولیه
 */
import React from 'react';

export interface TableProps {
  children?: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`table ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './table';
