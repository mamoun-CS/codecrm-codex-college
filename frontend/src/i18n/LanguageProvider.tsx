'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  isLocale,
  isRTL,
  Locale,
  translate,
  TranslationValues,
} from './translations';

const STORAGE_KEY = 'codex-crm-locale';

interface LanguageContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) {
      setLocale(stored);
      document.documentElement.lang = stored;
      document.documentElement.dir = isRTL(stored) ? 'rtl' : 'ltr';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      dir: isRTL(locale) ? 'rtl' : 'ltr',
      setLocale,
      t: (key: string, values?: TranslationValues) => translate(locale, key, values),
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
