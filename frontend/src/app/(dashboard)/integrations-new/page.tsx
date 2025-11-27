'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useUi } from '@/store/uiStore';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Facebook,
  Music2,
  Globe,
  Megaphone,
  Link2,
  ExternalLink,
  TestTube,
  Activity
} from 'lucide-react';

interface Integration {
  id: number | string;
  name: string;
  provider: string;
  type: string;
  status: string;
  user_id?: number;
  created_by?: number;
  created_at: string;
  updated_at?: string;
  access_token?: string;
  page_name?: string;
  account_id?: string;
  url?: string;
  extra?: any;
  leads_count?: number;
  last_sync?: string;
}

interface WebsiteConnection {
  id: number;
  name: string;
  url: string;
  apiEndpoint?: string;
  apiKey?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  created_at: string;
  leads_count?: number;
}

interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  sourceMetrics: Record<string, {
    requests: number;
    successes: number;
    failures: number;
    avgTime: number;
    maxTime: number;
  }>;
}

interface OAuthStatus {
  facebook: { connected: boolean; connected_at?: string };
  tiktok: { connected: boolean; connected_at?: string };
  google: { connected: boolean; connected_at?: string };
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WebsiteConnection[]>([]);
  const [integrationMetrics, setIntegrationMetrics] = useState<IntegrationMetrics | null>(null);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>({
    facebook: { connected: false },
    tiktok: { connected: false },
    google: { connected: false }
  });
  const [activeTab, setActiveTab] = useState<'all' | 'websites' | 'social'>('all');
  const ui = useUi();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadIntegrations(),
        loadWebsites(),
        loadIntegrationMetrics(),
        loadOAuthStatus()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load some data');
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    try {
      const response = await api.get('/api/integrations');
      setIntegrations(response.data || []);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    }
  };

  const loadOAuthStatus = async () => {
    try {
      // This would be your actual API call to get OAuth status
      const response = await api.get('/api/integrations/oauth-status');
      setOauthStatus(response.data);
    } catch (error) {
      console.error('Error loading OAuth status:', error);
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Disconnect Integration',
        message: 'Are you sure you want to disconnect this integration?',
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      if (String(id).startsWith('tiktok_')) {
        toast.error('TikTok integrations cannot be deleted from this page');
        return;
      }

      await api.delete(`/api/integrations/${id}`);
      toast.success('Integration disconnected successfully');
      loadIntegrations();
      loadWebsites();
    } catch (error: any) {
      console.error('Error deleting integration:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect integration');
    }
  };

  const handleConnectFacebook = async () => {
    try {
      setConnectingProvider('facebook');
      const response = await api.get('/api/integrations/meta/oauth-url');
      if (response.data?.url) {
        openOAuthPopup(response.data.url, 'Facebook OAuth');
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Error connecting Facebook:', error);
      toast.error(error.response?.data?.message || 'Failed to connect Facebook');
      setConnectingProvider(null);
    }
  };

  const handleConnectTikTok = async () => {
    try {
      setConnectingProvider('tiktok');
      const response = await api.get('/api/integrations/tiktok/oauth-url');
      if (response.data?.url) {
        openOAuthPopup(response.data.url, 'TikTok OAuth');
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Error connecting TikTok:', error);
      toast.error(error.response?.data?.message || 'Failed to connect TikTok');
      setConnectingProvider(null);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnectingProvider('google');
      const response = await api.get('/api/integrations/google/oauth-url');
      if (response.data?.url) {
        openOAuthPopup(response.data.url, 'Google OAuth');
      } else {
        throw new Error('No OAuth URL received');
      }
    } catch (error: any) {
      console.error('Error connecting Google:', error);
      toast.error(error.response?.data?.message || 'Failed to connect Google');
      setConnectingProvider(null);
    }
  };

  const openOAuthPopup = (url: string, title: string) => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkPopup);
        setConnectingProvider(null);
        setTimeout(() => {
          loadAllData();
        }, 1000);
      }
    }, 500);
  };

  const testConnection = async (integrationId: number | string) => {
    try {
      const response = await api.post(`/api/integrations/${integrationId}/test`);
      if (response.data.success) {
        ui.alert({
          title: 'Success',
          message: 'Connection test successful!',
          variant: 'success',
        });
      } else {
        ui.alert({
          title: 'Test Failed',
          message: 'Connection test failed: ' + response.data.error,
          variant: 'error',
        });
      }
    } catch (error: any) {
      ui.alert({
        title: 'Test Failed',
        message: 'Connection test failed: ' + (error.response?.data?.message || error.message),
        variant: 'error',
      });
    }
  };

  const loadWebsites = async () => {
  try {
    const response = await api.get('/api/integrations');
    const integrations = Array.isArray(response.data) ? response.data : [];

    const websiteIntegrations = integrations
      .filter((integration: any) => integration.type === 'external_website')
      .map((integration: any) => ({
        id: integration.id,
        name: integration.name,
        endpoint: integration.endpoint_url || '',
        token: integration.api_key || '',

        // Check if both are valid
        status:
          integration.api_key && integration.endpoint_url
            ? 'connected'
            : 'disconnected',

        created_at: integration.created_at,
        user: integration.user_id
      }));

    setWebsites(websiteIntegrations);
  } catch (error) {
    console.error('Error loading websites:', error);
    setWebsites([]);
  }
};

  const loadIntegrationMetrics = async () => {
    try {
      const response = await api.get('/api/integrations/metrics');
      setIntegrationMetrics(response.data);
    } catch (error) {
      console.error('Error loading integration metrics:', error);
      setIntegrationMetrics(null);
    }
  };

  const deleteWebsite = async (websiteId: number, websiteName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Disconnect Website',
        message: `Are you sure you want to disconnect "${websiteName}"?`,
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      await api.delete(`/api/integrations/${websiteId}`);
      setWebsites(prev => prev.filter(website => website.id !== websiteId));
      toast.success('Website disconnected successfully!');
      loadIntegrationMetrics();
    } catch (error: any) {
      console.error('Error deleting website:', error);
      toast.error('Failed to disconnect website');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'facebook':
      case 'meta':
        return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'tiktok':
        return <Music2 className="h-5 w-5 text-pink-600" />;
      case 'google':
        return <Megaphone className="h-5 w-5 text-red-600" />;
      case 'wordpress':
      case 'website':
        return <Globe className="h-5 w-5 text-gray-600" />;
      default:
        return <Globe className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      connected: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Connected' },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      disconnected: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Disconnected' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Inactive' },
      error: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Error' },
      testing: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Testing' },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const filteredIntegrations = integrations.filter(integration => {
    if (activeTab === 'all') return true;
    if (activeTab === 'websites') return integration.type === 'external_website';
    if (activeTab === 'social') return ['facebook', 'tiktok', 'google'].includes(integration.provider);
    return true;
  });

  const connectedSocialIntegrations = integrations.filter(integration => 
    ['facebook', 'tiktok', 'google'].includes(integration.provider) && 
    integration.status === 'connected'
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Integrations</h1>
            <p className="text-gray-600 mt-1">Manage all integration connections across all accounts</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-50">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Integrations</p>
              <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.filter(i => i.status === 'connected').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-50">
              <Link2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Websites</p>
              <p className="text-2xl font-bold text-gray-900">{websites.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-orange-50">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {integrationMetrics ? 
                  `${Math.round((integrationMetrics.successfulRequests / Math.max(integrationMetrics.totalRequests, 1)) * 100)}%` 
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Connect Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Connect</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Facebook/Meta */}
          <button
            onClick={handleConnectFacebook}
            disabled={connectingProvider === 'facebook'}
            className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              oauthStatus.facebook.connected 
                ? 'border-green-200 bg-green-50' 
                : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <Facebook className="h-8 w-8 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Facebook</div>
              <div className="text-xs text-gray-500">
                {oauthStatus.facebook.connected ? 'Connected' : 'Connect Meta Ads'}
              </div>
            </div>
          </button>

          {/* TikTok */}
          <button
            onClick={handleConnectTikTok}
            disabled={connectingProvider === 'tiktok'}
            className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              oauthStatus.tiktok.connected 
                ? 'border-green-200 bg-green-50' 
                : 'border-pink-200 hover:border-pink-400 hover:bg-pink-50'
            }`}
          >
            <Music2 className="h-8 w-8 text-pink-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">TikTok</div>
              <div className="text-xs text-gray-500">
                {oauthStatus.tiktok.connected ? 'Connected' : 'Connect TikTok Ads'}
              </div>
            </div>
          </button>

          {/* Google Ads */}
          <button
            onClick={handleConnectGoogle}
            disabled={connectingProvider === 'google'}
            className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              oauthStatus.google.connected 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 hover:border-red-400 hover:bg-red-50'
            }`}
          >
            <Megaphone className="h-8 w-8 text-red-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Google Ads</div>
              <div className="text-xs text-gray-500">
                {oauthStatus.google.connected ? 'Connected' : 'Connect Google Ads'}
              </div>
            </div>
          </button>

          {/* Website */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            <Globe className="h-8 w-8 text-gray-600" />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Website</div>
              <div className="text-xs text-gray-500">Add Custom Site</div>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'all', name: 'All Integrations', count: integrations.length },
              { id: 'social', name: 'Social Platforms', count: connectedSocialIntegrations.length },
              { id: 'websites', name: 'Websites', count: websites.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                <span className={`ml-2 py-0.5 px-2 text-xs rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leads
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sync
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading integrations...
                </td>
              </tr>
            ) : filteredIntegrations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No integrations found</p>
                  <p className="text-gray-600 mb-4">Get started by connecting your first integration</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </button>
                </td>
              </tr>
            ) : (
              filteredIntegrations.map((integration) => (
                <tr key={integration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getProviderIcon(integration.provider)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {integration.provider || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{integration.name}</div>
                    {integration.page_name && (
                      <div className="text-xs text-gray-500">Page: {integration.page_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 capitalize">{integration.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(integration.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {integration.leads_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {integration.last_sync 
                      ? new Date(integration.last_sync).toLocaleDateString() 
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => testConnection(integration.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Test Connection"
                      >
                        <TestTube className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/integrations/${integration.id}`)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(integration.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete"
                        disabled={String(integration.id).startsWith('tiktok_')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <AddIntegrationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}

// Add Integration Modal Component (keep the existing implementation)
function AddIntegrationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'facebook',
    type: 'oauth',
    status: 'active',
    url: '',
    account_id: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/integrations', formData);
      toast.success('Integration created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating integration:', error);
      toast.error(error.response?.data?.message || 'Failed to create integration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Add New Integration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="My Integration"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="google">Google</option>
              <option value="wordpress">WordPress</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="oauth">OAuth</option>
              <option value="wordpress">WordPress</option>
              <option value="external_website">External Website</option>
              <option value="api">API</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL (Optional)</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account ID (Optional)</label>
            <input
              type="text"
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="123456789"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}