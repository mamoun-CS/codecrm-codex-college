'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { LeadPlatformSource } from '@/types_new/enums';

// Define local types for dashboard
interface DashboardFilters {
  range: '7d' | '30d' | '90d';
  platform: LeadPlatformSource | 'all';
}

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  activeCampaigns: number;
  connectedIntegrations: number;
  conversionRate: number;
  leadsByPlatform: Array<{
    label: string;
    value: number;
  }>;
  pipeline: Array<{
    stage: string;
    value: number;
  }>;
  campaigns: Array<{
    name: string;
    roi: number;
    spend: number;
  }>;
}

const DEFAULT_FILTERS: DashboardFilters = {
  range: '30d',
  platform: 'all',
};

const rangeToDays = (range: DashboardFilters['range']) => {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
};

export default function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = rangeToDays(filters.range);
      const [overviewRes, leadsBySourceRes, pipelineRes, campaignsRes] = await Promise.all([
        analyticsAPI.getOverview({ range: filters.range, platform: filters.platform }),
        analyticsAPI.getLeadsBySource({ platform: filters.platform }),
        analyticsAPI.getPipelineConversion(),
        analyticsAPI.getCampaignROI(),
      ]);

      const overview = overviewRes?.data ?? {};
      const bySource = leadsBySourceRes?.data ?? [];
      const pipeline = pipelineRes?.data ?? [];
      const campaigns = campaignsRes?.data ?? [];

      const aggregated: DashboardStats = {
        totalLeads: overview.totalLeads ?? overview.total_leads ?? 0,
        newLeads: overview.newLeads ?? overview.new_leads ?? 0,
        activeCampaigns: overview.activeCampaigns ?? overview.active_campaigns ?? campaigns.length,
        connectedIntegrations: overview.connectedIntegrations ?? overview.connected_integrations ?? 0,
        conversionRate: overview.conversionRate ?? overview.conversion_rate ?? 0,
        leadsByPlatform: bySource.map((item: any) => ({
          label: item.source ?? item.platform ?? 'unknown',
          value: item.count ?? item.value ?? 0,
        })),
        pipeline: pipeline.map((item: any) => ({
          stage: item.stage ?? 'stage',
          value: item.value ?? item.count ?? 0,
        })),
        campaigns: campaigns.map((item: any) => ({
          name: item.campaign ?? item.name ?? 'Campaign',
          roi: item.roi ?? 0,
          spend: item.spend ?? item.total_spent ?? 0,
        })),
      };

      if (!aggregated.leadsByPlatform.length) {
        aggregated.leadsByPlatform = Object.values(LeadPlatformSource).map((platform) => ({
          label: platform,
          value: 0,
        }));
      }

      setStats(aggregated);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err?.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const totalLeads = stats?.totalLeads ?? 0;
  const byPlatform = stats?.leadsByPlatform ?? [];
  const pipeline = stats?.pipeline ?? [];

  const pipelineTotal = useMemo(() => pipeline.reduce((sum, stage) => sum + stage.value, 0), [pipeline]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Overview</p>
          <h2 className="text-3xl font-semibold text-slate-900">Revenue operations dashboard</h2>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <select
            value={filters.platform}
            onChange={(event) => setFilters((prev) => ({ ...prev, platform: event.target.value as LeadPlatformSource | 'all' }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="all">All platforms</option>
            {Object.values(LeadPlatformSource).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <div className="flex rounded-full border border-slate-200 p-1 text-sm font-semibold text-slate-600">
            {(['7d', '30d', '90d'] as DashboardFilters['range'][]).map((option) => (
              <button
                key={option}
                onClick={() => setFilters((prev) => ({ ...prev, range: option }))}
                className={`px-3 py-1 ${filters.range === option ? 'rounded-full bg-slate-900 text-white shadow' : ''}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total leads', value: stats?.totalLeads ?? 0, accent: 'bg-cyan-500' },
              { label: 'New leads', value: stats?.newLeads ?? 0, accent: 'bg-emerald-500' },
              { label: 'Conversion rate', value: `${stats?.conversionRate ?? 0}%`, accent: 'bg-amber-500' },
              { label: 'Active campaigns', value: stats?.activeCampaigns ?? 0, accent: 'bg-indigo-500' },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow">
                <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-3xl font-semibold text-slate-900">{card.value}</span>
                  <span className={`h-2 w-12 rounded-full ${card.accent}`}></span>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow">
              <h3 className="text-lg font-semibold text-slate-900">Leads by platform</h3>
              <p className="text-sm text-slate-500">Distribution of inbound leads across connected channels</p>
              <div className="mt-4 space-y-4">
                {byPlatform.map((entry) => {
                  const percent = totalLeads ? Math.round((entry.value / totalLeads) * 100) : 0;
                  return (
                    <div key={entry.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{entry.label}</span>
                        <span>{entry.value} leads · {percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-slate-900"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow">
              <h3 className="text-lg font-semibold text-slate-900">Pipeline health</h3>
              <p className="text-sm text-slate-500">Lead volume by funnel stage</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {pipeline.map((stage) => {
                  const percent = pipelineTotal ? Math.round((stage.value / pipelineTotal) * 100) : 0;
                  return (
                    <div key={stage.stage} className="rounded-xl border border-slate-100 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{stage.stage}</p>
                      <p className="text-2xl font-semibold text-slate-900">{stage.value}</p>
                      <p className="text-xs text-slate-400">{percent}% of pipeline</p>
                      <div className="mt-2 h-1 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Campaign ROI</h3>
                <p className="text-sm text-slate-500">Performance snapshot across all paid channels</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Updated {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(stats?.campaigns ?? []).map((campaign) => (
                <article key={campaign.name} className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">{campaign.name}</p>
                  <p className="text-xs text-slate-500">Spend ${campaign.spend.toLocaleString()}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">{campaign.roi}% ROI</p>
                  <div className="mt-2 h-1 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, campaign.roi))}%` }}
                    />
                  </div>
                </article>
              ))}
              {(!stats?.campaigns?.length ?? true) && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No campaign ROI data available yet.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

