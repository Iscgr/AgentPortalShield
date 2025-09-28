/**
 * کامپوننت Badge اولیه
 */
import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <div className={`badge ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './badge';
