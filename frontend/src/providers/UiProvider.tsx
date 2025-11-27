'use client';

import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UiStoreContext, type ConfirmOptions, type AlertOptions, type PromptOptions } from '@/store/uiStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AlertModal } from '@/components/ui/AlertModal';
import { PromptModal } from '@/components/ui/PromptModal';
import { toast } from 'react-hot-toast';

type ConfirmState = (ConfirmOptions & { isOpen: boolean }) | null;
type AlertState = (AlertOptions & { isOpen: boolean }) | null;
type PromptState = (PromptOptions & { isOpen: boolean }) | null;

interface UiProviderProps {
  children: ReactNode;
}

export function UiProvider({ children }: UiProviderProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [alertState, setAlertState] = useState<AlertState>(null);
  const [promptState, setPromptState] = useState<PromptState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setConfirmState(null);
    setAlertState(null);
    setPromptState(null);
    setIsConfirming(false);
    setIsPromptSubmitting(false);
    setPromptError(null);
  }, []);

  const openConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState({ ...options, isOpen: true });
    setAlertState(null);
    setPromptState(null);
    setPromptError(null);
  }, []);

  const openAlert = useCallback((options: AlertOptions) => {
    if (options.asToast) {
      const toastMessage = options.title ? `${options.title}${options.message ? ` – ${options.message}` : ''}` : options.message;
      if (toastMessage) {
        if (options.variant === 'success') {
          toast.success(toastMessage);
        } else if (options.variant === 'error') {
          toast.error(toastMessage);
        } else {
          toast(toastMessage);
        }
      }
    }
    setAlertState({ ...options, isOpen: true });
    setConfirmState(null);
    setPromptState(null);
    setPromptError(null);
  }, []);

  const openPrompt = useCallback((options: PromptOptions) => {
    setPromptState({ ...options, isOpen: true });
    setConfirmState(null);
    setAlertState(null);
    setPromptError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmState) return;
    setIsConfirming(true);
    try {
      await confirmState.onConfirm();
      closeAll();
    } catch (error) {
      console.error(error);
    } finally {
      setIsConfirming(false);
    }
  }, [confirmState, closeAll]);

  const handleCancel = useCallback(() => {
    if (confirmState?.onCancel) {
      confirmState.onCancel();
    }
    setConfirmState(null);
    setIsConfirming(false);
  }, [confirmState]);

  const handleAlertClose = useCallback(() => {
    if (alertState?.onClose) {
      alertState.onClose();
    }
    setAlertState(null);
  }, [alertState]);

  const handlePromptSubmit = useCallback(
    async (value: string) => {
      if (!promptState) return;
      const validationError =
        promptState.validate?.(value) ||
        (!value.trim() ? promptState.validationMessage || 'Please provide a value' : null);

      if (validationError) {
        setPromptError(validationError);
        return;
      }

      setIsPromptSubmitting(true);
      try {
        await promptState.onSubmit(value);
        closeAll();
      } catch (error) {
        console.error(error);
      } finally {
        setIsPromptSubmitting(false);
      }
    },
    [promptState, closeAll]
  );

  const handlePromptCancel = useCallback(() => {
    if (promptState?.onCancel) {
      promptState.onCancel();
    }
    setPromptState(null);
    setPromptError(null);
    setIsPromptSubmitting(false);
  }, [promptState]);

  const contextValue = useMemo(
    () => ({
      confirm: openConfirm,
      alert: openAlert,
      prompt: openPrompt,
      closeAll,
    }),
    [closeAll, openAlert, openConfirm, openPrompt]
  );

  return (
    <UiStoreContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        isOpen={Boolean(confirmState?.isOpen)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText}
        cancelText={confirmState?.cancelText}
        tone={confirmState?.tone}
        isLoading={isConfirming}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <AlertModal
        isOpen={Boolean(alertState?.isOpen)}
        title={alertState?.title || ''}
        message={alertState?.message || ''}
        variant={alertState?.variant}
        actionText={alertState?.actionText}
        onClose={handleAlertClose}
      />
      <PromptModal
        isOpen={Boolean(promptState?.isOpen)}
        title={promptState?.title || ''}
        message={promptState?.message || ''}
        placeholder={promptState?.placeholder}
        submitText={promptState?.submitText}
        cancelText={promptState?.cancelText}
        defaultValue={promptState?.defaultValue}
        errorMessage={promptError || undefined}
        isSubmitting={isPromptSubmitting}
        onSubmit={handlePromptSubmit}
        onCancel={handlePromptCancel}
        onValueChange={() => setPromptError(null)}
      />
    </UiStoreContext.Provider>
  );
}
