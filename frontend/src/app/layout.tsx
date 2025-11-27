import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { Inter, Tajawal, Heebo } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { Locale, rtlLocales } from '@/i18n/config';
import { I18nProvider } from '@/providers/I18nProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import { UiProvider } from '@/providers/UiProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-latin' });
const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic',
});
const heebo = Heebo({
  subsets: ['hebrew'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hebrew',
});

export const metadata: Metadata = {
  title: 'Codex CRM',
  description: 'Modern multilingual CRM workspace',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${tajawal.variable} ${heebo.variable}`}>
      <body className="min-h-screen bg-body text-foreground antialiased">
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <UiProvider>
              {children}
              <Toaster position="top-right" />
            </UiProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
