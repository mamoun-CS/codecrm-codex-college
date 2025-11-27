'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AlertVariant } from '@/store/uiStore';

const variantConfig: Record<
  AlertVariant,
  { icon: typeof CheckCircle2; accent: string; shadow: string; iconBg: string; iconColor: string; button: 'default' | 'destructive' | 'secondary' }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'from-emerald-500/10 via-emerald-400/10 to-emerald-300/10',
    shadow: 'shadow-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    button: 'default',
  },
  error: {
    icon: OctagonAlert,
    accent: 'from-rose-500/10 via-rose-400/10 to-amber-300/10',
    shadow: 'shadow-rose-500/30',
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-500',
    button: 'destructive',
  },
  info: {
    icon: Info,
    accent: 'from-sky-500/10 via-blue-400/10 to-indigo-400/10',
    shadow: 'shadow-sky-500/30',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
    button: 'default',
  },
};

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  actionText?: string;
  onClose: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  variant = 'info',
  actionText = 'OK',
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;
  const config = variantConfig[variant] ?? variantConfig.info;
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="rounded-3xl bg-gradient-to-br from-white via-white/80 to-slate-50/60 p-1 shadow-xl dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/80"
      >
        <div className="rounded-3xl border border-white/80 p-6 backdrop-blur-xl dark:border-slate-800/70">
          <div
            className={cn(
              'mb-6 flex items-center gap-4 rounded-2xl border border-white/20 px-4 py-3 shadow-inner dark:border-slate-800/70',
              'bg-gradient-to-br',
              config.accent,
              config.shadow
            )}
          >
            <div className={cn('rounded-2xl p-3', config.iconBg)}>
              <Icon className={cn('h-6 w-6', config.iconColor)} aria-hidden="true" />
            </div>
            <div>
              <DialogHeader className="mb-0 space-y-2 text-left">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  {message}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <DialogFooter>
            <Button variant={config.button} onClick={onClose}>
              {actionText}
            </Button>
          </DialogFooter>
        </div>
      </motion.div>
    </Dialog>
  );
}
