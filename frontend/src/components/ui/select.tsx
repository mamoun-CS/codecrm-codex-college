'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900/60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
