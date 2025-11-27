'use client';

import { createContext, useContext } from 'react';

export type ConfirmTone = 'primary' | 'danger' | 'neutral';
export type AlertVariant = 'success' | 'error' | 'info';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
  actionText?: string;
  asToast?: boolean;
  onClose?: () => void;
}

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  cancelText?: string;
  submitText?: string;
  validationMessage?: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

export interface UiStore {
  confirm: (options: ConfirmOptions) => void;
  alert: (options: AlertOptions) => void;
  prompt: (options: PromptOptions) => void;
  closeAll: () => void;
}

export const UiStoreContext = createContext<UiStore | null>(null);

export function useUi(): UiStore {
  const context = useContext(UiStoreContext);
  if (!context) {
    throw new Error('useUi must be used within a UiProvider');
  }
  return context;
}
