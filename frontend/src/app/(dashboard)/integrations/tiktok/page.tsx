'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

import { tiktokIntegrationAPI, TikTokLeadForm, TikTokSettings } from '@/lib/tiktokIntegrationAPI';

type TikTokStatus = 'connected' | 'disconnected' | 'error';

export default function TikTokIntegrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [settings, setSettings] = useState<TikTokSettings | null>(null);
  const [status, setStatus] = useState<TikTokStatus>('disconnected');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advertisers, setAdvertisers] = useState<string[]>([]);
  const [forms, setForms] = useState<TikTokLeadForm[]>([]);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await tiktokIntegrationAPI.getSettings();
      if (data) {
        setSettings(data);
        if (data.connected) {
          setStatus('connected');
          await loadAdvertisers();
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load TikTok settings');
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setMessage(null);
    try {
      const { url } = await tiktokIntegrationAPI.getOAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to start TikTok OAuth.');
      setConnecting(false);
    }
  };

  async function loadAdvertisers() {
    try {
      const { advertisers: ids } = await tiktokIntegrationAPI.listAdvertisers();
      setAdvertisers(ids);
      if (ids.length) {
        setSelectedAdvertiser(ids[0]);
        await loadForms(ids[0]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to fetch advertisers');
    }
  }

  async function loadForms(advertiserId: string) {
    try {
      const list = await tiktokIntegrationAPI.getForms(advertiserId);
      setForms(list || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to fetch lead forms');
      setForms([]);
    }
  }

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    loadSettings();

    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const msg = params.get('message');
    if (statusParam === 'success') {
      setStatus('connected');
      setMessage('TikTok connected successfully.');
      loadAdvertisers();
    } else if (statusParam === 'error') {
      setError(msg || 'TikTok connection failed.');
    }
  }, []);

  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/integrations/tiktok/callback`
      : '/api/integrations/tiktok/callback';

  return (
    <ProtectedRoute>
     
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                <span>Lead Integrations</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">TikTok Lead Ads</h1>
              <p className="mt-2 text-gray-600">Store your TikTok app keys per user and connect to pull leads.</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {(message || error) && (
            <div className={`mb-6 rounded-lg border px-4 py-3 ${message ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {message || error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">TikTok Connection</h2>
                <p className="text-gray-600 text-sm">Connect using the CRM’s TikTok app credentials (you do not need to enter keys).</p>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                Redirect URL: {redirectUrl}
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting || loading}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-60"
              >
                {connecting ? 'Connecting...' : 'Connect TikTok'}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Steps</h2>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>In TikTok for Business, add this redirect URL: {redirectUrl}</li>
                <li>Ensure scopes include: ad_management, business_management, leads.</li>
                <li>Click “Connect TikTok” to start OAuth and approve.</li>
                <li>When redirected back with success, your advertiser accounts and lead forms will load.</li>
              </ol>
              <div className="text-sm text-gray-600">
                Webhook endpoint (POST): <code className="font-mono text-xs break-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/tiktok/webhook` : '/api/integrations/tiktok/webhook'}</code>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Advertiser Accounts</h3>
                <button
                  onClick={loadAdvertisers}
                  disabled={status !== 'connected'}
                  className="text-sm px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              {advertisers.length === 0 ? (
                <p className="text-sm text-gray-600">No advertisers loaded yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {advertisers.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedAdvertiser(id);
                        loadForms(id);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm border ${selectedAdvertiser === id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50'}`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Lead Forms</h3>
              {selectedAdvertiser && <p className="text-xs text-gray-600">Advertiser: {selectedAdvertiser}</p>}
              {forms.length === 0 ? (
                <p className="text-sm text-gray-600">Select an advertiser to load forms.</p>
              ) : (
                <div className="space-y-2">
                  {forms.map((form) => (
                    <div key={form.form_id || form.id} className="border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{form.name || form.form_id || 'Form'}</span>
                        <span className="text-xs text-gray-500">{form.form_id || form.id}</span>
                      </div>
                      {form.status && <p className="text-xs text-gray-500">Status: {form.status}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
