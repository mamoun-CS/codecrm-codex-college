'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock3,
  Copy,
  FileSpreadsheet,
  FlaskConical,
  Globe2,
  Link2,
  Loader2,
  Megaphone,
  Music2,
  Server,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { integrationsAPI } from '@/lib/integrationsAPI';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useUi } from '@/store/uiStore';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'marketing' | 'user';
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
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

interface TestResult {
  success: boolean;
  lead_id?: number;
  error?: string;
  processing_time_ms: number;
}

interface WordPressSite {
  id: number;
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  created_at: string;
  leads_count?: number;
}

interface AdPlatformConnection {
  id: number;
  platform: 'google' | 'facebook' | 'tiktok' | 'whatsapp' | 'other';
  name: string;
  apiKey?: string;
  accessToken?: string;
  accountId?: string;
  webhookUrl?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  created_at: string;
  leads_count?: number;
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

interface WordPressForm {
  id: number;
  wordpress_site_id: number;
  form_id: string;
  name: string;
  fields_mapping: Record<string, string>;
  status: 'active' | 'inactive';
  created_at: string;
  submissions_count?: number;
}

interface MetaConnection {
  id?: number;
  name?: string;
  status: 'connected' | 'disconnected' | 'error';
  leads_count?: number;
  last_sync?: string;
  accounts_count?: number;
  forms_count?: number;
  page_id?: string;
  page_name?: string;
  webhook_status?: string;
}

interface OAuthStatus {
  facebook: {
    connected: boolean;
    connected_at?: string;
  };
  tiktok: {
    connected: boolean;
    connected_at?: string;
  };
}

interface TikTokConnection {
  id: number;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  leads_count?: number;
  last_sync?: string;
}

interface Integration {
  id: number;
  name: string;
  type?: 'oauth' | 'external_website' | 'wordpress' | 'api' | 'ad_platform' | 'form_mapping' | 'webhook';
  provider: 'facebook' | 'meta' | 'tiktok' | 'google' | 'wordpress' | 'external_website' | 'other';
  status?: 'active' | 'inactive' | 'error' | 'testing' | 'connected' | 'disconnected';
  slug?: string;
  url?: string;
  endpoint_url?: string;
  webhook_url?: string;
  webhook_config?: Record<string, any>;
  account_id?: string;
  api_key?: string;
  access_token?: string;
  refresh_token?: string;
  // Facebook specific
  page_id?: string;
  page_name?: string;
  // Timestamps
  created_at: string;
  created_by?: number;
  expires_at?: string;
  connected_at?: string;
  // Monitoring
  user_id?: number;
  leads_count?: number;
  // Additional data
  extra?: Record<string, any>;
}


const useIntegrationsManager = () => {
  const [state, setState] = useState({
    wordpress: { sites: [], forms: [], loading: false },
    adPlatforms: { platforms: [], loading: false },
    websites: { sites: [], loading: false },
    metrics: null,
    oauthStatus: { facebook: { connected: false }, tiktok: { connected: false } }
  });

  const updateState = (key: string, value: any) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  return { state, updateState };
};


export default function IntegrationsPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [wordpressSites, setWordpressSites] = useState<WordPressSite[]>([]);
  const [wordpressForms, setWordpressForms] = useState<WordPressForm[]>([]);
  const [adPlatforms, setAdPlatforms] = useState<AdPlatformConnection[]>([]);
  const [websites, setWebsites] = useState<WebsiteConnection[]>([]);
  const { state, updateState } = useIntegrationsManager();
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([]);
  const ui = useUi();

  const [tiktokConnection, setTikTokConnection] = useState<TikTokConnection>({
    id: 1,
    name: 'TikTok Campaign #1',
    status: 'connected',
    leads_count: 142,
    last_sync: '2025-11-12T12:05:00Z'
  });

  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>({
    facebook: { connected: false },
    tiktok: { connected: false }
  });
  const [loading, setLoading] = useState(true);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [showAddPlatformModal, setShowAddPlatformModal] = useState(false);
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [websiteWizardStep, setWebsiteWizardStep] = useState(1);
  const [createdIntegration, setCreatedIntegration] = useState<any>(null);
  const [waitingForRequest, setWaitingForRequest] = useState(false);
  const [testLeadReceived, setTestLeadReceived] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null);
  const [saving, setSaving] = useState(false);

  // Integration testing states
  const [integrationMetrics, setIntegrationMetrics] = useState<IntegrationMetrics | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('google');

  const tiktokConnected = oauthStatus?.tiktok?.connected ?? false;
  const tiktokConnectedAt = oauthStatus?.tiktok?.connected_at;

  // Form states
  const [siteForm, setSiteForm] = useState({
    name: '',
    url: '',
    apiKey: '',
  });

  const [platformForm, setPlatformForm] = useState({
    platform: 'google' as 'google' | 'facebook' | 'tiktok' | 'whatsapp' | 'other',
    name: '',
    apiKey: '',
    accessToken: '',
    accountId: '',
    webhookUrl: '',
  });

  const [websiteForm, setWebsiteForm] = useState({
    name: '',
    url: '',
    apiEndpoint: '',
    apiKey: '',
  });

  const [formMapping, setFormMapping] = useState({
    form_id: '',
    name: '',
    fields_mapping: {
      name: 'full_name',
      email: 'email',
      phone: 'phone',
      message: 'notes',
    },
  });

 const loadWordPressSites = async () => {
 try {
   const response = await api.get('/api/integrations/wordpress/sites');
   setWordpressSites(Array.isArray(response.data) ? response.data : []);
 } catch (error) {
   // Silently handle WordPress sites loading failure
   setWordpressSites([]);
 }
};


  const loadWordPressForms = async () => {
    try {
      // Mock data with sample form mappings
      const mockForms: WordPressForm[] = [
     
      ];
      setWordpressForms(mockForms);
    } catch (error) {
      console.error('Error loading WordPress forms:', error);
      setWordpressForms([]);
    }
  };

  const loadAdPlatforms = async () => {
    try {
      const mockPlatforms: AdPlatformConnection[] = [
      ];
      setAdPlatforms(mockPlatforms);
    } catch (error) {
      console.error('Error loading ad platforms:', error);
      setAdPlatforms([]);
    }
  };

 const loadWebsites = async () => {
 try {
   const response = await api.get('/api/integrations');
   // ✅ API returns { data: [...], meta: {...} } format
   const integrations = Array.isArray(response.data?.data) ? response.data.data :
                        Array.isArray(response.data) ? response.data : [];

   console.log('🔍 All integrations from API:', integrations.length);
   console.log('🔍 Sample integration:', integrations[0]);

   // ✅ Filter ONLY for external_website integrations (not wordpress)
   const websiteIntegrations = integrations
     .filter((integration: Integration) => {
       const isExternalWebsite = integration.type === 'external_website';
       if (isExternalWebsite) {
         console.log('✅ Found external_website:', integration.name, integration.type);
       }
       return isExternalWebsite;
     })
     .map((integration: Integration) => ({
       id: integration.id,
       name: integration.name,
       url: integration.url || '',
       apiEndpoint: integration.endpoint_url || '',
       apiKey: integration.api_key || integration.extra?.api_key || '',
       status: (integration.status === 'active' || integration.status === 'connected') ? 'connected' as const :
               integration.status === 'error' ? 'error' as const : 'disconnected' as const,
       created_at: integration.created_at,
       leads_count: integration.leads_count || 0
     }));

   console.log('🔍 Filtered external websites:', websiteIntegrations.length);
   setWebsites(websiteIntegrations);
 } catch (error) {
   console.error('❌ Error loading websites:', error);
   // Silently handle websites loading failure
   setWebsites([]);
 }
};

  const loadIntegrationMetrics = async () => {
    try {
      const response = await api.get('/api/integrations/metrics');
      setIntegrationMetrics(response.data);
    } catch (error) {
      // Silently handle metrics loading failure
      setIntegrationMetrics(null);
    }
  };

const loadOAuthStatus = async () => {
  try {
    const status = await integrationsAPI.getOAuthStatus();
    setOauthStatus(status);

    const metaStatus = await integrationsAPI.getMetaStatus();

    // Handle multiple Meta connections
    if (metaStatus.connected && metaStatus.pages?.length > 0) {
      const connections: MetaConnection[] = [];

      for (const page of metaStatus.pages) {
        try {
          const accounts = await integrationsAPI.getMetaAdAccounts();
          const firstId = accounts?.[0]?.id || accounts?.[0]?.account_id;
          const forms = firstId ? await integrationsAPI.getMetaForms(firstId) : [];

          connections.push({
            id: page.id,
            name: page.name,
            status: 'connected',
            page_id: page.id,
            page_name: page.name,
            leads_count: 0, // This would need to be calculated per page
            last_sync: metaStatus.expires_at,
            accounts_count: accounts?.length || 0,
            forms_count: forms?.length || 0,
            webhook_status: 'active', // This would need to be checked per page
          });
        } catch (err) {
          // Silently handle page detail loading failure
          connections.push({
            id: page.id,
            name: page.name,
            status: 'error',
            page_id: page.id,
            page_name: page.name,
            leads_count: 0,
            last_sync: metaStatus.expires_at,
            accounts_count: 0,
            forms_count: 0,
          });
        }
      }

      setMetaConnections(connections);
    } else {
      setMetaConnections([]);
    }
  } catch (error) {
    // Silently handle OAuth status loading failure
    setOauthStatus({ facebook: { connected: false }, tiktok: { connected: false } });
    setMetaConnections([]);
  }
};

const deleteIntegration = async (integrationId: number, integrationName: string) => {
  const confirmed = await new Promise<boolean>((resolve) => {
    ui.confirm({
      title: 'Disconnect Integration',
      message: `Are you sure you want to disconnect "${integrationName}"?`,
      tone: 'danger',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

  if (!confirmed) return;

  try {
    await api.delete(`/api/integrations/${integrationId}`);

    // Remove integration from any locally cached lists
    setWebsites(prev => prev.filter(website => website.id !== integrationId));
    setWordpressSites(prev => prev.filter(site => site.id !== integrationId));
    setAdPlatforms(prev => prev.filter(platform => platform.id !== integrationId));

    ui.alert({
      title: 'Success',
      message: 'Integration disconnected successfully!',
      variant: 'success',
    });
    loadIntegrationMetrics();
  } catch (error: any) {
    console.error('Error deleting integration:', error);
    ui.alert({
      title: 'Error',
      message: error.response?.data?.message || 'Failed to disconnect integration',
      variant: 'error',
    });
  }
};

const testIntegration = async (source: string, testData: any): Promise<TestResult> => {
    try {
      const response = await api.post(`/api/integrations/webhook/${source}`, testData);
      return response.data;
    } catch (error: any) {
      console.error(`Integration test error for ${source}:`, error);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message,
        processing_time_ms: error.response?.data?.processing_time_ms || 0,
      };
    }
  };

const runIntegrationTests = async () => {
    setTesting(true);
    setTestResults([]);

    const testCases = [
      {
        source: 'google',
        data: {
          user_column_data: [
            { column_id: 'FULL_NAME', string_value: 'Test Google User ' + Date.now() },
            { column_id: 'PHONE_NUMBER', string_value: '+1234567890' },
            { column_id: 'EMAIL', string_value: 'google' + Date.now() + '@example.com' },
            { column_id: 'COUNTRY', string_value: 'USA' }
          ],
          campaign_name: 'Test Google Campaign',
          adgroup_name: 'Test Ad Group',
          ad_id: '12345',
          form_id: '67890',
          lead_id: '99999'
        }
      },
      {
        source: 'meta',
        data: {
          lead: {
            field_data: [
              { name: 'full_name', values: ['Test Meta User ' + Date.now()] },
              { name: 'phone', values: ['+1555123456'] },
              { name: 'email', values: ['meta' + Date.now() + '@example.com'] },
              { name: 'country', values: ['UK'] }
            ],
            ad_id: '78901',
            adset_id: '23456',
            form_id: '34567',
            id: '33333',
            campaign_name: 'Test Meta Campaign'
          }
        }
      },
      {
        source: 'tiktok',
        data: {
          lead: {
            properties: {
              full_name: 'Test TikTok User ' + Date.now(),
              phone: '+1444987654',
              email: 'tiktok' + Date.now() + '@example.com',
              country: 'Australia'
            },
            ad_id: '11223',
            form_id: '44556',
            lead_id: '44444',
            campaign_name: 'Test TikTok Campaign'
          }
        }
      },
      {
        source: 'website',
        data: {
          full_name: 'Test Website User ' + Date.now(),
          phone: '+1666777888',
          email: 'website' + Date.now() + '@example.com',
          country: 'Germany',
          city: 'Berlin',
          language: 'German',
          campaign_id: 1,
          utm_source: 'website',
          utm_medium: 'organic',
          utm_campaign: 'Newsletter'
        }
      },
      {
        source: 'external_api',
        data: {
          full_name: 'Test External API User ' + Date.now(),
          phone: '+1777888999',
          email: 'external' + Date.now() + '@example.com',
          country: 'France',
          city: 'Paris',
          source: 'external_api',
          utm_source: 'partner',
          utm_medium: 'api',
          utm_campaign: 'Affiliate Program'
        }
      }
    ];



    const results: TestResult[] = [];

    for (const testCase of testCases) {
      const result = await testIntegration(testCase.source, testCase.data);
      results.push(result);
      setTestResults(prev => [...prev, result]);
    }

    setTesting(false);
    // Reload metrics after testing
    await loadIntegrationMetrics();
  };

const loadAllData = async () => {
  setLoading(true);
  try {
    await Promise.all([
      loadWordPressSites(),
      loadWordPressForms(),
      loadAdPlatforms(),
      loadWebsites(),
      loadIntegrationMetrics(),
      loadOAuthStatus()
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
};

 const connectWordPressSite = async () => {
  if (!siteForm.name.trim() || !siteForm.url.trim() || !siteForm.apiKey.trim()) {
    ui.alert({
      title: 'Validation Error',
      message: 'All fields are required',
      variant: 'error',
    });
    return;
  }

  setSaving(true);
  try {
    const response = await api.post('/api/integrations/wordpress/site', {
      name: siteForm.name,
      url: siteForm.url,
      apiKey: siteForm.apiKey
    });

    setWordpressSites(prev => [...prev, response.data]);
    setSiteForm({ name: '', url: '', apiKey: '' });
    setShowAddSiteModal(false);
    ui.alert({
      title: 'Success',
      message: 'WordPress site connected successfully!',
      variant: 'success',
    });
  } catch (error: any) {
    console.error('Error connecting WordPress site:', error);
    ui.alert({
      title: 'Error',
      message: error.response?.data?.message || 'Failed to connect WordPress site',
      variant: 'error',
    });
  } finally {
    setSaving(false);
  }
};

  const createFormMapping = async () => {
    if (!selectedSite || !formMapping.form_id.trim() || !formMapping.name.trim()) {
      ui.alert({
        title: 'Validation Error',
        message: 'All fields are required',
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement actual backend integration
      const mockForm: WordPressForm = {
        id: Date.now(),
        wordpress_site_id: selectedSite.id,
        form_id: formMapping.form_id,
        name: formMapping.name,
        fields_mapping: formMapping.fields_mapping,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        submissions_count: 0
      };
      setWordpressForms(prev => [...prev, mockForm]);
      setFormMapping({
        form_id: '',
        name: '',
        fields_mapping: {
          name: 'full_name',
          email: 'email',
          phone: 'phone',
          message: 'notes',
        },
      });
      setShowAddFormModal(false);
      setSelectedSite(null);
      ui.alert({
        title: 'Success',
        message: 'Form mapping created successfully!',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error creating form mapping:', error);
      ui.alert({
        title: 'Error',
        message: 'Failed to create form mapping',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

 const testConnection = async (siteId: number) => {
  try {
    const response = await api.post(`/api/integrations/wordpress/sites/${siteId}/test`);
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

  const syncForms = async (siteId: number) => {
   try {
     const response = await api.post(`/api/integrations/wordpress/sites/${siteId}/sync-forms`);
     if (response.data.success) {
       ui.alert({
         title: 'Success',
         message: 'Forms synchronized successfully!',
         variant: 'success',
       });
       loadWordPressForms(); // refresh mappings after sync
     } else {
       ui.alert({
         title: 'Sync Failed',
         message: 'Sync failed: ' + response.data.error,
         variant: 'error',
       });
     }
   } catch (error: any) {
     ui.alert({
       title: 'Sync Failed',
       message: 'Failed to sync forms: ' + (error.response?.data?.message || error.message),
       variant: 'error',
     });
   }
 };

  const toggleFormStatus = async (formId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      // Mock success since backend endpoints don't exist yet
      setWordpressForms(prev =>
        prev.map(form =>
          form.id === formId ? { ...form, status: newStatus as 'active' | 'inactive' } : form
        )
      );
    } catch (error: any) {
      ui.alert({
        title: 'Error',
        message: 'Failed to update form status',
        variant: 'error',
      });
    }
  };

  const deleteWordPressSite = async (siteId: number, siteName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Disconnect Site',
        message: `Are you sure you want to disconnect "${siteName}"?`,
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      await api.delete(`/api/integrations/${siteId}`);
      setWordpressSites(prev => prev.filter(site => site.id !== siteId));
      ui.alert({
        title: 'Success',
        message: 'WordPress site disconnected successfully!',
        variant: 'success',
      });
      loadIntegrationMetrics();
    } catch (error: any) {
      ui.alert({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to disconnect site',
        variant: 'error',
      });
    }
  };

  const deleteFormMapping = async (formId: number, formName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Delete Form Mapping',
        message: `Are you sure you want to delete the mapping for "${formName}"?`,
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      // Mock success since backend endpoints don't exist yet
      setWordpressForms(prev => prev.filter(form => form.id !== formId));
      ui.alert({
        title: 'Success',
        message: 'Form mapping deleted successfully!',
        variant: 'success',
      });
    } catch (error: any) {
      ui.alert({
        title: 'Error',
        message: 'Failed to delete form mapping',
        variant: 'error',
      });
    }
  };

  const connectAdPlatform = async () => {
    if (!platformForm.name.trim()) {
      ui.alert({
        title: 'Validation Error',
        message: 'Platform name is required',
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement actual backend integration
      const mockPlatform: AdPlatformConnection = {
        id: Date.now(),
        platform: platformForm.platform,
        name: platformForm.name,
        apiKey: platformForm.apiKey || undefined,
        accessToken: platformForm.accessToken || undefined,
        accountId: platformForm.accountId || undefined,
        webhookUrl: platformForm.webhookUrl || undefined,
        status: 'connected' as const,
        created_at: new Date().toISOString(),
        leads_count: 0
      };
      setAdPlatforms(prev => [...prev, mockPlatform]);
      setPlatformForm({
        platform: 'google',
        name: '',
        apiKey: '',
        accessToken: '',
        accountId: '',
        webhookUrl: '',
      });
      setShowAddPlatformModal(false);
      ui.alert({
        title: 'Success',
        message: `${platformForm.platform} platform connected successfully!`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error connecting ad platform:', error);
      ui.alert({
        title: 'Error',
        message: 'Failed to connect ad platform',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

 const connectWebsite = async () => {
  if (!websiteForm.name.trim() || !websiteForm.url.trim()) {
    ui.alert({
      title: 'Validation Error',
      message: 'Name and URL are required',
      variant: 'error',
    });
    return;
  }

  setSaving(true);
  try {
    // Use the register-website endpoint
    const response = await api.post('/api/integrations/register-website', {
      name: websiteForm.name,
      url: websiteForm.url,
    });

    // ✅ Map the response to Integration format with EXTERNAL_WEBSITE type
    const integration: Integration = {
      id: response.data.integration_id,
      name: websiteForm.name,
      provider: 'other', // External website, not wordpress
      type: 'external_website', // ✅ Correct type
      status: 'active',
      url: websiteForm.url,
      endpoint_url: response.data.endpoint_url || response.data.api_url,
      api_key: response.data.api_key || response.data.auth_token,
      slug: response.data.slug,
      created_at: new Date().toISOString(),
      leads_count: 0,
    };

    setCreatedIntegration(integration);

    // Move to step 2 - show API details
    setWebsiteWizardStep(2);

    // Reload websites list
    await loadWebsites();

    // Reset form
    setWebsiteForm({
      name: '',
      url: '',
      apiEndpoint: '',
      apiKey: '',
    });

  } catch (error: any) {
    console.error('Error connecting website:', error);
    ui.alert({
      title: 'Error',
      message: error.response?.data?.message || 'Failed to connect website',
      variant: 'error',
    });
  } finally {
    setSaving(false);
  }
};

  const resetWebsiteWizard = () => {
    setWebsiteWizardStep(1);
    setCreatedIntegration(null);
    setWaitingForRequest(false);
    setTestLeadReceived(null);
    setShowAddWebsiteModal(false);
    // Refresh data after closing modal
    loadWebsites();
    loadIntegrationMetrics();
  };

  const testIntegrationEndpoint = async () => {
    if (!createdIntegration) return;

    // Instead of sending a test request, move to step 3 to wait for external requests
    setWebsiteWizardStep(3);
    setWaitingForRequest(true);
  };

  const deleteAdPlatform = async (platformId: number, platformName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Disconnect Platform',
        message: `Are you sure you want to disconnect "${platformName}"?`,
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      // Mock success since backend endpoints don't exist yet
      setAdPlatforms(prev => prev.filter(platform => platform.id !== platformId));
      ui.alert({
        title: 'Success',
        message: 'Ad platform disconnected successfully!',
        variant: 'success',
      });
    } catch (error: any) {
      ui.alert({
        title: 'Error',
        message: 'Failed to disconnect platform',
        variant: 'error',
      });
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
      ui.alert({
        title: 'Success',
        message: 'Website disconnected successfully!',
        variant: 'success',
      });
      // Refresh data
      loadWebsites();
      loadIntegrationMetrics();
    } catch (error: any) {
      console.error('Error deleting website:', error);
      ui.alert({
        title: 'Error',
        message: 'Failed to disconnect website',
        variant: 'error',
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleApiError = (error: any, defaultMessage: string) => {
  const message = error.response?.data?.message || error.response?.data?.error || error.message || defaultMessage;
  console.error('API Error:', error);
  return message;
};




  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const userObj = JSON.parse(userData);
    setUser(userObj);

    // Initialize Socket.IO connection
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001/realtime';
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Integrations page socket connection error:', error.message);
      setSocketConnected(false);
    });

    // Listen for integration-related events
    newSocket.on('integration:created', (data) => {
      loadWebsites(); // Refresh websites list
      loadIntegrationMetrics(); // Refresh metrics
    });

    newSocket.on('integration:updated', (data) => {
      loadWebsites(); // Refresh websites list
      loadIntegrationMetrics(); // Refresh metrics
    });

    newSocket.on('integration:deleted', (data) => {
      loadWebsites(); // Refresh websites list
      loadIntegrationMetrics(); // Refresh metrics
    });

    newSocket.on('lead:created', (data) => {
      loadIntegrationMetrics(); // Refresh metrics to show updated counts
      loadWebsites(); // Refresh websites to show updated lead counts
      loadWordPressSites(); // Refresh WordPress sites to show updated lead counts
    });

    newSocket.on('integration:test', (data) => {
      // Could show a notification or update test results
    });

    setSocket(newSocket);

    loadAllData();

    // Cleanup socket on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-refresh TikTok status
  useEffect(() => {
    const fetchTikTokStatus = async () => {
      try {
        const res = await api.get('/api/integrations/tiktok/status');
        setTikTokConnection(res.data);
      } catch (error) {
        console.error('Error fetching TikTok status:', error);
        // Keep current state if API fails
      }
    };

    fetchTikTokStatus();
    const interval = setInterval(fetchTikTokStatus, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const message = urlParams.get('message');

    if (success === 'true' && message) {
      ui.alert({
        title: 'Success',
        message: decodeURIComponent(message),
        variant: 'success',
      });
      // Refresh OAuth status
      loadOAuthStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'true' && message) {
      ui.alert({
        title: 'Error',
        message: decodeURIComponent(message),
        variant: 'error',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access denied</h2>
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="view_integrations">
      <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Welcome, {user.name} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Integration Status Overview */}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">WordPress</h3>
              <p className="text-3xl font-bold text-blue-600">{wordpressSites.length}</p>
              <p className="text-sm text-gray-600">Sites</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ad Platforms</h3>
              <p className="text-3xl font-bold text-green-600">{adPlatforms.length}</p>
              <p className="text-sm text-gray-600">Connected</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Websites</h3>
              <p className="text-3xl font-bold text-purple-600">{websites.length}</p>
              <p className="text-sm text-gray-600">Connected</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Form Mappings</h3>
              <p className="text-3xl font-bold text-orange-600">{wordpressForms.length}</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Total Leads</h3>
              <p className="text-3xl font-bold text-indigo-600">
                {(Array.isArray(wordpressSites) ? wordpressSites.reduce((sum, site) => sum + (site.leads_count || 0), 0) : 0) +
                 (Array.isArray(adPlatforms) ? adPlatforms.reduce((sum, platform) => sum + (platform.leads_count || 0), 0) : 0) +
                 (Array.isArray(websites) ? websites.reduce((sum, website) => sum + (website.leads_count || 0), 0) : 0)}
              </p>
              <p className="text-sm text-gray-600">From all sources</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Health</h3>
              <p className="text-3xl font-bold text-green-600">
                {integrationMetrics ? `${Math.round((integrationMetrics.successfulRequests / Math.max(integrationMetrics.totalRequests, 1)) * 100)}%` : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Success rate</p>
            </div>
          </div>
        </div>

        {/* Integration Sections */}
        <div className="space-y-8">
          {/* Main Integration Platforms */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Integration Platforms
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Connect Google Ads, Facebook, TikTok, WhatsApp, and other advertising platforms
              </p>
            </div>
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Google Ads */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl text-blue-600"><Megaphone className="h-8 w-8" /></div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Ad Platform
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Google Ads</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Sync Google Lead Forms and capture leads automatically
                  </p>
                  <button
                    onClick={() => router.push('/integrations/google')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Configure
                  </button>
                </div>

                {/* Meta (Facebook & Instagram) */}
                {metaConnections.length > 0 ? (
                  metaConnections.map((connection, index) => (
                    <div key={connection.id || index} className="border border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-br from-indigo-50 to-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-3xl text-indigo-600"><Megaphone className="h-8 w-8" /></div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          connection.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {connection.status === 'connected' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">Meta: {connection.page_name}</h4>
                      <p className="text-sm text-gray-600 mb-3">Facebook & Instagram Lead Ads Integration</p>
                      {connection.last_sync && (
                        <p className="text-xs text-gray-500 mb-2">
                          Expires: {new Date(connection.last_sync).toLocaleString()}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{connection.accounts_count ?? 0}</div>
                          <div className="text-gray-500">Accounts</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{connection.forms_count ?? 0}</div>
                          <div className="text-gray-500">Forms</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{connection.leads_count ?? 0}</div>
                          <div className="text-gray-500">Leads</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {connection.status === 'connected' ? (
                          <>
                            <button
                              onClick={() => router.push('/integrations/meta')}
                              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                            >
                              Open Meta Dashboard
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await integrationsAPI.disconnectOAuth('facebook');
                                  await loadOAuthStatus();
                                } catch (error) {
                                  ui.alert({
                                    title: 'Disconnect Failed',
                                    message: 'Failed to disconnect Facebook integration',
                                    variant: 'error',
                                  });
                                }
                              }}
                              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => router.push('/integrations/meta')}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                          >
                            Connect Meta
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-br from-indigo-50 to-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl text-indigo-600"><Megaphone className="h-8 w-8" /></div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Not Connected
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Meta Ads</h4>
                    <p className="text-sm text-gray-600 mb-3">Facebook & Instagram Lead Ads Integration</p>
                    <button
                      onClick={() => router.push('/integrations/meta')}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Connect Meta
                    </button>
                  </div>
                )}
                {/* TikTok Ads */}
                <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-pink-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all transform">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl text-pink-600"><Music2 className="h-8 w-8" /></div>
                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tiktokConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                     }`}>
                      {tiktokConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">TikTok Ads</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Lead Generation from TikTok Ads
                  </p>
                  {tiktokConnected && tiktokConnectedAt && (
                    <p className="text-xs text-gray-500 mb-2">
                      Connected: {new Date(tiktokConnectedAt).toLocaleString()}
                    </p>
                  )}
                  {tiktokConnected ? (
                    <>
                      <button
                        onClick={() => router.push('/integrations/tiktok')}
                        className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                      >
                        Configure
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await integrationsAPI.disconnectOAuth('tiktok');
                            await loadOAuthStatus();
                          } catch (error) {
                            ui.alert({
                              title: 'Disconnect Failed',
                              message: 'Failed to disconnect TikTok integration',
                              variant: 'error',
                            });
                          }
                        }}
                        className="mt-2 w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => router.push('/integrations/tiktok')}
                      className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                    >
                      Connect TikTok
                    </button>
                  )}
                </div>

                {/* Website API */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl text-purple-600"><Server className="h-8 w-8" /></div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      External
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Website API</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect external websites via API
                  </p>
                  <button
                    onClick={() => router.push('/integrations/website')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WordPress Integration Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  WordPress Integration
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Connect your WordPress sites to automatically capture leads from contact forms
                </p>
              </div>
              {(user.role === 'admin' || user.role === 'manager' || user.role === 'marketing') && (
                <button
                  onClick={() => setShowAddSiteModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Connect Site</span>
                </button>
              )}
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wordpressSites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        site.status === 'connected' ? 'bg-green-100 text-green-800' :
                        site.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {site.leads_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {site.lastSync ? new Date(site.lastSync).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => testConnection(site.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => syncForms(site.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Sync
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSite(site);
                            setShowAddFormModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Add Form
                        </button>
                        {(user.role === 'admin' || user.role === 'manager') && (
                          <button
                            onClick={() => deleteWordPressSite(site.id, site.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wordpressSites.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Globe2 className="h-10 w-10 mx-auto text-gray-400" />
              <p className="text-lg">No WordPress sites connected</p>
              <p className="text-sm mt-2">Connect your first WordPress site to start capturing leads automatically</p>
            </div>
          )}
          </div>

          {/* Ad Platforms Integration Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Advertising Platforms
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Connect Google Ads, Facebook, TikTok, WhatsApp, and other advertising platforms
                </p>
              </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adPlatforms.map((platform) => (
                    <tr key={platform.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {platform.platform === 'google' && <Megaphone className="h-5 w-5 text-blue-600" />}
                            {platform.platform === 'facebook' && <Megaphone className="h-5 w-5 text-indigo-600" />}
                            {platform.platform === 'tiktok' && <Music2 className="h-5 w-5 text-pink-600" />}
                            {platform.platform === 'whatsapp' && <Link2 className="h-5 w-5 text-green-600" />}
                            {platform.platform === 'other' && <Link2 className="h-5 w-5 text-gray-600" />}
                          </span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {platform.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{platform.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-mono">
                          {platform.platform === 'google' ? '/api/integrations/google-ads' :
                           platform.platform === 'facebook' ? '/api/integrations/meta' :
                           platform.platform === 'tiktok' ? '/api/integrations/tiktok' :
                           'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          platform.status === 'connected' ? 'bg-green-100 text-green-800' :
                          platform.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {platform.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {platform.leads_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {platform.lastSync ? new Date(platform.lastSync).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => testConnection(platform.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Test
                          </button>
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <button
                              onClick={() => deleteAdPlatform(platform.id, platform.name)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Disconnect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adPlatforms.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                 <Megaphone className="h-10 w-10 mx-auto text-gray-400" />
                <p className="text-lg">No advertising platforms connected</p>
                <p className="text-sm mt-2">Connect Google Ads, Facebook, TikTok, or other platforms to capture leads automatically</p>
              </div>
            )}
          </div>

          {/* Websites Integration Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  External Websites
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Connect any website or external service to capture leads via API
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {websites.map((website) => (
                    <tr key={website.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{website.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{website.url}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          website.status === 'connected' ? 'bg-green-100 text-green-800' :
                          website.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {website.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {website.leads_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {website.lastSync ? new Date(website.lastSync).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => testConnection(website.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Test
                          </button>
                          {(user.role === 'admin' || user.role === 'manager') && (
                            <button
                              onClick={() => deleteWebsite(website.id, website.name)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Disconnect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {websites.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                 <Link2 className="h-10 w-10 mx-auto text-gray-400" />
                <p className="text-lg">No external websites connected</p>
                <p className="text-sm mt-2">Connect any website or service to capture leads via API integration</p>
              </div>
            )}
          </div>

          {/* Form Mappings Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Form Mappings
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Map WordPress form fields to lead properties
              </p>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WordPress Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wordpressForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{form.name}</div>
                      <div className="text-xs text-gray-500">ID: {form.form_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {wordpressSites.find(site => site.id === form.wordpress_site_id)?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        form.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {form.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {form.submissions_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(form.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleFormStatus(form.id, form.status)}
                          className={`${
                            form.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {form.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteFormMapping(form.id, form.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wordpressForms.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-400" />
              <p className="text-lg">No form mappings configured</p>
              <p className="text-sm mt-2">Connect a WordPress site first, then map your forms to start capturing leads</p>
            </div>
          )}
        </div>
      </div>

      {/* Add WordPress Site Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connect WordPress Site</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    value={siteForm.name}
                    onChange={(e) => setSiteForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My WordPress Site"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site URL</label>
                  <input
                    type="url"
                    value={siteForm.url}
                    onChange={(e) => setSiteForm(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    value={siteForm.apiKey}
                    onChange={(e) => setSiteForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your API key"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You need to install our WordPress plugin and generate an API key
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddSiteModal(false);
                    loadWordPressSites();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={connectWordPressSite}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Connecting...' : 'Connect Site'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Ad Platform Modal */}
      {showAddPlatformModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connect Advertising Platform</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    value={platformForm.platform}
                    onChange={(e) => setPlatformForm(prev => ({ ...prev, platform: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="google">Google Ads</option>
                    <option value="facebook">Facebook/Meta</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="other">Other Platform</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                  <input
                    type="text"
                    value={platformForm.name}
                    onChange={(e) => setPlatformForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="My Google Ads Account"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key / Access Token</label>
                  <input
                    type="password"
                    value={platformForm.apiKey || platformForm.accessToken}
                    onChange={(e) => setPlatformForm(prev => ({
                      ...prev,
                      apiKey: e.target.value,
                      accessToken: e.target.value
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your API key or access token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account ID (Optional)</label>
                  <input
                    type="text"
                    value={platformForm.accountId}
                    onChange={(e) => setPlatformForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (Optional)</label>
                  <input
                    type="url"
                    value={platformForm.webhookUrl}
                    onChange={(e) => setPlatformForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://your-webhook-url.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddPlatformModal(false);
                    loadAdPlatforms();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={connectAdPlatform}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Connecting...' : 'Connect Platform'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Website Modal - Multi-step Wizard */}
      {showAddWebsiteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Step 1: Enter Website Details */}
              {websiteWizardStep === 1 && (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Connect External Website</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Step 1: Enter your website details to create a unique integration
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website Name</label>
                      <input
                        type="text"
                        value={websiteForm.name}
                        onChange={(e) => setWebsiteForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="My External Website"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                      <input
                        type="url"
                        value={websiteForm.url}
                        onChange={(e) => setWebsiteForm(prev => ({ ...prev, url: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://external-site.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={resetWebsiteWizard}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={connectWebsite}
                      disabled={saving || !websiteForm.name.trim() || !websiteForm.url.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Creating...' : 'Create Integration'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Show API Details */}
              {websiteWizardStep === 2 && createdIntegration && (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Created Successfully!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Step 2: Use these credentials to send leads from your website
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Integration Active</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Your website "{createdIntegration.name}" is now connected to the CRM.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint URL</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={createdIntegration.endpoint_url || `https://crm-domain.com/api/integrations/webhook/${createdIntegration.slug}`}
                          readOnly
                          className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(createdIntegration.endpoint_url || `https://crm-domain.com/api/integrations/webhook/${createdIntegration.slug}`)}
                          className="px-3 py-3 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Send POST requests to this URL with lead data
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={createdIntegration.api_key || createdIntegration.extra?.api_key || 'Generating...'}
                          readOnly
                          className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(createdIntegration.api_key || createdIntegration.extra?.api_key || '')}
                          className="px-3 py-3 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Include this as "x-api-key" header in all requests to authenticate
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Example cURL Request:</h4>
                      <code className="text-xs text-blue-800 font-mono block bg-blue-100 p-2 rounded">
                        {`curl -X POST ${createdIntegration.endpoint_url || `https://crm-domain.com/api/integrations/webhook/${createdIntegration.slug}`} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${createdIntegration.api_key || createdIntegration.extra?.api_key || 'YOUR_API_KEY'}" \\
  -d '{"full_name":"John Doe","email":"john@example.com"}'`}
                      </code>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={testIntegrationEndpoint}
                      className="px-4 py-2 text-sm font-medium text-green-600 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Test Now
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setWebsiteWizardStep(3)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        Manual Test Steps
                      </button>
                      <button
                        onClick={resetWebsiteWizard}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Wait for Test Request */}
              {websiteWizardStep === 3 && createdIntegration && (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Your Integration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Step 3: Send a test request from your website to verify the integration works
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <Clock3 className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Waiting for Test Request</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      The system is listening for requests to your integration endpoint.
                      Send a test lead from your website using the credentials above.
                    </p>
                  </div>

                  {testLeadReceived && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Test Lead Received!</span>
                      </div>
                      <div className="text-sm text-green-700">
                        <p><strong>Lead ID:</strong> {testLeadReceived.lead_id}</p>
                        <p><strong>Processing Time:</strong> {testLeadReceived.processing_time_ms}ms</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Endpoint:</strong>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                        {createdIntegration.endpoint_url || `https://crm-domain.com/api/integrations/webhook/${createdIntegration.slug}`}
                      </code>
                    </div>
                    <div className="text-sm">
                      <strong>Auth Token:</strong>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                        {createdIntegration.auth_token}
                      </code>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Test Command:</h4>
                    <code className="text-xs text-gray-800 font-mono block bg-white p-2 rounded border">
                      {`curl -X POST ${createdIntegration.endpoint_url || `https://crm-domain.com/api/integrations/webhook/${createdIntegration.slug}`} \\
  -H "Content-Type: application/json" \\
  -H "x-auth-token: ${createdIntegration.auth_token}" \\
  -d '{"full_name":"Test User","email":"test@example.com"}'`}
                    </code>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={resetWebsiteWizard}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Finish Setup
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Form Mapping Modal */}
      {showAddFormModal && selectedSite && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Map Form for {selectedSite.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form ID</label>
                  <input
                    type="text"
                    value={formMapping.form_id}
                    onChange={(e) => setFormMapping(prev => ({ ...prev, form_id: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contact-form-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form Name</label>
                  <input
                    type="text"
                    value={formMapping.name}
                    onChange={(e) => setFormMapping(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contact Form"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Mapping</label>
                  <div className="space-y-2">
                    {Object.entries(formMapping.fields_mapping).map(([wpField, leadField]) => (
                      <div key={wpField} className="flex items-center space-x-2">
                        <span className="text-sm w-20">{wpField}:</span>
                        <select
                          value={leadField}
                          onChange={(e) => setFormMapping(prev => ({
                            ...prev,
                            fields_mapping: {
                              ...prev.fields_mapping,
                              [wpField]: e.target.value
                            }
                          }))}
                          className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="full_name">Full Name</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="country">Country</option>
                          <option value="notes">Notes</option>
                          <option value="">Ignore</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddFormModal(false);
                    setSelectedSite(null);
                    loadWordPressForms();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createFormMapping}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Mapping'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Testing Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Integration Testing Suite
                </h3>
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    loadIntegrationMetrics(); // Refresh metrics after testing
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  This will test all advertising source integrations by sending sample webhook payloads to each endpoint.
                  Each test creates a real lead in the CRM system.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div className="text-sm text-yellow-800">
                      <strong>Warning:</strong> This will create actual leads in your CRM. Make sure you're testing in a development environment.
                    </div>
                  </div>
                </div>

                <button
                  onClick={runIntegrationTests}
                  disabled={testing}
                  className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  <span>{testing ? 'Running Tests...' : 'Run All Integration Tests'}</span>
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Test Results</h4>

                  {testResults.map((result, index) => {
                    const sources = ['Google Ads', 'Meta (Facebook)', 'TikTok', 'Website', 'External API'];
                    const sourceName = sources[index] || `Test ${index + 1}`;

                    return (
                      <div key={index} className={`border rounded p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`text-lg ${result.success ? "text-green-600" : "text-red-600"}`}> 
                              {result.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            </span>
                            <span className="font-medium text-gray-900">{sourceName}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {result.processing_time_ms}ms
                          </span>
                        </div>

                        {result.success ? (
                          <div className="text-sm text-green-800">
                            Lead created successfully (ID: {result.lead_id})
                          </div>
                        ) : (
                          <div className="text-sm text-red-800">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Summary</span>
                    </div>
                    <div className="mt-2 text-sm text-blue-800">
                      {testResults.filter(r => r.success).length} of {testResults.length} integrations passed
                      {testResults.every(r => r.success) && ' - All integrations working perfectly!'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </ProtectedRoute>
  );
}
