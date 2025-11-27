'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import HeaderBar from '@/components/HeaderBar';
import { SocketProvider } from '@/components/SocketProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SocketProvider>
        <div className="flex min-h-screen flex-col bg-slate-50">
          <HeaderBar />
          <main className="flex-1">{children}</main>
          <ConnectionStatus />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
          }}
        />
      </SocketProvider>
    </LanguageProvider>
  );
}
