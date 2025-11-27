'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return null;
  }

  const token = localStorage.getItem('token');

  if (token) {
    return <div>{t('Redirecting to dashboard...')}</div>;
  }

  const features = [
    'Live lead routing & transfers',
    'Marketing + sales analytics',
    'Permission aware workflows',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mobile-safe-area mx-auto flex min-h-screen max-w-6xl flex-col">

        <main className="flex flex-1 flex-col-reverse items-center gap-10 pb-12 pt-6 text-center sm:flex-row sm:text-left">
          <div className="space-y-6 sm:w-1/2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-300">
              {t('Launch-ready')}
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {t('A single, mobile-first workspace for every lead, deal, and campaign.')}
            </h1>
            <p className="text-base text-slate-300 sm:text-lg">
              {t(
                'Stay on top of sales signals, automate routing, and collaborate with your team from any device. Everything stays in sync with the backend APIs you already trust.'
              )}
            </p>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <ul className="space-y-2 text-left text-sm text-slate-200">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {t(feature)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 text-sm sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {t('Sign in to dashboard')}
              </Link>
              <p className="text-xs text-slate-400 sm:w-56">
                {t('Accounts are provisioned internally. Ask an administrator for access.')}
              </p>
            </div>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/40 to-indigo-600/20 p-6 shadow-2xl sm:w-1/2">
            <div className="rounded-2xl bg-slate-900/60 p-6 text-left shadow-inner">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
                {t('Mobile preview')}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{t('Pipeline snapshot')}</p>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-slate-200">{t('New leads')}</p>
                    <p className="text-xs text-slate-500">{t('Last 24h')}</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-300">+38</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-slate-200">{t('Meetings booked')}</p>
                    <p className="text-xs text-slate-500">{t('Weekly')}</p>
                  </div>
                  <p className="text-xl font-bold text-sky-300">14</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-slate-200">{t('Win rate')}</p>
                    <p className="text-xs text-slate-500">{t('Trailing 30 days')}</p>
                  </div>
                  <p className="text-xl font-bold text-amber-300">27%</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
