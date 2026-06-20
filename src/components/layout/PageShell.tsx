// Shared inner page frame for product screens.
// Routes pair this with AppHeader when needed; this component focuses only on
// consistent title, description, action, and content spacing.
'use client';

import React from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Provides a reusable heading/action layout so feature pages do not recreate
// page chrome by hand.
export default function PageShell({ title, description, actions, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-serif text-ink mb-2">{title}</h1>
            {description ? <p className="max-w-2xl text-ink/70">{description}</p> : null}
          </div>
          <div>{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
