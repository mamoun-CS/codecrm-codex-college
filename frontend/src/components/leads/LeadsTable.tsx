'use client';

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { LeadListItem, SortState } from '@/types/leads';
import { useVirtualizer } from '@tanstack/react-virtual';

interface LeadsTableProps {
  leads: LeadListItem[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  onSelectLead: (leadId: number) => void;
  selectedLeadId: number | null;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 64;
const STALE_LEAD_THRESHOLD_HOURS = 4; // ⚠️ Warning threshold for stale leads

const SORTABLE_FIELDS: Array<{ label: string; field: SortState['field'] }> = [
  { label: 'أحدث', field: 'created_at' },
  { label: 'الحالة', field: 'status' },
  { label: 'الاسم', field: 'name' },
];

function LeadsTableComponent({
  leads,
  sort,
  onSortChange,
  onSelectLead,
  selectedLeadId,
  isLoading,
  hasMore,
  onLoadMore,
}: LeadsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const formattedLeads = useMemo(() => leads, [leads]);

  const handleSort = useCallback(
    (field: SortState['field']) => {
      const direction =
        sort.field === field ? (sort.direction === 'desc' ? 'asc' : 'desc') : 'desc';
      onSortChange({ field, direction });
    },
    [sort, onSortChange],
  );

  const virtualizer = useVirtualizer({
    count: formattedLeads.length + (hasMore ? 1 : 0),
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasMore || isLoading) {
      return;
    }
    const last = virtualItems[virtualItems.length - 1];
    if (last && last.index >= formattedLeads.length - 1) {
      onLoadMore();
    }
  }, [virtualItems, formattedLeads.length, hasMore, isLoading, onLoadMore]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const renderSortButton = (field: SortState['field'], label: string) => {
    const isActive = sort.field === field;
    return (
      <button
        key={field}
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-tight ${
          isActive ? 'text-cyan-300' : 'text-slate-400'
        }`}
      >
        <span>{label}</span>
        <span
          className={`transition-transform ${isActive && sort.direction === 'asc' ? '-scale-y-100' : ''}`}
        >
          ▲
        </span>
      </button>
    );
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-slate-900/70 p-4 shadow-2xl shadow-cyan-900/20 backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {SORTABLE_FIELDS.map(({ field, label }) => renderSortButton(field, label))}
        </div>
        {isLoading && (
          <span className="text-xs text-slate-400">يتم جلب البيانات...</span>
        )}
      </header>

      <div
        ref={containerRef}
        className="relative h-[640px] overflow-auto rounded-2xl bg-slate-950/30"
      >
        <div
          style={{ height: virtualizer.getTotalSize() }}
          className="relative w-full"
        >
          {virtualItems.map((virtualRow) => {
            const isLoaderRow = virtualRow.index >= formattedLeads.length;
            if (isLoaderRow) {
              return (
                <div
                  key={`loader-${virtualRow.index}`}
                  className="absolute left-0 right-0 flex items-center justify-center text-sm text-slate-400"
                  style={{ transform: `translateY(${virtualRow.start}px)`, height: virtualRow.size }}
                >
                  {hasMore ? 'تحميل المزيد ...' : 'تم عرض جميع النتائج'}
                </div>
              );
            }

            const lead = formattedLeads[virtualRow.index];
            const isSelected = lead.id === selectedLeadId;

            // Check if lead is stale (not updated in 4+ hours)
            const lastUpdate = lead.updated_at ? new Date(lead.updated_at).getTime() : new Date(lead.created_at).getTime();
            const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
            const isStale = hoursSinceUpdate > STALE_LEAD_THRESHOLD_HOURS;

            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={`absolute inset-x-0 flex h-[62px] items-center justify-between rounded-2xl px-4 text-right transition ${
                  isSelected
                    ? 'bg-cyan-500/20 text-white ring-2 ring-cyan-400/60'
                    : isStale
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/30'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                style={{ transform: `translateY(${virtualRow.start}px)`, height: virtualRow.size }}
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-slate-100">
                    {lead.name}
                  </span>
                  {lead.phone && (
                    <span className="text-xs text-slate-400">{lead.phone}</span>
                  )}
                </div>
                <div className="flex w-1/3 flex-col items-end">
                  <div className="flex items-center gap-2">
                    {isStale && (
                      <span className="text-xs text-amber-400" title={`لم يتم التحديث منذ ${Math.floor(hoursSinceUpdate)} ساعة`}>
                        ⚠️
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lead.status === 'deal'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : isStale
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'bg-slate-700/60 text-slate-200'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <span className={`text-xs ${isStale ? 'text-amber-400' : 'text-slate-400'}`}>
                    {dateFormatter.format(new Date(lead.created_at))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!formattedLeads.length && !isLoading && (
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
          لا توجد نتائج مطابقة للبحث الحالي.
        </div>
      )}
    </section>
  );
}

export default memo(LeadsTableComponent);
