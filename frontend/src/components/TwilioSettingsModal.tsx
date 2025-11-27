'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface TwilioSettingsFormValues {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

interface TwilioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TwilioSettingsFormValues) => Promise<void> | void;
  saving: boolean;
  error?: string | null;
  initialValues?: Partial<TwilioSettingsFormValues>;
}

const defaultValues: TwilioSettingsFormValues = {
  accountSid: '',
  authToken: '',
  phoneNumber: '',
};

export function TwilioSettingsModal({
  isOpen,
  onClose,
  onSubmit,
  saving,
  error,
  initialValues,
}: TwilioSettingsModalProps) {
  const [formValues, setFormValues] = useState<TwilioSettingsFormValues>(defaultValues);

  useEffect(() => {
    if (isOpen) {
      setFormValues({
        accountSid: initialValues?.accountSid ?? defaultValues.accountSid,
        authToken: initialValues?.authToken ?? defaultValues.authToken,
        phoneNumber: initialValues?.phoneNumber ?? defaultValues.phoneNumber,
      });
    }
  }, [initialValues, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof TwilioSettingsFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !isFormValid) {
      return;
    }
    await onSubmit(formValues);
  };

  const isFormValid =
    formValues.accountSid.trim().length > 0 &&
    formValues.authToken.trim().length > 0 &&
    formValues.phoneNumber.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Twilio Setup Required</p>
            <h2 className="text-xl font-semibold text-slate-900">Connect Your Twilio Account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the Twilio credentials that belong to your account to place calls or send SMS.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close Twilio settings dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Account SID</label>
            <input
              type="text"
              value={formValues.accountSid}
              onChange={handleChange('accountSid')}
              placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Auth Token</label>
            <input
              type="password"
              value={formValues.authToken}
              onChange={handleChange('authToken')}
              placeholder="Your secure auth token"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoComplete="off"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              You can find these credentials in the Twilio Console dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Twilio Phone Number</label>
            <input
              type="tel"
              value={formValues.phoneNumber}
              onChange={handleChange('phoneNumber')}
              placeholder="+1 555 555 5555"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoComplete="off"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Must be a verified Twilio number that can place outbound calls.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            disabled={!isFormValid || saving}
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
