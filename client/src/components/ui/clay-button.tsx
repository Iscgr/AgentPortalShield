// 🎨 Claymorphism Button Component
import React from 'react';
import { cn } from '@/lib/utils';

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const ClayButton = React.forwardRef<HTMLButtonElement, ClayButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'clay-button inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'clay-button': variant === 'primary',
            'clay-button-secondary': variant === 'secondary',
            'clay-button-accent': variant === 'accent',
            'bg-transparent shadow-none hover:shadow-none': variant === 'ghost',
          },
          {
            'h-9 px-4 py-2 text-sm': size === 'sm',
            'h-11 px-6 py-3': size === 'md',
            'h-13 px-8 py-4 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ClayButton.displayName = 'ClayButton';

export { ClayButton };