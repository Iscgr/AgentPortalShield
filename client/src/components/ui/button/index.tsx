/**
 * کامپوننت Button اولیه
 */
import React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function Button({ children, className = '' }: ButtonProps) {
  return (
    <div className={`button ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './button';
