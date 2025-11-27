'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { campaignsAPI } from '@/lib/api';
import { useUi } from '@/store/uiStore';
import type { Campaign } from '@/types_new/leads';

// Define local types for the component
interface CampaignFormState {
  name: string;
  description?: string;
  budget?: number;
  total_spent?: number;
  channel?: string;
  channel_url?: string;
  platform_campaign_id?: string;
  start_date?: string;
  end_date?: string;
}

interface CampaignRecord extends Campaign {
  // Additional UI fields for display
  platform_type?: string;
  channel?: string;
  total_spent?: number;
  conversion_rate?: number;
}

const DEFAULT_FORM_STATE: CampaignFormState = {
  name: '',
  description: '',
  budget: 0,
  total_spent: 0,
  channel: '',
  channel_url: '',
  platform_campaign_id: '',
};

const normalizeCampaign = (payload: any): CampaignRecord => ({
  id: payload.id,
  name: payload.name ?? '',
  description: payload.description ?? undefined,
  country: payload.country ?? undefined,
  ad_source_id: payload.ad_source_id ?? undefined,
  created_by: payload.created_by ?? undefined,
  platform_campaign_id: payload.platform_campaign_id ?? undefined,
  active: Boolean(payload.active),
  budget: typeof payload.budget === 'number' ? payload.budget : Number(payload.budget) || 0,
  cost_per_lead: payload.cost_per_lead ?? undefined,
  lead_count: payload.lead_count ?? 0,
  created_at: payload.created_at ?? new Date().toISOString(),

  // UI computed fields
  platform_type: payload.adSource?.name ?? 'unknown',
  channel: payload.platform_campaign_id ?? 'n/a',
  total_spent: 0, // Not available in new schema
  conversion_rate: payload.lead_count > 0 ? (payload.budget / payload.lead_count) : 0,
});

export default function CampaignsManager() {
  const ui = useUi();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [filters, setFilters] = useState({
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [formState, setFormState] = useState<CampaignFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await campaignsAPI.list();
      const payload = response?.data ?? response;
      const rows = Array.isArray(payload)
        ? payload
        : payload.data ?? payload.campaigns ?? [];
      const normalized = rows.map(normalizeCampaign);
      setCampaigns(normalized);
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
      setError(err?.response?.data?.message || 'Unable to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        !filters.search ||
        campaign.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (campaign.platform_campaign_id ?? '').toLowerCase().includes(filters.search.toLowerCase());
      return matchesSearch;
    });
  }, [campaigns, filters]);

  const resetForm = () => {
    setFormState(DEFAULT_FORM_STATE);
    setEditing(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formState,
        budget: Number(formState.budget) || 0,
        total_spent: Number(formState.total_spent) || 0,
        start_date: formState.start_date || undefined,
        end_date: formState.end_date || undefined,
      };

      if (editing) {
        await campaignsAPI.update(editing.id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignsAPI.create(payload);
        toast.success('Campaign created');
      }

      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      console.error('Failed to save campaign:', err);
      toast.error(err?.response?.data?.message || 'Unable to save campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (campaign: CampaignRecord) => {
    setEditing(campaign);
    setFormState({
      name: campaign.name,
      description: campaign.description ?? '',
      budget: campaign.budget ?? 0,
      total_spent: campaign.total_spent ?? 0,
      channel: campaign.channel ?? '',
      platform_campaign_id: campaign.platform_campaign_id ?? '',
    });
  };

  const handleDelete = (campaign: CampaignRecord) => {
    ui.confirm({
      title: 'Delete Campaign',
      message: `Delete campaign "${campaign.name}"?`,
      tone: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await campaignsAPI.delete(campaign.id);
          toast.success('Campaign deleted');
          fetchCampaigns();
        } catch (err: any) {
          console.error('Failed to delete campaign:', err);
          toast.error(err?.response?.data?.message || 'Unable to delete campaign');
        }
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl lg:col-span-2">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Campaigns</p>
            <h2 className="text-2xl font-semibold text-slate-900">Acquisition channels</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={filters.search}
              placeholder="Search campaigns"
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:w-64"
            />
            <button
              onClick={() => fetchCampaigns()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Simplified filters - only search for now */}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
            Loading campaigns...
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {campaign.platform_type ?? 'n/a'} · {campaign.channel ?? 'n/a'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      campaign.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {campaign.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Budget</dt>
                    <dd>${campaign.budget?.toLocaleString() ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Spend</dt>
                    <dd>${campaign.total_spent?.toLocaleString() ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Leads</dt>
                    <dd>{campaign.lead_count ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Conversion</dt>
                    <dd>{campaign.conversion_rate ? `${campaign.conversion_rate}%` : 'n/a'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(campaign)}
                    className="flex-1 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {!filteredCampaigns.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
                No campaigns match the selected filters.
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {editing ? 'Update campaign' : 'Create campaign'}
            </p>
            <h3 className="text-xl font-semibold text-slate-900">{editing ? editing.name : 'New campaign'}</h3>
          </div>
          {editing && (
            <button type="button" onClick={() => resetForm()} className="text-sm text-slate-500 hover:text-slate-800">
              Reset
            </button>
          )}
        </div>

        <label className="text-sm font-medium text-slate-600">
          Name
          <input
            required
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Description
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            rows={3}
          />
        </label>

        {/* Removed platform_type and status fields as they don't exist in new schema */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Budget
            <input
              type="number"
              min={0}
              value={formState.budget ?? 0}
              onChange={(event) => setFormState((prev) => ({ ...prev, budget: Number(event.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Total spend
            <input
              type="number"
              min={0}
              value={formState.total_spent ?? 0}
              onChange={(event) => setFormState((prev) => ({ ...prev, total_spent: Number(event.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-slate-600">
          Channel
          <input
            value={formState.channel}
            onChange={(event) => setFormState((prev) => ({ ...prev, channel: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="text-sm font-medium text-slate-600">
          Platform campaign ID
          <input
            value={formState.platform_campaign_id}
            onChange={(event) => setFormState((prev) => ({ ...prev, platform_campaign_id: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 hover:bg-cyan-700 disabled:cursor-progress disabled:bg-cyan-400"
        >
          {submitting ? 'Saving…' : editing ? 'Update campaign' : 'Create campaign'}
        </button>
      </form>
    </div>
  );
}
