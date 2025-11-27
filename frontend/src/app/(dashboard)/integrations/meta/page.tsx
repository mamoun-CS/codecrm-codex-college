'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { integrationsAPI } from '@/lib/integrationsAPI';
import { useUi } from '@/store/uiStore';

interface MetaConnection {
  status: 'connected' | 'disconnected' | 'error';
  page_id?: string;
  page_name?: string;
  leads_count?: number;
  last_sync?: string;
  pages?: any[];
  ad_accounts?: any[];
}

export default function MetaIntegrationPage() {
  const router = useRouter();
  const ui = useUi();
  const [metaConnection, setMetaConnection] = useState<MetaConnection>({ status: 'disconnected' });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    setUserName(parsed?.name || '');
    setUserRole(parsed?.role || '');
    loadMetaStatus();
  }, []);

  const loadMetaStatus = async () => {
    setLoading(true);
    try {
      const status = await integrationsAPI.getMetaStatus();
      setMetaConnection({
        status: status.connected ? 'connected' : 'disconnected',
        page_id: status.pages?.[0]?.id,
        page_name: status.pages?.[0]?.name,
        pages: status.pages || [],
        ad_accounts: status.ad_accounts || [],
        leads_count: status.pages?.length || 0,
        last_sync: status.expires_at,
      });

      if (status.connected) {
        await loadAccounts();
      } else {
        setAccounts([]);
        setForms([]);
      }
    } catch (error) {
      console.error('Error loading Meta status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await integrationsAPI.getMetaAdAccounts();
      setAccounts(response || []);
      if (response?.length) {
        const firstId = response[0].id || response[0].account_id;
        setSelectedAccount(firstId);
        await loadForms(firstId);
      }
    } catch (error) {
      console.error('Error loading Meta ad accounts:', error);
    }
  };

  const loadForms = async (accountId: string) => {
    try {
      setSelectedAccount(accountId);
      const response = await integrationsAPI.getMetaForms(accountId);
      setForms(response || []);
      if (response?.length) {
        setSelectedForm(response[0].id);
      } else {
        setSelectedForm('');
      }
    } catch (error) {
      console.error('Error loading Meta lead forms:', error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await integrationsAPI.connectOAuth('facebook');
    } catch (error) {
      console.error('Failed to start Meta OAuth:', error);
      ui.alert({
        title: 'Connection Failed',
        message: 'Failed to open Meta OAuth. Please try again.',
        variant: 'error',
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await integrationsAPI.disconnectOAuth('facebook');
      setMetaConnection({ status: 'disconnected' });
      setAccounts([]);
      setForms([]);
    } catch (error) {
      console.error('Failed to disconnect Meta:', error);
      ui.alert({
        title: 'Disconnection Failed',
        message: 'Failed to disconnect Meta integration.',
        variant: 'error',
      });
    }
  };

  const importLeads = async () => {
    if (!selectedForm) {
      ui.alert({
        title: 'Validation Error',
        message: 'Please select a lead form first.',
        variant: 'error',
      });
      return;
    }
    setImporting(true);
    try {
      const result = await integrationsAPI.importMetaLeads(selectedForm);
      ui.alert({
        title: 'Import Successful',
        message: `Imported ${result.imported} leads from this form.`,
        variant: 'success',
      });
      await loadMetaStatus();
    } catch (error: any) {
      ui.alert({
        title: 'Import Failed',
        message: 'Failed to import leads: ' + (error.response?.data?.message || error.message),
        variant: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading Meta integration...</div>
      </div>
    );
  }

  const connected = metaConnection.status === 'connected';

  return (
    <ProtectedRoute requiredPermission="view_integrations">
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <Link href="/integrations" className="text-blue-600 hover:text-blue-800 font-medium">
                  ← Back to Integrations
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Meta (Facebook) Integration</h1>
              </div>
              <div className="text-sm text-gray-600">
                {userName && `${userName}${userRole ? ` (${userRole})` : ''}`}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">📘</div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Meta Lead Ads</h3>
                    <p className="text-sm text-gray-600">
                      Connect to sync lead forms and import leads directly into the CRM.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {connected ? 'Connected' : 'Not Connected'}
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Connected Page</div>
                <div className="text-lg font-semibold text-gray-900">{metaConnection.page_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ad Accounts</div>
                <div className="text-lg font-semibold text-gray-900">{accounts.length || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Lead Forms</div>
                <div className="text-lg font-semibold text-gray-900">{forms.length || 0}</div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-4 py-4 flex justify-between">
              <div className="text-sm text-gray-600">
                {connected
                  ? `Token expires: ${metaConnection.last_sync ? new Date(metaConnection.last_sync).toLocaleString() : 'Unknown'}`
                  : 'Connect your Meta account to begin importing Facebook Lead Ads.'}
              </div>
              <div className="space-x-3">
                {connected ? (
                  <>
                    <button
                      onClick={loadMetaStatus}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connecting ? 'Opening Meta...' : 'Connect Meta'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {connected && (
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Lead Forms</h3>
                  <p className="text-sm text-gray-600">
                    Select an ad account and lead form to import existing leads. New leads will arrive via webhook.
                  </p>
                </div>
                <button
                  onClick={importLeads}
                  disabled={!selectedForm || importing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Leads'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Account</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={selectedAccount}
                    onChange={(e) => loadForms(e.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id || account.account_id} value={account.id || account.account_id}>
                        {account.name || account.id || account.account_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Form</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={selectedForm}
                    onChange={(e) => setSelectedForm(e.target.value)}
                  >
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name || form.id}
                      </option>
                    ))}
                  </select>
                  {!forms.length && <p className="text-sm text-gray-500 mt-2">No lead forms found for this account.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
