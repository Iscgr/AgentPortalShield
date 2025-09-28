/**
 * کامپوننت Label اولیه
 */
import React from 'react';

export interface LabelProps {
  children?: React.ReactNode;
  className?: string;
}

export function Label({ children, className = '' }: LabelProps) {
  return (
    <div className={`label ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './label';
