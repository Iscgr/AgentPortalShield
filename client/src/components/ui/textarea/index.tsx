/**
 * کامپوننت Textarea اولیه
 */
import React from 'react';

export interface TextareaProps {
  children?: React.ReactNode;
  className?: string;
}

export function Textarea({ children, className = '' }: TextareaProps) {
  return (
    <div className={`textarea ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './textarea';
