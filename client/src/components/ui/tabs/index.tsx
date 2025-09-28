/**
 * کامپوننت Tabs اولیه
 */
import React from 'react';

export interface TabsProps {
  children?: React.ReactNode;
  className?: string;
}

export function Tabs({ children, className = '' }: TabsProps) {
  return (
    <div className={`tabs ${className}`}>
      {children}
    </div>
  );
}

// صادر کردن کامپوننت‌های مرتبط
export * from './tabs';
