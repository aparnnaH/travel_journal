// Generic map page shell.
// Provides a reusable framed layout for map-like surfaces.
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface MapShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Renders a title/subtitle/actions header above map content.
export default function MapShell({ title, subtitle, actions, children, className }: MapShellProps) {
  return (
    <section className={cn('rounded-[2rem] border border-ink/10 bg-cream/90 p-6 shadow-soft', className)}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{title}</h1>
          <p className="max-w-2xl text-sm text-ink/70">{subtitle}</p>
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
