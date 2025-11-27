'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const HeaderBar = () => {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const updatedTime = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: 'numeric' }).format(new Date());
  const hideHeader = pathname === '/login' || pathname?.startsWith('/landing/');

  if (hideHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mobile-safe-area mx-auto flex max-w-7xl flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {(
            pathname && !pathname.startsWith('/landing')
          ) && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('Back to Dashboard')}</span>
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Codex College CRM</p>
            <p className="text-xs text-slate-500">{t('Lead performance overview')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            {t('Live sync enabled')}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {t('Updated {time}', { time: updatedTime })}
          </span>
          <LanguageSwitcher variant="inline" />
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
