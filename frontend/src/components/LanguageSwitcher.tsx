'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { languageLabels, SUPPORTED_LOCALES } from '@/i18n/translations';

interface LanguageSwitcherProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export function LanguageSwitcher({ variant = 'floating', className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const wrapperClasses =
    variant === 'floating'
      ? 'language-switcher language-switcher--floating fixed bottom-4 right-4 z-50 rounded-full bg-white/90 shadow-lg ring-1 ring-slate-200 backdrop-blur px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:ring-slate-700'
      : 'language-switcher inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <div className={`${wrapperClasses} ${className}`.trim()} data-variant={variant}>
      <div className="flex items-center gap-1">
        {SUPPORTED_LOCALES.map(code => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`rounded-full px-3 py-1 transition ${
              locale === code
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {languageLabels[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
