/**
 * کامپوننت Separator اولیه
 */
import React from 'react';

export interface SeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

export function Separator({ children, className = '' }: SeparatorProps) {
  return (
    <div className={`separator ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './separator';
