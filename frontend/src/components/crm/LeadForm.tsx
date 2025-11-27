'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { leadsAPI } from '@/lib/api';
import type { Lead } from '@/types_new/leads';
import { LeadStatus, LeadSource, LeadPlatformSource as NewLeadPlatformSource } from '@/types_new/enums';

// New interface for LeadRecord that extends the new Lead interface
interface LeadRecord extends Lead {
  owner_name?: string;
  campaign_name?: string;
  platform_source?: NewLeadPlatformSource;
}

type LeadFormMode = 'create' | 'edit';

const STATUS_OPTIONS = [
  LeadStatus.NEW,
  LeadStatus.IN_PROGRESS,
  LeadStatus.FOLLOW_UP,
  LeadStatus.NOT_ANSWERING,
  LeadStatus.CLOSED,
  LeadStatus.WON,
  LeadStatus.LOST
];

interface LeadFormState {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  status: LeadStatus;
  substatus: string;
  source: LeadSource;
  platform_source: NewLeadPlatformSource;
  owner_user_id: string;
  campaign_id: string;
  archive_reason: string;
  pipeline_id: string;
  assigned_to: string;
}

const DEFAULT_FORM_STATE: LeadFormState = {
  full_name: '',
  email: '',
  phone: '',
  country: '',
  status: LeadStatus.NEW,
  substatus: '',
  source: LeadSource.MANUAL,
  platform_source: NewLeadPlatformSource.MANUAL,
  owner_user_id: '',
  campaign_id: '',
  archive_reason: '',
  pipeline_id: '',
  assigned_to: '',
};

export interface LeadFormProps {
  lead?: LeadRecord | null;
  onSuccess?: (lead: LeadRecord) => void;
  onCancel?: () => void;
}

const normalizeLead = (payload: any): LeadRecord => ({
  id: payload.id,
  full_name: payload.full_name ?? '',
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

export default function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const [formState, setFormState] = useState<LeadFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: LeadFormMode = useMemo(() => (lead ? 'edit' : 'create'), [lead]);

  useEffect(() => {
    if (lead) {
      setFormState({
        full_name: lead.full_name ?? '',
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        country: lead.country ?? '',
        status: lead.status ?? LeadStatus.NEW,
        substatus: lead.substatus ?? '',
        source: lead.source ?? LeadSource.MANUAL,
        platform_source: (lead.platform_source as NewLeadPlatformSource) ?? NewLeadPlatformSource.MANUAL,
        owner_user_id: lead.owner_user_id ? String(lead.owner_user_id) : '',
        campaign_id: lead.campaign_id ? String(lead.campaign_id) : '',
        archive_reason: lead.archive_reason ?? '',
        pipeline_id: lead.pipeline_id ? String(lead.pipeline_id) : '',
        assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
      });
    } else {
      setFormState(DEFAULT_FORM_STATE);
    }
  }, [lead]);

  const handleChange = useCallback((field: keyof LeadFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      full_name: formState.full_name.trim(),
      email: formState.email.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      country: formState.country.trim() || undefined,
      status: formState.status,
      substatus: formState.substatus.trim() || undefined,
      source: formState.source,
      platform_source: formState.platform_source,
      owner_user_id: formState.owner_user_id ? Number(formState.owner_user_id) : undefined,
      campaign_id: formState.campaign_id ? Number(formState.campaign_id) : undefined,
      pipeline_id: formState.pipeline_id ? Number(formState.pipeline_id) : undefined,
      assigned_to: formState.assigned_to ? Number(formState.assigned_to) : undefined,
      archive_reason: formState.archive_reason.trim() || undefined,
    };

    try {
      const response = lead
        ? await leadsAPI.updateLead(lead.id, payload)
        : await leadsAPI.createLead(payload);

      const data = response?.data ?? response;
      const normalized = normalizeLead(data);
      toast.success(lead ? 'Lead updated successfully' : 'Lead created successfully');
      onSuccess?.(normalized);
      if (!lead) {
        setFormState(DEFAULT_FORM_STATE);
      }
    } catch (err: any) {
      console.error('Lead form submission error:', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to save lead. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            {mode === 'create' ? 'Create Lead' : 'Update Lead'}
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'New Lead' : lead?.full_name}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">
          Full name
          <input
            required
            value={formState.full_name}
            onChange={(event) => handleChange('full_name', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Email
          <input
            type="email"
            value={formState.email}
            onChange={(event) => handleChange('email', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Phone
          <input
            value={formState.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Country
          <input
            value={formState.country}
            onChange={(event) => handleChange('country', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Status
          <select
            value={formState.status}
            onChange={(event) => handleChange('status', event.target.value as LeadStatus)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          Sub-status
          <input
            value={formState.substatus}
            onChange={(event) => handleChange('substatus', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Platform source
          <select
            value={formState.platform_source}
            onChange={(event) => handleChange('platform_source', event.target.value as NewLeadPlatformSource)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {Object.values(NewLeadPlatformSource).map((platform) => (
              <option key={platform} value={platform}>
                {platform.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-600">
          CRM Source
          <input
            value={formState.source}
            onChange={(event) => handleChange('source', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Owner user ID
          <input
            type="number"
            min={0}
            value={formState.owner_user_id}
            onChange={(event) => handleChange('owner_user_id', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Campaign ID
          <input
            type="number"
            min={0}
            value={formState.campaign_id}
            onChange={(event) => handleChange('campaign_id', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Pipeline ID
          <input
            type="number"
            min={0}
            value={formState.pipeline_id}
            onChange={(event) => handleChange('pipeline_id', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Assigned To (User ID)
          <input
            type="number"
            min={0}
            value={formState.assigned_to}
            onChange={(event) => handleChange('assigned_to', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>
      </div>

      <label className="text-sm font-medium text-slate-600">
        Archive reason
        <textarea
          value={formState.archive_reason}
          onChange={(event) => handleChange('archive_reason', event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          rows={3}
        />
      </label>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-400"
      >
        {submitting ? 'Saving...' : mode === 'create' ? 'Create Lead' : 'Update Lead'}
      </button>
    </form>
  );
}

