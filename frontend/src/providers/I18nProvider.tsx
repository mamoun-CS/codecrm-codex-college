'use client';

import { IntlError, NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import { Locale } from '@/i18n/config';

interface I18nProviderProps {
  children: ReactNode;
  locale: Locale;
  messages: Record<string, string>;
}

function handleIntlError(error: IntlError) {
  if (process.env.NODE_ENV === 'development') {
    console.error(error);
  }
}

export function I18nProvider({ children, locale, messages }: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={handleIntlError}
      getMessageFallback={({ key }) => key}
    >
      {children}
    </NextIntlClientProvider>
  );
}
