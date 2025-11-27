'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { leadsAPI } from '@/lib/api';
import type { PaginatedMeta } from '@/types/leads';
import { LeadPlatformSource } from '@/types/crm';
import type { Lead } from '@/types_new/leads';
import { LeadStatus, LeadSource, LeadPlatformSource as NewLeadPlatformSource } from '@/types_new/enums';
import LeadForm from './LeadForm';

// New interfaces for the updated schema
interface LeadRecord extends Lead {
  // Additional computed fields for UI
  owner_name?: string;
  campaign_name?: string;
  platform_source?: NewLeadPlatformSource;
}

interface LeadFilters {
  search: string;
  status: string;
  platform_source: LeadPlatformSource | 'all';
  owner: string;
  campaign: string;
  archived: 'all' | 'active' | 'archived';
  dateFrom?: string;
  dateTo?: string;
}

const STATUS_FILTERS = [
  'all',
  LeadStatus.NEW,
  LeadStatus.IN_PROGRESS,
  LeadStatus.FOLLOW_UP,
  LeadStatus.NOT_ANSWERING,
  LeadStatus.CLOSED,
  LeadStatus.WON,
  LeadStatus.LOST
];

const DEFAULT_FILTERS: LeadFilters = {
  search: '',
  status: 'all',
  platform_source: 'all',
  owner: '',
  campaign: '',
  archived: 'active',
};

const normalizeLead = (payload: any): LeadRecord => ({
  id: payload.id,
  full_name: payload.full_name ?? payload.name ?? '',
  phone: payload.phone ?? null,
  email: payload.email ?? null,
  country: payload.country ?? null,
  city: payload.city ?? null,
  language: payload.language ?? null,
  status: payload.status ?? LeadStatus.NEW,
  source: payload.source ?? LeadSource.MANUAL,
  campaign_id: payload.campaign_id ?? null,
  owner_user_id: payload.owner_user_id ?? null,
  assigned_to: payload.assigned_to ?? null,
  utm_source: payload.utm_source ?? null,
  utm_medium: payload.utm_medium ?? null,
  utm_campaign: payload.utm_campaign ?? null,
  utm_term: payload.utm_term ?? null,
  utm_content: payload.utm_content ?? null,
  external_lead_id: payload.external_lead_id ?? null,
  source_reference_id: payload.source_reference_id ?? null,
  advertiser_id: payload.advertiser_id ?? null,
  team_id: payload.team_id ?? null,
  pipeline_id: payload.pipeline_id ?? null,
  substatus: payload.substatus ?? null,
  ad_source_id: payload.ad_source_id ?? null,
  ad_id: payload.ad_id ?? null,
  adset_id: payload.adset_id ?? null,
  form_id: payload.form_id ?? null,
  lead_id: payload.lead_id ?? null,
  custom_fields: payload.custom_fields ?? {},
  raw_payload: payload.raw_payload ?? {},
  raw_payload_snapshot: payload.raw_payload_snapshot ?? null,
  original_created_at: payload.original_created_at ?? null,
  ingested_at: payload.ingested_at ?? null,
  last_interaction_date: payload.last_interaction_date ?? null,
  transfer_from_user_id: payload.transfer_from_user_id ?? null,
  transfer_to_user_id: payload.transfer_to_user_id ?? null,
  transfer_notes: payload.transfer_notes ?? null,
  transferred_at: payload.transferred_at ?? null,
  archived_at: payload.archived_at ?? null,
  archive_reason: payload.archive_reason ?? null,
  created_at: payload.created_at ?? new Date().toISOString(),
  updated_at: payload.updated_at ?? new Date().toISOString(),

  // Relations
  campaign: payload.campaign ? {
    id: payload.campaign.id,
    name: payload.campaign.name ?? '',
    description: payload.campaign.description,
    country: payload.campaign.country,
    ad_source_id: payload.campaign.ad_source_id,
    created_by: payload.campaign.created_by,
    platform_campaign_id: payload.campaign.platform_campaign_id,
    active: payload.campaign.active ?? true,
    budget: payload.campaign.budget ?? 0,
    cost_per_lead: payload.campaign.cost_per_lead ?? 0,
    lead_count: payload.campaign.lead_count ?? 0,
    created_at: payload.campaign.created_at ?? new Date().toISOString(),
  } : undefined,
  owner: payload.owner ? {
    id: payload.owner.id,
    name: payload.owner.name ?? '',
    email: payload.owner.email ?? '',
    role: payload.owner.role ?? '',
    team_id: payload.owner.team_id,
    active: payload.owner.active ?? true,
    created_at: payload.owner.created_at ?? new Date().toISOString(),
  } : undefined,
  assignedTo: payload.assignedTo ? {
    id: payload.assignedTo.id,
    name: payload.assignedTo.name ?? '',
    email: payload.assignedTo.email ?? '',
    role: payload.assignedTo.role ?? '',
    team_id: payload.assignedTo.team_id,
    active: payload.assignedTo.active ?? true,
    created_at: payload.assignedTo.created_at ?? new Date().toISOString(),
  } : undefined,
  team: payload.team ? {
    id: payload.team.id,
    name: payload.team.name ?? '',
    description: payload.team.description,
    created_at: payload.team.created_at ?? new Date().toISOString(),
  } : undefined,
  pipeline: payload.pipeline ? {
    id: payload.pipeline.id,
    name: payload.pipeline.name ?? '',
  } : undefined,

  // UI computed fields
  owner_name: payload.owner?.name ?? payload.owner_name ?? null,
  campaign_name: payload.campaign?.name ?? payload.campaign_name ?? null,
  platform_source: payload.platform_source ?? null,
});

interface LeadsTableProps {
  onLeadSelected?: (lead: LeadRecord) => void;
}

export default function LeadsTable({ onLeadSelected }: LeadsTableProps) {
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>({
    page: 1,
    limit: 20,
    total: 0,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [sort, setSort] = useState<{ field: 'created_at' | 'status' | 'full_name'; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc',
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsAPI.getLeads({
        page: meta.page,
        limit: meta.limit,
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        platform_source: filters.platform_source !== 'all' ? filters.platform_source : undefined,
        owner: filters.owner || undefined,
        campaign_id: filters.campaign || undefined,
        archived:
          filters.archived === 'all'
            ? undefined
            : filters.archived === 'archived'
              ? true
              : false,
        start_date: filters.dateFrom,
        end_date: filters.dateTo,
        sortBy: sort.field,
        sortOrder: sort.direction,
      });

      const payload = response?.data ?? response;
      const rows = Array.isArray(payload)
        ? payload
        : payload.data ?? payload.leads ?? payload.records ?? [];
      const normalized = rows.map(normalizeLead);
      setLeads(normalized);
      setMeta({
        page: payload.meta?.page ?? meta.page,
        limit: payload.meta?.limit ?? meta.limit,
        total: payload.meta?.total ?? normalized.length,
        hasNextPage:
          payload.meta?.hasNextPage ??
          Boolean(payload.meta && payload.meta.page * payload.meta.limit < payload.meta.total),
      });
    } catch (err: any) {
      console.error('Failed to fetch leads:', err);
      const message = err?.response?.data?.message || 'Unable to load leads. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, meta.limit, meta.page, sort.direction, sort.field]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleFilterChange = (field: keyof LeadFilters, value: string | LeadPlatformSource | 'all' | 'archived' | 'active') => {
    setFilters((prev) => ({ ...prev, [field]: value as any }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    setMeta((prev) => ({
      ...prev,
      page: Math.max(1, direction === 'prev' ? prev.page - 1 : prev.page + 1),
    }));
  };

  const handleSort = (field: 'created_at' | 'status' | 'full_name') => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleLeadSaved = (lead: LeadRecord) => {
    setSelectedLead(null);
    onLeadSelected?.(lead);
    fetchLeads();
  };

  const resolvedLeads = useMemo(() => leads, [leads]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur lg:col-span-2">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Unified Leads</h2>
            <p className="text-sm text-slate-500">Search and manage leads collected from every integrated platform.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search name, email or phone"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:w-64"
            />
            <button
              onClick={() => fetchLeads()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
            >
              <option value="all">All Statuses</option>
              {STATUS_FILTERS.slice(1).map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Platform
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={filters.platform_source}
              onChange={(event) => handleFilterChange('platform_source', event.target.value as NewLeadPlatformSource | 'all')}
            >
              <option value="all">All Platforms</option>
              {Object.values(NewLeadPlatformSource).map((platform) => (
                <option key={platform} value={platform}>
                  {platform.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Archived
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              value={filters.archived}
              onChange={(event) => handleFilterChange('archived', event.target.value as 'all' | 'active' | 'archived')}
            >
              <option value="active">Active only</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">
                  <button onClick={() => handleSort('full_name')} className="flex items-center gap-1">
                    Name
                    {sort.field === 'full_name' && <span>{sort.direction === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500">Contact</th>
                <th className="px-4 py-3 font-medium text-slate-500">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                    Status
                    {sort.field === 'status' && <span>{sort.direction === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500">Source</th>
                <th className="px-4 py-3 font-medium text-slate-500">Pipeline</th>
                <th className="px-4 py-3 font-medium text-slate-500">Custom Fields</th>
                <th className="px-4 py-3 font-medium text-slate-500">
                  <button onClick={() => handleSort('created_at')} className="flex items-center gap-1">
                    Created
                    {sort.field === 'created_at' && <span>{sort.direction === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resolvedLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`cursor-pointer transition hover:bg-slate-50 ${selectedLead?.id === lead.id ? 'bg-cyan-50' : ''}`}
                  onClick={() => {
                    setSelectedLead(lead);
                    onLeadSelected?.(lead);
                  }}
                >
                  <td className="px-4 py-3 text-slate-900">
                    <div className="font-semibold">{lead.full_name}</div>
                    {lead.owner_name && <div className="text-xs text-slate-500">Owner: {lead.owner_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{lead.email || '—'}</div>
                    <div className="text-xs text-slate-400">{lead.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lead.status === LeadStatus.WON
                          ? 'bg-emerald-100 text-emerald-700'
                          : lead.status === LeadStatus.LOST
                            ? 'bg-rose-100 text-rose-700'
                            : lead.status === LeadStatus.NEW
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {lead.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </span>
                    {lead.substatus && (
                      <div className="text-xs text-slate-400">({lead.substatus})</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                      lead.source === LeadSource.META
                        ? 'bg-blue-100 text-blue-700'
                        : lead.source === LeadSource.TIKTOK
                          ? 'bg-pink-100 text-pink-700'
                          : lead.source === LeadSource.GOOGLE_ADS
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                      {lead.source?.replace('_', ' ') || 'MANUAL'}
                    </span>
                    {lead.campaign_name && (
                      <div className="text-xs text-slate-400">Campaign: {lead.campaign_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                      {lead.pipeline?.name || 'Default'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {Object.keys(lead.custom_fields || {}).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(lead.custom_fields).slice(0, 2).map((key) => (
                          <span key={key} className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                            {key}
                          </span>
                        ))}
                        {Object.keys(lead.custom_fields).length > 2 && (
                          <span className="text-xs text-slate-400">
                            +{Object.keys(lead.custom_fields).length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(lead.created_at))}
                    {lead.archived_at && (
                      <div className="text-xs text-rose-400">
                        Archived: {lead.archive_reason || 'No reason'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && resolvedLeads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
            No leads match the current filters.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {(meta.page - 1) * meta.limit + 1}-
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={meta.page === 1 || loading}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">Page {meta.page}</span>
            <button
              onClick={() => handlePageChange('next')}
              disabled={!meta.hasNextPage || loading}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </footer>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-xl">
        <LeadForm lead={selectedLead} onSuccess={handleLeadSaved} onCancel={() => setSelectedLead(null)} />
      </div>
    </div>
  );
}

