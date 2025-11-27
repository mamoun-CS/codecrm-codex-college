'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Link2, Loader2, RefreshCcw } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { tiktokIntegrationAPI, TikTokLeadForm, TikTokLeadPreview, TikTokSettings } from '@/lib/tiktokIntegrationAPI';

type Status = 'idle' | 'loading' | 'success' | 'error';

function TikTokIntegrationContent() {
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState({ client_id: '', client_secret: '' });
  const [settings, setSettings] = useState<TikTokSettings | null>(null);
  const [advertisers, setAdvertisers] = useState<string[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('');
  const [forms, setForms] = useState<TikTokLeadForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [leads, setLeads] = useState<TikTokLeadPreview[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlMessage = searchParams.get('message');
    if (urlStatus === 'success') {
      setMessage('TikTok connected successfully.');
    } else if (urlStatus === 'error') {
      setError(urlMessage || 'TikTok connection failed.');
    }
  }, [searchParams]);

  useEffect(() => {
    loadSettings();
  }, []);

  const connected = useMemo(() => settings?.connected, [settings]);

  const loadSettings = async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await tiktokIntegrationAPI.getSettings();
      if (data) {
        setSettings(data);
        setCredentials((prev) => ({ ...prev, client_id: data.client_id }));
        if (data.advertiser_ids?.length) {
          setAdvertisers(data.advertiser_ids);
          setSelectedAdvertiser((prev) => prev || data.advertiser_ids[0]);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load TikTok settings.');
    } finally {
      setStatus('idle');
    }
  };

  const saveCredentials = async () => {
    setStatus('loading');
    setError(null);
    setMessage(null);
    try {
      const saved = await tiktokIntegrationAPI.register(credentials);
      setSettings(saved);
      setMessage('Credentials saved. You can now connect your TikTok Ads account.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save credentials.');
    } finally {
      setStatus('idle');
    }
  };

  const startOAuth = async () => {
    setStatus('loading');
    setError(null);
    setMessage(null);
    try {
      const { url } = await tiktokIntegrationAPI.getOAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start TikTok OAuth.');
      setStatus('error');
    }
  };

  const refreshAdvertisers = async () => {
    if (!connected) return;
    setStatus('loading');
    try {
      const { advertisers: ids } = await tiktokIntegrationAPI.listAdvertisers();
      setAdvertisers(ids);
      if (ids.length) {
        setSelectedAdvertiser(ids[0]);
        await loadForms(ids[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch advertisers.');
    } finally {
      setStatus('idle');
    }
  };

  const loadForms = async (advertiserId: string) => {
    if (!advertiserId) return;
    setLoadingForms(true);
    setError(null);
    try {
      const list = await tiktokIntegrationAPI.getForms(advertiserId);
      setForms(list || []);
      if (list?.[0]?.form_id) {
        setSelectedForm(list[0].form_id);
        await loadLeads(advertiserId, list[0].form_id);
      } else {
        setLeads([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to fetch lead forms.');
    } finally {
      setLoadingForms(false);
    }
  };

  const loadLeads = async (advertiserId: string, formId: string) => {
    if (!advertiserId || !formId) return;
    setStatus('loading');
    try {
      const list = await tiktokIntegrationAPI.getLeads(advertiserId, formId);
      setLeads(list || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to fetch leads.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Integrations</p>
            <h1 className="text-2xl font-semibold text-slate-900">TikTok Lead Ads</h1>
            <p className="text-sm text-slate-500 mt-1">Connect TikTok Ads to automatically capture Lead Ads into the CRM.</p>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
              <AlertCircle className="h-5 w-5" />
              Not connected
            </span>
          )}
        </div>

        {(message || error) && (
          <div className={`rounded-md border px-4 py-3 ${message ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {message || error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">App Credentials</h2>
                <p className="text-sm text-slate-500">Use the TikTok app keys for this user. These are stored securely in the backend.</p>
              </div>
              <button
                onClick={saveCredentials}
                disabled={!credentials.client_id || !credentials.client_secret || status === 'loading'}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Client ID</label>
                <input
                  value={credentials.client_id}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, client_id: e.target.value }))}
                  placeholder="Enter TikTok client key"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Client Secret</label>
                <input
                  type="password"
                  value={credentials.client_secret}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, client_secret: e.target.value }))}
                  placeholder="Enter TikTok client secret"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Redirect URL:{' '}
                <code className="font-mono text-[11px]">
                  {`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/tiktok/callback`}
                </code>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Connection</h2>
                <p className="text-sm text-slate-500">Authorize access to pull advertisers, forms, and leads.</p>
              </div>
              <button
                onClick={refreshAdvertisers}
                disabled={!connected || status === 'loading'}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <button
              onClick={startOAuth}
              disabled={!credentials.client_id || status === 'loading'}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-slate-900 disabled:opacity-50"
            >
              {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connect TikTok Ads Account
            </button>

            <div className="mt-4 text-sm text-slate-600">
              <p>State and OAuth URL are generated per-user and validated server-side.</p>
              {settings?.expires_at && <p className="text-xs text-slate-500 mt-1">Access token expires at {new Date(settings.expires_at).toLocaleString()}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Advertiser Accounts</h2>
              <p className="text-sm text-slate-500">Loaded from TikTok Business API.</p>
            </div>
          </div>

          {advertisers.length === 0 ? (
            <p className="text-sm text-slate-500">No advertiser accounts yet. Connect and refresh to load them.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {advertisers.map((adv) => (
                <button
                  key={adv}
                  onClick={async () => {
                    setSelectedAdvertiser(adv);
                    await loadForms(adv);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm ${selectedAdvertiser === adv ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200'}`}
                >
                  {adv}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Lead Forms</h3>
                <p className="text-sm text-slate-500">Select a form to preview incoming leads.</p>
              </div>
              {loadingForms && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
            </div>
            {forms.length === 0 ? (
              <p className="text-sm text-slate-500">No forms found for the selected advertiser.</p>
            ) : (
              <div className="space-y-2">
                {forms.map((form) => (
                  <button
                    key={form.form_id || form.id}
                    onClick={() => {
                      if (selectedAdvertiser && (form.form_id || form.id)) {
                        const fid = form.form_id || (form.id as string);
                        setSelectedForm(fid);
                        loadLeads(selectedAdvertiser, fid);
                      }
                    }}
                    className={`w-full rounded-lg border px-4 py-3 text-left ${selectedForm === (form.form_id || form.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{form.name || form.form_id || 'Unnamed form'}</span>
                      <span className="text-xs text-slate-500">{form.status || 'active'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">ID: {form.form_id || form.id}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Leads Preview</h3>
                <p className="text-sm text-slate-500">Latest leads from the selected form.</p>
              </div>
              {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
            </div>
            {leads.length === 0 ? (
              <p className="text-sm text-slate-500">No leads yet.</p>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.lead_id || lead.email || lead.phone} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{lead.full_name || 'TikTok Lead'}</p>
                        <p className="text-xs text-slate-500">{lead.email || lead.phone}</p>
                      </div>
                      <span className="text-xs text-slate-500">{lead.created_time ? new Date(lead.created_time).toLocaleString() : 'New'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function TikTokIntegrationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TikTokIntegrationContent />
    </Suspense>
  );
}
