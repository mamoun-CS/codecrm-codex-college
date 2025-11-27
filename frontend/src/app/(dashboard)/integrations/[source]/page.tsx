'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { FaGoogle, FaFacebook, FaTiktok, FaGlobe, FaCopy, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { useUi } from '@/store/uiStore';

interface IntegrationConfig {
  name: string;
  icon: any;
  color: string;
  description: string;
  fields: {
    label: string;
    key: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    required?: boolean;
  }[];
}

const integrationConfigs: Record<string, IntegrationConfig> = {
  google: {
    name: 'Google Ads',
    icon: FaGoogle,
    color: 'blue',
    description: 'Connect Google Ads Lead Form Extensions to automatically capture leads',
    fields: [
      { label: 'API Key', key: 'api_key', type: 'password', placeholder: 'Enter your Google Ads API key', required: false },
      { label: 'Account ID', key: 'account_id', type: 'text', placeholder: 'Enter your Google Ads Account ID', required: false },
    ],
  },
  meta: {
    name: 'Meta (Facebook & Instagram)',
    icon: FaFacebook,
    color: 'indigo',
    description: 'Connect Facebook and Instagram Lead Ads to capture leads automatically',
    fields: [
      { label: 'Verify Token', key: 'verify_token', type: 'password', placeholder: 'Enter Meta Verify Token', required: true },
      { label: 'Access Token', key: 'access_token', type: 'password', placeholder: 'Enter Meta Access Token', required: false },
      { label: 'App Secret', key: 'app_secret', type: 'password', placeholder: 'Enter Meta App Secret', required: false },
    ],
  },
  tiktok: {
    name: 'TikTok Ads',
    icon: FaTiktok,
    color: 'pink',
    description: 'Connect TikTok Lead Generation to receive leads from your TikTok campaigns',
    fields: [
      { label: 'App ID', key: 'app_id', type: 'text', placeholder: 'Enter TikTok App ID', required: true },
      { label: 'Access Token', key: 'access_token', type: 'password', placeholder: 'Enter TikTok Access Token', required: true },
      { label: 'Secret Key', key: 'secret_key', type: 'password', placeholder: 'Enter TikTok Secret Key', required: false },
    ],
  },
  website: {
    name: 'Website API',
    icon: FaGlobe,
    color: 'purple',
    description: 'Connect any external website or service to capture leads via API',
    fields: [
      { label: 'Website Name', key: 'name', type: 'text', placeholder: 'Enter website name', required: true },
      { label: 'Website URL', key: 'url', type: 'url', placeholder: 'https://example.com', required: true },
    ],
  },
};

export default function IntegrationSourcePage() {
  const router = useRouter();
  const params = useParams();
  const source = params?.source as string;
  const ui = useUi();

  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdIntegration, setCreatedIntegration] = useState<any>(null);
  const [showFacebookLogin, setShowFacebookLogin] = useState(false);
  const [facebookLoginLoading, setFacebookLoginLoading] = useState(false);
  const [fbSDKLoaded, setFbSDKLoaded] = useState(false);
  const [tiktokLoginLoading, setTiktokLoginLoading] = useState(false);

  const config = integrationConfigs[source];

  useEffect(() => {
    setIsClient(true);
    loadIntegration();

    // Load Facebook SDK for Meta integration
    if (source === 'meta') {
      loadFacebookSDK();
    }

    // Handle TikTok OAuth callback
    if (source === 'tiktok') {
      handleTikTokCallback();
    }
  }, [source]);

  const loadFacebookSDK = () => {
    // Check if SDK is already loaded
    if ((window as any).FB) {
      setFbSDKLoaded(true);
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    if (!isSecure) {
      console.warn('Facebook Login requires HTTPS. Please use https:// or localhost');
      return;
    }

    // Load Facebook SDK
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      (window as any).fbAsyncInit = () => {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1234567890',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });

        // Mark SDK as loaded
        setFbSDKLoaded(true);
      };

      // Trigger fbAsyncInit if FB is already available
      if ((window as any).FB) {
        (window as any).fbAsyncInit();
      }
    };

    script.onerror = () => {
      console.error('Failed to load Facebook SDK');
      ui.alert({
        title: 'SDK Load Failed',
        message: 'Failed to load Facebook SDK. Please check your internet connection and try again.',
        variant: 'error',
      });
    };

    document.body.appendChild(script);
  };

  const loadIntegration = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/integrations');
      const integrations = Array.isArray(response.data) ? response.data : [];
      const found = integrations.find((i: any) => i.slug === source);
      setIntegration(found);
      
      if (found?.integration_id) {
        const detailResponse = await api.get(`/api/integrations/${found.integration_id}`);
        const details = detailResponse.data;
        setFormData({
          api_key: details.api_key || '',
          access_token: details.access_token || '',
          account_id: details.account_id || '',
          verify_token: details.metadata?.verify_token || '',
          app_secret: details.metadata?.app_secret || '',
          app_id: details.metadata?.app_id || '',
          secret_key: details.metadata?.secret_key || '',
          name: details.name || '',
          url: details.url || '',
        });
      }
    } catch (error) {
      console.error('Error loading integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (source === 'website') {
        // For website, use register-website endpoint
        const response = await api.post('/api/integrations/register-website', {
          name: formData.name,
          url: formData.url,
        });
        const newIntegration = {
          ...integration,
          status: 'connected',
          endpoint_url: response.data.endpoint_url,  // ✅ Use endpoint_url, not api_url
          auth_token: response.data.auth_token,
          api_key: response.data.api_key,  // ✅ Add api_key
          integration_id: response.data.integration_id,
          name: formData.name,
          slug: response.data.slug || 'website',  // ✅ Use actual slug from response
        };
        setIntegration(newIntegration);
        setCreatedIntegration(newIntegration);
        setWizardStep(2);
        return; // Don't show alert, show wizard step 2 instead
      } else {
        // For ad platforms, create or update integration
        const payload = {
          name: config.name,
          slug: source,
          type: 'ad_platform',
          platform: source,
          status: 'active',
          api_key: formData.api_key,
          access_token: formData.access_token,
          account_id: formData.account_id,
          metadata: {
            verify_token: formData.verify_token,
            app_secret: formData.app_secret,
            app_id: formData.app_id,
            secret_key: formData.secret_key,
          },
        };

        if (integration?.integration_id) {
          await api.patch(`/api/integrations/${integration.integration_id}`, payload);
        } else {
          const response = await api.post('/api/integrations', payload);
          setIntegration({
            ...integration,
            integration_id: response.data.id,
            endpoint_url: response.data.endpoint_url,
            auth_token: response.data.auth_token,
          });
        }
      }
      
      await loadIntegration();
      ui.alert({
        title: 'Integration Saved',
        message: 'Integration saved successfully!',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error saving integration:', error);

      // Check for specific error messages
      let errorMessage = 'Failed to save integration';

      // Handle Axios errors
      if (error.response?.status === 500) {
        // Check if it's a duplicate key error
        const responseData = error.response?.data;
        if (responseData?.message?.includes('already exists') ||
            responseData?.message?.includes('duplicate key') ||
            responseData?.message?.includes('UQ_') ||
            responseData?.detail?.includes('already exists') ||
            responseData?.detail?.includes('duplicate key')) {
          errorMessage = 'An integration with this name already exists. Please choose a different name.';
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.detail) {
          errorMessage = responseData.detail;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      ui.alert({
        title: 'Save Failed',
        message: errorMessage,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const testData = {
        full_name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        country: 'United States',
      };

      const response = await api.post(`/api/integrations/${source}`, testData, {
        headers: {
          'x-auth-token': integration?.auth_token || 'test-token',
        },
      });

      setTestResult({ success: true, data: response.data });
    } catch (error: any) {
      setTestResult({ success: false, error: error.response?.data || error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleFacebookLogin = () => {
    // Check if we're on HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    if (!isSecure) {
      ui.alert({
        title: 'HTTPS Required',
        message: 'Facebook Login requires HTTPS.\n\nPlease access this page using:\n• https://yourdomain.com (production)\n• http://localhost:3000 (development)\n\nCurrent URL: ' + window.location.href,
        variant: 'error',
      });
      return;
    }

    setFacebookLoginLoading(true);

    const FB = (window as any).FB;
    if (!FB || !fbSDKLoaded) {
      ui.alert({
        title: 'SDK Loading',
        message: 'Facebook SDK is still loading. Please wait a moment and try again.',
        variant: 'info',
      });
      setFacebookLoginLoading(false);
      return;
    }

    // Check if App ID is configured
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId || appId === 'your_facebook_app_id_here' || appId === '1234567890') {
      ui.alert({
        title: 'Configuration Required',
        message: 'Facebook App ID is not configured.\n\nPlease add your Facebook App ID to frontend/.env.local:\nNEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id_here\n\nSee QUICK_START_META_OAUTH.md for setup instructions.',
        variant: 'error',
      });
      setFacebookLoginLoading(false);
      return;
    }

    try {
      FB.login((response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          const userID = response.authResponse.userID;

          // Get user info
          FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
            if (userInfo.error) {
              console.error('Facebook API error:', userInfo.error);
              ui.alert({
                title: 'Facebook API Error',
                message: 'Failed to get user information from Facebook. Please try again.',
                variant: 'error',
              });
              setFacebookLoginLoading(false);
              return;
            }

            // Update form data with the access token
            setFormData({
              ...formData,
              access_token: accessToken,
              account_id: userID,
            });

            setShowFacebookLogin(false);
            setFacebookLoginLoading(false);

            ui.alert({
              title: 'Facebook Connected',
              message: `✅ Successfully connected to Facebook!\n\nAccount: ${userInfo.name}\nEmail: ${userInfo.email || 'N/A'}\n\nYou can now click "Connect" to save the integration.`,
              variant: 'success',
            });
          });
        } else {
          setFacebookLoginLoading(false);
          if (response.status === 'unknown') {
            ui.alert({
              title: 'Login Cancelled',
              message: 'Facebook login was cancelled.',
              variant: 'info',
            });
          } else {
            ui.alert({
              title: 'Login Failed',
              message: 'Facebook login failed. Please try again.',
              variant: 'error',
            });
          }
        }
      }, {
        scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_metadata,leads_retrieval',
        return_scopes: true
      });
    } catch (error: any) {
      console.error('Facebook login error:', error);
      ui.alert({
        title: 'Login Error',
        message: 'An error occurred during Facebook login. Please try again.\n\nError: ' + error.message,
        variant: 'error',
      });
      setFacebookLoginLoading(false);
    }
  };

  const handleTikTokCallback = () => {
    // Check if we have OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      ui.alert({
        title: 'TikTok Authorization Failed',
        message: `TikTok authorization failed: ${error}`,
        variant: 'error',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      // Verify CSRF state
      const storedState = sessionStorage.getItem('tiktok_oauth_state');

      if (state !== storedState) {
        ui.alert({
          title: 'Security Error',
          message: 'Security error: State mismatch. Please try again.',
          variant: 'error',
        });
        sessionStorage.removeItem('tiktok_oauth_state');
        sessionStorage.removeItem('tiktok_oauth_source');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Clean up session storage
      sessionStorage.removeItem('tiktok_oauth_state');
      sessionStorage.removeItem('tiktok_oauth_source');

      // Auto-fill the authorization code
      setFormData(prev => ({
        ...prev,
        access_token: code, // This is the authorization code, backend will exchange it for access token
      }));

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show success message
      ui.alert({
        title: 'TikTok Authorized',
        message: '✅ Successfully authorized with TikTok!\n\nAuthorization code received.\nPlease click "Connect" to complete the integration.',
        variant: 'success',
      });
    }
  };

  const handleTikTokLogin = () => {
    // Check if we're on HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    if (!isSecure) {
      ui.alert({
        title: 'HTTPS Required',
        message: 'TikTok Login requires HTTPS.\n\nPlease access this page using:\n• https://yourdomain.com (production)\n• http://localhost:3000 (development)\n\nCurrent URL: ' + window.location.href,
        variant: 'error',
      });
      return;
    }

    // Check if Client Key is configured
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    if (!clientKey || clientKey === 'your_tiktok_client_key_here') {
      ui.alert({
        title: 'Configuration Required',
        message: 'TikTok Client Key is not configured.\n\nPlease add your TikTok Client Key to frontend/.env.local:\nNEXT_PUBLIC_TIKTOK_CLIENT_KEY=your_client_key_here\n\nSee TikTok Developer Portal for setup instructions.',
        variant: 'error',
      });
      return;
    }

    setTiktokLoginLoading(true);

    // Generate CSRF state token
    const csrfState = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    // Store state in sessionStorage for verification after redirect
    sessionStorage.setItem('tiktok_oauth_state', csrfState);
    sessionStorage.setItem('tiktok_oauth_source', source);

    // TikTok OAuth scopes for lead ads
    const scopes = 'user.info.basic,video.list';

    // Redirect URI - must match what's registered in TikTok app
    const redirectUri = `${window.location.origin}/integrations/${source}`;

    // Build TikTok authorization URL
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
      `client_key=${encodeURIComponent(clientKey)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(csrfState)}`;

    // Redirect to TikTok OAuth page
    window.location.href = authUrl;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Integration Not Found</h1>
          <button
            onClick={() => router.push('/integrations')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;
  const isConnected = integration?.status === 'connected';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/integrations')}
              className="text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <Icon className={`h-8 w-8 text-${config.color}-600`} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
              <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isConnected ? '✅ Connected' : '❌ Not Connected'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Website Integration Wizard */}
          {source === 'website' && wizardStep === 2 && createdIntegration ? (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">✅ Integration Created Successfully!</h2>
              <p className="text-sm text-gray-600 mb-6">
                Use these credentials to send leads from your website
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <span className="text-green-600 mr-2">✅</span>
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
                      value={createdIntegration.endpoint_url || `http://localhost:3001/api/integrations/website`}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(createdIntegration.endpoint_url || `http://localhost:3001/api/integrations/website`, 'url')}
                      className="px-3 py-3 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'url' ? <FaCheck /> : <FaCopy />}
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
                      value={createdIntegration.api_key || createdIntegration.auth_token}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(createdIntegration.api_key || createdIntegration.auth_token, 'token')}
                      className="px-3 py-3 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'token' ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Include this as "x-api-key" header in all requests to authenticate
                  </p>
                </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <div className="flex justify-between items-center mb-2">
    <h4 className="text-sm font-medium text-blue-900">Example cURL Request:</h4>
    <button 
      onClick={() => navigator.clipboard.writeText(`curl -X POST ${createdIntegration.endpoint_url || 'http://localhost:3002/api/integrations/website'} -H "Content-Type: application/json" -H "x-api-key: ${createdIntegration.api_key || createdIntegration.auth_token}" -d '{"full_name":"John Doe","email":"john@example.com","phone":"+1234567890"}'`)}
      className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded"
    >
      Copy
    </button>
  </div>
  <code className="text-xs text-blue-800 font-mono block bg-blue-100 p-2 rounded overflow-x-auto">
    {`curl -X POST ${createdIntegration.endpoint_url || 'http://localhost:3002/api/integrations/website'} \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${createdIntegration.api_key || createdIntegration.auth_token}" \\\n  -d '{"full_name":"John Doe","email":"john@example.com","phone":"+1234567890"}'`}
  </code>
</div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 text-sm font-medium text-green-600 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 transition-colors"
                >
                  {testing ? 'Testing...' : 'Send Test Lead'}
                </button>
                <button
                  onClick={() => {
                    setWizardStep(1);
                    setCreatedIntegration(null);
                    router.push('/integrations');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Configuration Form */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {source === 'website' && !isConnected ? 'Step 1: Enter Website Details' : 'Configuration'}
                </h2>
                {source === 'website' && !isConnected && (
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your website details to create a unique integration
                  </p>
                )}

                {/* TikTok Login Button for TikTok Integration */}
                {source === 'tiktok' && !isConnected && isClient && (
                  <div className="mb-6 p-4 bg-black border border-gray-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-2">Quick Setup</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      Sign in with your TikTok account to automatically connect your TikTok Business account
                    </p>

                    {/* HTTPS Warning */}
                    {typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          ⚠️ <strong>HTTPS Required:</strong> TikTok Login only works on HTTPS or localhost.
                          <br />
                          Current: <code className="bg-yellow-100 px-1 rounded">{window.location.protocol}//{window.location.host}</code>
                        </p>
                      </div>
                    )}

                    {/* Client Key Warning */}
                    {(!process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY ||
                      process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY === 'your_tiktok_client_key_here') && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg">
                        <p className="text-xs text-orange-800">
                          ⚙️ <strong>Setup Required:</strong> Add your TikTok Client Key to <code className="bg-orange-100 px-1 rounded">.env.local</code>
                          <br />
                          Get it from <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="underline">TikTok Developer Portal</a>
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleTikTokLogin}
                      disabled={tiktokLoginLoading}
                      className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-gradient-to-r from-[#25F4EE] via-[#FE2C55] to-[#000000] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaTiktok className="text-xl" />
                      <span className="font-medium">
                        {tiktokLoginLoading ? 'Redirecting...' : 'Sign in with TikTok'}
                      </span>
                    </button>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Or manually enter your credentials below
                    </p>
                  </div>
                )}

                {/* Facebook Login Button for Meta Integration */}
                {source === 'meta' && !isConnected && isClient && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Setup</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Sign in with your Facebook account to automatically connect your Meta Business account
                    </p>

                    {/* HTTPS Warning */}
                    {typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          ⚠️ <strong>HTTPS Required:</strong> Facebook Login only works on HTTPS or localhost.
                          <br />
                          Current: <code className="bg-yellow-100 px-1 rounded">{window.location.protocol}//{window.location.host}</code>
                        </p>
                      </div>
                    )}

                    {/* SDK Loading Status */}
                    {!fbSDKLoaded && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                        <p className="text-xs text-gray-700 flex items-center">
                          <span className="animate-spin mr-2">⏳</span>
                          Loading Facebook SDK...
                        </p>
                      </div>
                    )}

                    {/* App ID Warning */}
                    {(!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
                      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID === 'your_facebook_app_id_here' ||
                      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID === '1234567890') && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg">
                        <p className="text-xs text-orange-800">
                          ⚙️ <strong>Setup Required:</strong> Add your Facebook App ID to <code className="bg-orange-100 px-1 rounded">.env.local</code>
                          <br />
                          See <code className="bg-orange-100 px-1 rounded">QUICK_START_META_OAUTH.md</code> for instructions.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleFacebookLogin}
                      disabled={facebookLoginLoading || !fbSDKLoaded}
                      className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaFacebook className="text-xl" />
                      <span className="font-medium">
                        {facebookLoginLoading ? 'Connecting...' : !fbSDKLoaded ? 'Loading SDK...' : 'Sign in with Facebook'}
                      </span>
                    </button>
                    <p className="text-xs text-blue-600 mt-3 text-center">
                      Or manually enter your credentials below
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-2 bg-${config.color}-600 text-white rounded-lg hover:bg-${config.color}-700 transition-colors disabled:opacity-50`}
                  >
                    {saving ? 'Saving...' : isConnected ? 'Update' : source === 'website' ? 'Create Integration' : 'Connect'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Webhook Details - Only show if not in wizard step 2 for website */}
          {integration?.endpoint_url && !(source === 'website' && wizardStep === 2) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Webhook Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={integration.endpoint_url}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => copyToClipboard(integration.endpoint_url, 'url')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      {copiedField === 'url' ? <FaCheck /> : <FaCopy />}
                      <span>{copiedField === 'url' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                {integration.auth_token && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auth Token
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        value={integration.auth_token}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <button
                        onClick={() => copyToClipboard(integration.auth_token, 'token')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        {copiedField === 'token' ? <FaCheck /> : <FaCopy />}
                        <span>{copiedField === 'token' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Connection - Only show if not in wizard step 2 for website */}
          {isConnected && !(source === 'website' && wizardStep === 2) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Connection</h2>
              <p className="text-sm text-gray-600 mb-4">
                Send a test lead to verify your integration is working correctly.
              </p>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Send Test Lead'}
              </button>
              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '✅ Test Successful!' : '❌ Test Failed'}
                  </p>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(testResult.success ? testResult.data : testResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

