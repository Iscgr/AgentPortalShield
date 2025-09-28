/**
 * کامپوننت Card اولیه
 */
import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './card';
