'use client';

import { memo, useCallback, useMemo } from 'react';
import type { LeadFilters } from '@/types/leads';

interface LeadsFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (changes: Partial<LeadFilters>) => void;
  onReset: () => void;
  isLoading: boolean;
}

const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'new', label: 'جديد' },
  { value: 'in_treatment', label: 'تحت المعالجة' },
  { value: 'meeting', label: 'اجتماع' },
  { value: 'deal', label: 'صفقة' },
  { value: 'not_applicable', label: 'غير مناسب' },
];

const sourceOptions = [
  { value: 'all', label: 'كل المصادر' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
];

function LeadsFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  isLoading,
}: LeadsFiltersProps) {
  const handleChange = useCallback(
    (key: keyof LeadFilters, value: string) => {
      onFiltersChange({ [key]: value });
    },
    [onFiltersChange],
  );

  const isFiltered = useMemo(() => {
    return (
      filters.status !== 'all' ||
      filters.source !== 'all' ||
      !!filters.owner ||
      !!filters.search ||
      !!filters.startDate ||
      !!filters.endDate
    );
  }, [filters]);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-5 shadow-lg shadow-cyan-900/10 backdrop-blur">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          البحث
          <input
            type="search"
            value={filters.search}
            onChange={(event) => handleChange('search', event.target.value)}
            placeholder="ابحث بالاسم أو الهاتف"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          الحالة
          <select
            value={filters.status}
            onChange={(event) => handleChange('status', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          المصدر
          <select
            value={filters.source}
            onChange={(event) => handleChange('source', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          المالك
          <input
            type="text"
            value={filters.owner}
            onChange={(event) => handleChange('owner', event.target.value)}
            placeholder="اسم مسؤول المتابعة"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          من تاريخ
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => handleChange('startDate', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          إلى تاريخ
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => handleChange('endDate', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          />
        </label>
        <div className="flex items-end justify-end gap-3 md:col-span-2 lg:col-span-2">
          <button
            onClick={onReset}
            disabled={!isFiltered && !isLoading}
            className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-40"
          >
            إعادة ضبط
          </button>
          <span className="text-xs text-slate-500">
            {isLoading ? 'يتم التحديث...' : 'محدث'}
          </span>
        </div>
      </div>
    </section>
  );
}

export default memo(LeadsFiltersComponent);
