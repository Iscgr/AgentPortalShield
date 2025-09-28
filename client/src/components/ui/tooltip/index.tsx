/**
 * کامپوننت Tooltip اولیه
 */
import React from 'react';

export interface TooltipProps {
  children?: React.ReactNode;
  className?: string;
}

export function Tooltip({ children, className = '' }: TooltipProps) {
  return (
    <div className={`tooltip ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './tooltip';
