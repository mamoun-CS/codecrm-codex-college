'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  success: 'bg-success/15 text-success dark:bg-success/20',
  warning: 'bg-warning/15 text-warning dark:bg-warning/20',
  danger: 'bg-danger/15 text-danger dark:bg-danger/20',
  muted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
