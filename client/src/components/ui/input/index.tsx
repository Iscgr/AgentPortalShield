/**
 * کامپوننت Input اولیه
 */
import React from 'react';

export interface InputProps {
  children?: React.ReactNode;
  className?: string;
}

export function Input({ children, className = '' }: InputProps) {
  return (
    <div className={`input ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './input';
