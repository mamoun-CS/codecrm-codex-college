'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import type { LeadDetails, LeadListItem } from '@/types/leads';
import { leadsAPI } from '@/lib/api';

interface LeadDetailsSidebarProps {
  leadId: number | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: (lead: LeadListItem) => void;
}

const statusOptions = ['new', 'in_treatment', 'meeting', 'deal', 'not_applicable'];

export default function LeadDetailsSidebar({
  leadId,
  open,
  onClose,
  onLeadUpdated,
}: LeadDetailsSidebarProps) {
  const { data, isLoading, mutate } = useSWR<LeadDetails>(
    leadId && open ? ['lead-details', leadId] : null,
    async ([, id]) => {
      const response = await leadsAPI.getLead(id);
      const lead = response.data;
      return {
        ...lead,
        name: lead.name ?? lead.full_name ?? 'بدون اسم',
        created_at: lead.created_at ?? new Date().toISOString(),
      };
    },
    { revalidateOnFocus: false },
  );

  const [status, setStatus] = useState('new');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (data) {
      setStatus(data.status ?? 'new');
      setPhone(data.phone ?? '');
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!leadId) return;
    try {
      await leadsAPI.updateLead(leadId, {
        status,
        phone: phone || null,
      });
      toast.success('تم حفظ التعديلات');
      await mutate();
      if (data) {
        onLeadUpdated?.({
          id: data.id,
          name: data.name ?? data.full_name ?? 'بدون اسم',
          phone,
          status,
          created_at: data.created_at ?? new Date().toISOString(),
          team_id: data.team_id ?? null,
        });
      }
    } catch {
      toast.error('تعذر حفظ التغييرات');
    }
  }, [leadId, status, phone, mutate, data, onLeadUpdated]);

  const metaItems = useMemo(
    () => [
      { label: 'البريد', value: data?.email ?? '—' },
      { label: 'المصدر', value: data?.source ?? '—' },
      { label: 'اللغة', value: data?.language ?? '—' },
      { label: 'الدولة', value: data?.country ?? '—' },
    ],
    [data],
  );

  if (!open || !leadId) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-white/10 bg-slate-950/95 p-6 text-right shadow-2xl shadow-cyan-900/40 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">تفاصيل العميل</p>
          <h2 className="text-2xl font-bold text-white">
            {data?.name ?? data?.full_name ?? '...'}
          </h2>
          <p className="text-xs text-slate-400">
            {data?.created_at
              ? new Date(data.created_at).toLocaleString('ar-SA')
              : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-100"
        >
          إغلاق
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {metaItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3"
          >
            <span className="text-xs text-slate-500">{item.label}</span>
            <span className="text-sm font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          الحالة
          <select
            value={status}
            disabled={isLoading}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          الهاتف
          <input
            type="tel"
            value={phone}
            disabled={isLoading}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full rounded-2xl bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
        >
          حفظ التغييرات
        </button>
      </div>
    </aside>
  );
}
