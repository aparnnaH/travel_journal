// Shared card primitive.
// Keeps borders, shadows, padding, and surface variants consistent across pages.
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
}

// Forwarding refs keeps the primitive flexible for measurements or focus scopes.
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles =
      'rounded-3xl bg-white p-6 transition-shadow duration-200';

    const variants = {
      default: 'shadow-soft border border-gold/20',
      elevated: 'shadow-lg-soft border border-gold/30',
      subtle: 'shadow-sm-soft border border-gold/10',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
