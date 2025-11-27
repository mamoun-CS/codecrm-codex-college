'use client';

import { memo } from 'react';

interface LeadsActionsToolbarProps {
  total: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  connected: boolean;
  userName?: string;
  staleLeadsCount?: number;
}

function LeadsActionsToolbarComponent({
  total,
  isRefreshing,
  onRefresh,
  connected,
  userName,
  staleLeadsCount = 0,
}: LeadsActionsToolbarProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/5 bg-slate-900/80 px-6 py-4 shadow-lg shadow-cyan-900/10 backdrop-blur">
      <div className="flex flex-col text-right">
        <span className="text-xs uppercase tracking-widest text-slate-500">إجمالي العملاء</span>
        <span className="text-2xl font-black text-white">{total.toLocaleString('ar-EG')}</span>
        {userName && (
          <span className="text-xs text-slate-400">مرحباً، {userName}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {staleLeadsCount > 0 && (
          <span className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            ⚠️ {staleLeadsCount} عميل متأخر (+4 ساعات)
          </span>
        )}

        <span
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
            connected ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {connected ? 'متصل لحظياً' : 'غير متصل'}
        </span>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded-2xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
        >
          {isRefreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
        </button>
      </div>
    </section>
  );
}

export default memo(LeadsActionsToolbarComponent);
