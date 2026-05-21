'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border-2 bg-white text-ink placeholder-ink/50',
            'transition-colors duration-200',
            'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30',
            'disabled:bg-cream/50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-gold/30 hover:border-gold/50',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-ink/60">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
