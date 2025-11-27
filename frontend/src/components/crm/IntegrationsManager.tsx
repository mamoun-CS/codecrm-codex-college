'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { integrationsAPI as integrationsGateway } from '@/lib/integrationsAPI';
import { useUi } from '@/store/uiStore';
import {
  IntegrationPlatformType,
  IntegrationStatus,
  IntegrationProvider,
  IntegrationType,
} from '@/types_new/enums';
import type { Integration } from '@/types_new/integrations';

// Define local types for the component
interface IntegrationFormState {
  name: string;
  type?: IntegrationType;
  provider?: IntegrationProvider;
  platform_type: IntegrationPlatformType;
  status: IntegrationStatus;
  url?: string;
  webhook_url?: string;
  endpoint_url?: string;
  account_id?: string;
  connection_config?: string;
  advertiser_ids?: string;
  forms_data?: string;
}

interface IntegrationRecord extends Integration {
  // Additional UI fields
  connection_config?: any;
  advertiser_ids?: string[];
  forms_data?: any;
}

type Tab = 'list' | 'form';

const DEFAULT_FORM_STATE: IntegrationFormState = {
  name: '',
  type: IntegrationType.OAUTH,
  provider: IntegrationProvider.META,
  platform_type: IntegrationPlatformType.META,
  status: IntegrationStatus.CONNECTED,
  url: '',
  webhook_url: '',
  endpoint_url: '',
  account_id: '',
  connection_config: '',
  advertiser_ids: '',
  forms_data: '',
};

const normalizeIntegration = (payload: any): IntegrationRecord => ({
  id: payload.id,
  name: payload.name ?? '',
  type: payload.type ?? null,
  provider: payload.provider ?? null,
  platform_type: payload.platform_type ?? IntegrationPlatformType.META,
  status: payload.status ?? IntegrationStatus.INACTIVE,
  slug: payload.slug ?? null,
  url: payload.url ?? null,
  webhook_url: payload.webhook_url ?? null,
  endpoint_url: payload.endpoint_url ?? null,
  account_id: payload.account_id ?? null,
  connection_config: payload.connection_config ?? payload.extra ?? null,
  advertiser_ids: Array.isArray(payload.advertiser_ids) ? payload.advertiser_ids : null,
  forms_data: payload.forms_data ?? null,
  leads_count: payload.leads_count ?? 0,
  created_at: payload.created_at ?? null,
  updated_at: payload.updated_at ?? null,
  webhook_status: payload.webhook_status ?? null,
});

export default function IntegrationsManager() {
  const ui = useUi();
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    platform: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<IntegrationFormState>(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<IntegrationRecord | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await integrationsGateway.getAll();
      const normalized = data.map(normalizeIntegration);
      setIntegrations(normalized);
    } catch (err: any) {
      console.error('Failed to fetch integrations:', err);
      const message = err?.response?.data?.message || 'Unable to load integrations.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      const matchesPlatform =
        filters.platform === 'all' || integration.platform_type === filters.platform;
      const matchesStatus =
        filters.status === 'all' || integration.status === filters.status;
      const matchesSearch =
        !filters.search ||
        integration.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (integration.slug ?? '').toLowerCase().includes(filters.search.toLowerCase());
      return matchesPlatform && matchesStatus && matchesSearch;
    });
  }, [integrations, filters]);

  const resetForm = () => {
    setFormState(DEFAULT_FORM_STATE);
    setEditing(null);
  };

  const parseJson = (value?: string) => {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (err) {
      throw new Error('Invalid JSON format.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formState.name.trim(),
        type: formState.type,
        provider: formState.provider,
        platform_type: formState.platform_type,
        status: formState.status,
        url: formState.url || undefined,
        webhook_url: formState.webhook_url || undefined,
        endpoint_url: formState.endpoint_url || undefined,
        account_id: formState.account_id || undefined,
        connection_config: parseJson(formState.connection_config),
        advertiser_ids: formState.advertiser_ids
          ? formState.advertiser_ids.split(',').map((entry) => entry.trim())
          : undefined,
        forms_data: parseJson(formState.forms_data),
      };

      if (editing) {
        await integrationsGateway.update(editing.id, payload);
        toast.success('Integration updated');
      } else {
        await integrationsGateway.create(payload);
        toast.success('Integration created');
      }

      resetForm();
      setActiveTab('list');
      fetchIntegrations();
    } catch (err: any) {
      console.error('Failed to save integration:', err);
      toast.error(err?.message || 'Unable to save integration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (integration: IntegrationRecord) => {
    setEditing(integration);
    setFormState({
      name: integration.name,
      type: integration.type ?? 'oauth',
      provider: integration.provider ?? 'facebook',
      platform_type: integration.platform_type,
      status: integration.status,
      url: integration.url ?? '',
      webhook_url: integration.webhook_url ?? '',
      endpoint_url: integration.endpoint_url ?? '',
      account_id: integration.account_id ?? '',
      connection_config: integration.connection_config
        ? JSON.stringify(integration.connection_config, null, 2)
        : '',
      advertiser_ids: integration.advertiser_ids?.join(', ') ?? '',
      forms_data: integration.forms_data ? JSON.stringify(integration.forms_data, null, 2) : '',
    });
    setActiveTab('form');
  };

  const handleDelete = (integration: IntegrationRecord) => {
    ui.confirm({
      title: 'Delete Integration',
      message: `Delete integration "${integration.name}"?`,
      tone: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await integrationsGateway.delete(integration.id);
          toast.success('Integration removed');
          fetchIntegrations();
        } catch (err: any) {
          console.error('Failed to delete integration:', err);
          toast.error(err?.response?.data?.message || 'Unable to delete integration');
        }
      },
    });
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-slate-500">Integrations</p>
          <h2 className="text-2xl font-semibold text-slate-900">Connected Platforms</h2>
        </div>
        <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
          <button
            className={`flex-1 rounded-full px-4 py-1 ${activeTab === 'list' ? 'bg-white shadow' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Overview
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-1 ${activeTab === 'form' ? 'bg-white shadow' : ''}`}
            onClick={() => {
              resetForm();
              setActiveTab('form');
            }}
          >
            {editing ? 'Edit' : 'Add'}
          </button>
        </div>
      </header>

      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search integrations"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <select
              value={filters.platform}
              onChange={(event) => setFilters((prev) => ({ ...prev, platform: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="all">All platforms</option>
              {Object.values(IntegrationPlatformType).map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="all">All statuses</option>
              {Object.values(IntegrationStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
              Loading integrations...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredIntegrations.map((integration) => (
                <article
                  key={integration.id}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {integration.platform_type} · {integration.provider ?? 'custom'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        integration.status === IntegrationStatus.ACTIVE || integration.status === IntegrationStatus.CONNECTED
                          ? 'bg-emerald-100 text-emerald-700'
                          : integration.status === IntegrationStatus.ERROR
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Endpoint</dt>
                      <dd className="truncate">{integration.endpoint_url ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Webhook</dt>
                      <dd className="truncate">{integration.webhook_url ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Leads tracked</dt>
                      <dd>{integration.leads_count ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Updated</dt>
                      <dd>{integration.updated_at ? new Date(integration.updated_at).toLocaleDateString() : '—'}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(integration)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(integration)}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
              {!filteredIntegrations.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
                  No integrations match the current filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {editing ? 'Update integration' : 'Register integration'}
              </p>
              <h3 className="text-xl font-semibold text-slate-900">{editing ? editing.name : 'New integration'}</h3>
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => resetForm()}
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              Provider
              <input
                value={formState.provider}
                onChange={(event) => setFormState((prev) => ({ ...prev, provider: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Platform type
              <select
                value={formState.platform_type}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    platform_type: event.target.value as IntegrationPlatformType,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                {Object.values(IntegrationPlatformType).map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Status
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as IntegrationStatus,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                {Object.values(IntegrationStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Endpoint URL
              <input
                value={formState.endpoint_url}
                onChange={(event) => setFormState((prev) => ({ ...prev, endpoint_url: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Webhook URL
              <input
                value={formState.webhook_url}
                onChange={(event) => setFormState((prev) => ({ ...prev, webhook_url: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>
          </div>

          <label className="text-sm font-medium text-slate-600">
            Connection config (JSON)
            <textarea
              value={formState.connection_config}
              onChange={(event) => setFormState((prev) => ({ ...prev, connection_config: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              rows={4}
            />
          </label>

          <label className="text-sm font-medium text-slate-600">
            Advertiser IDs (comma separated)
            <input
              value={formState.advertiser_ids}
              onChange={(event) => setFormState((prev) => ({ ...prev, advertiser_ids: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>

          <label className="text-sm font-medium text-slate-600">
            Forms data (JSON)
            <textarea
              value={formState.forms_data}
              onChange={(event) => setFormState((prev) => ({ ...prev, forms_data: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              rows={4}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700 disabled:cursor-progress disabled:bg-cyan-400"
          >
            {submitting ? 'Saving…' : editing ? 'Update integration' : 'Create integration'}
          </button>
        </form>
      )}
    </div>
  );
}
