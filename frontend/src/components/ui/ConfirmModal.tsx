'use client';

import { motion } from 'framer-motion';
import { ShieldQuestion } from 'lucide-react';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConfirmTone } from '@/store/uiStore';

const toneStyles: Record<ConfirmTone, { accent: string; button: 'default' | 'destructive' | 'secondary' }> = {
  primary: {
    accent: 'from-sky-500/15 via-sky-400/10 to-blue-500/10 text-sky-900 dark:text-sky-100',
    button: 'default',
  },
  danger: {
    accent: 'from-rose-600/15 via-rose-500/10 to-orange-500/10 text-rose-900 dark:text-rose-100',
    button: 'destructive',
  },
  neutral: {
    accent: 'from-slate-400/20 via-slate-300/10 to-slate-200/10 text-slate-900 dark:text-slate-100',
    button: 'secondary',
  },
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'primary',
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  const toneConfig = toneStyles[tone] || toneStyles.primary;

  return (
    <Dialog open={isOpen} onClose={onCancel}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className={cn('rounded-3xl bg-gradient-to-br from-white via-white/80 to-slate-50/60 p-1 shadow-xl shadow-slate-900/10 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/80', 'backdrop-blur-xl')}>
          <div className={cn('rounded-3xl border border-white/80 p-6 shadow-inner shadow-white/20 dark:border-slate-800/70')}>
            <div
              className={cn(
                'mb-6 flex items-start gap-4 rounded-2xl border border-white/30 px-4 py-3 shadow-inner shadow-white/20 dark:border-slate-800/70',
                `bg-gradient-to-br ${toneConfig.accent}`
              )}
            >
              <div className="rounded-2xl bg-white/40 p-3 text-slate-700 shadow dark:bg-slate-900/50 dark:text-slate-100">
                <ShieldQuestion className="h-6 w-6" aria-hidden="true" />
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
            <DialogFooter className="gap-3 text-right">
              <Button variant="ghost" onClick={onCancel}>
                {cancelText}
              </Button>
              <Button
                variant={toneConfig.button}
                onClick={onConfirm}
                loading={isLoading}
                className={tone === 'neutral' ? 'text-slate-900 dark:text-slate-100' : undefined}
              >
                {confirmText}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </motion.div>
    </Dialog>
  );
}
