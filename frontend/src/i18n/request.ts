import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;

  // Load messages synchronously to avoid webpack issues
  let messages: Record<string, string> = {};

  try {
    switch (resolvedLocale) {
      case 'en':
        messages = await import('../locales/en.json').then(m => m.default);
        break;
      case 'ar':
        messages = await import('../locales/ar.json').then(m => m.default);
        break;
      case 'he':
        messages = await import('../locales/he.json').then(m => m.default);
        break;
      default:
        messages = await import('../locales/en.json').then(m => m.default);
    }
  } catch (error) {
    console.warn('Failed to load locale messages:', error);
    // Fallback to empty messages
  }

  return {
    locale: resolvedLocale,
    messages,
  };
});
