'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'outline';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const variants = {
      default: 'bg-cream text-ink border border-gold/20',
      gold: 'bg-gold text-cream shadow-soft',
      outline: 'border border-gold text-ink bg-white',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
