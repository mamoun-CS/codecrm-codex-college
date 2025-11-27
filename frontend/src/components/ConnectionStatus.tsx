'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { useSocket } from './SocketProvider';

export function ConnectionStatus() {
  const { isConnected, reconnect } = useSocket();
  const { t } = useLanguage();

  return (
    <div className="connection-status fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-lg">
        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">{isConnected ? t('Live') : t('Offline')}</span>
        {!isConnected && (
          <button
            onClick={reconnect}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-600"
          >
            {t('Reconnect')}
          </button>
        )}
      </div>
    </div>
  );
}
