export const locales = ['en', 'ar', 'he'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
export const rtlLocales: Locale[] = ['ar', 'he'];

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  he: 'עברית',
};
