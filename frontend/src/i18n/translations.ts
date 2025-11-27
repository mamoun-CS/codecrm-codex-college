export const SUPPORTED_LOCALES = ['en', 'ar', 'he'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import he from '@/locales/he.json';

export const translations = { en, ar, he };

export const DEFAULT_LOCALE: Locale = 'en';
const RTL_LOCALES: Locale[] = ['ar', 'he'];

export const languageLabels: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  he: 'עברית',
};

export type TranslationValues = Record<string, string | number>;

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
}

export function isRTL(locale: Locale) {
  return RTL_LOCALES.includes(locale);
}

function formatValues(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => `${values[token] ?? `{${token}}`}`);
}

export function translate(locale: Locale, key: string, values?: TranslationValues) {
  const localeMap = translations[locale] as Record<string, string>;
  const fallbackMap = translations['en'] as Record<string, string>;

  const base = localeMap[key] ?? fallbackMap[key] ?? key;
  return formatValues(base, values);
}

export function registerTranslations(locale: Locale, entries: Record<string, string>) {
  Object.assign(translations[locale], entries);
}

export function getTranslations(locale: Locale) {
  return translations[locale];
}
