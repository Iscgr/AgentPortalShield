// 🎨 Unified Card Component (replacing claymorphism)
import React from 'react';
import { cn } from '@/lib/utils';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'metric' | 'floating' | 'pulse';
}

const ClayCard = React.forwardRef<HTMLDivElement, ClayCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'unified-card p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClayCard.displayName = 'ClayCard';

const ClayCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));

ClayCardHeader.displayName = 'ClayCardHeader';

const ClayCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-bold leading-none tracking-tight', className)}
    {...props}
  />
));

ClayCardTitle.displayName = 'ClayCardTitle';

const ClayCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground opacity-80', className)}
    {...props}
  />
));

ClayCardDescription.displayName = 'ClayCardDescription';

const ClayCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));

ClayCardContent.displayName = 'ClayCardContent';

export {
  ClayCard,
  ClayCardHeader,
  ClayCardTitle,
  ClayCardDescription,
  ClayCardContent,
};