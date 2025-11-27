'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageProvider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>
    </LanguageProvider>
  );
}
