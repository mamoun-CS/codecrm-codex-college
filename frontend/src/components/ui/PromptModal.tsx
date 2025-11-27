'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PencilLine } from 'lucide-react';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onValueChange?: (value: string) => void;
}

export function PromptModal({
  isOpen,
  title,
  message,
  placeholder,
  defaultValue,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
  onValueChange,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue ?? '');

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue ?? '');
    }
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <Dialog open={isOpen} onClose={onCancel}>
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-3xl bg-gradient-to-br from-white via-white/80 to-slate-50/60 p-1 shadow-xl dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900/80"
      >
        <div className="rounded-3xl border border-white/80 p-6 backdrop-blur-xl dark:border-slate-800/70">
          <div className="mb-5 flex gap-4 rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-500/5 via-sky-500/10 to-cyan-500/10 px-4 py-3 shadow-inner dark:border-slate-800/70">
            <div className="rounded-2xl bg-white/50 p-3 text-indigo-600 shadow dark:bg-slate-900/40 dark:text-sky-400">
              <PencilLine className="h-6 w-6" aria-hidden="true" />
            </div>
            <DialogHeader className="mb-0 space-y-2 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {message}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-2">
            <Input
              value={value}
              placeholder={placeholder}
              onChange={(event) => handleChange(event.target.value)}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby="prompt-error"
            />
            {errorMessage && (
              <p id="prompt-error" className="text-sm text-rose-500">
                {errorMessage}
              </p>
            )}
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="ghost" type="button" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {submitText}
            </Button>
          </DialogFooter>
        </div>
      </motion.form>
    </Dialog>
  );
}
