'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useUi } from '@/store/uiStore';

export default function GoogleIntegrationPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const ui = useUi();

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
    loadGoogleStatus();
  }, [router]);

  const loadGoogleStatus = async () => {
    try {
      const response = await api.get('/api/integrations/google/status');
      setGoogleStatus(response.data);
    } catch (error) {
      console.error('Failed to load Google status:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const response = await api.get('/api/integrations/google/oauth-url');
      if (response.data?.url) {
        // Open Google OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          response.data.url,
          'Google OAuth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        // Listen for OAuth completion
        const checkPopup = setInterval(() => {
          if (popup && popup.closed) {
            clearInterval(checkPopup);
            setConnecting(false);
            // Reload status after popup closes
            setTimeout(() => loadGoogleStatus(), 1000);
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Failed to start Google OAuth:', error);
      ui.alert({
        title: 'Connection Failed',
        message: 'Failed to open Google OAuth. Please try again.',
        variant: 'error',
      });
      setConnecting(false);
    }
  };

  const handleVerifyConnection = async () => {
    setLoading(true);
    try {
      // Test the Google Ads webhook endpoint
      const response = await api.post('/api/integrations/google', {
        user_column_data: [
          { column_id: 'FULL_NAME', string_value: 'Test Google User' },
          { column_id: 'PHONE_NUMBER', string_value: '+1234567890' },
          { column_id: 'EMAIL', string_value: 'test@google.com' },
          { column_id: 'COUNTRY', string_value: 'USA' }
        ],
        campaign_name: 'Test Campaign',
        adgroup_name: 'Test Ad Group',
        ad_id: '12345',
        form_id: '67890',
        lead_id: '99999'
      });

      setTestResult(response.data);
      ui.alert({
        title: 'Test Successful',
        message: 'Connection test successful! Lead created with ID: ' + response.data.lead_id,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setTestResult({
        success: false,
        error: error.response?.data?.message || error.message,
        processing_time_ms: error.response?.data?.processing_time_ms || 0,
      });
      ui.alert({
        title: 'Test Failed',
        message: 'Connection test failed: ' + (error.response?.data?.message || error.message),
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!isClient || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/integrations"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Integrations
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Google Ads Integration</h1>
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

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* OAuth Connection */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Google Ads OAuth Connection
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Google Ads account to access campaigns and data
            </p>
          </div>

          <div className="px-4 py-4 border-t border-gray-200">
            {googleStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Connected to Google Ads</p>
                      <p className="text-sm text-green-700">{googleStatus.email}</p>
                      {googleStatus.expires_at && (
                        <p className="text-xs text-green-600 mt-1">
                          Expires: {new Date(googleStatus.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {connecting ? 'Reconnecting...' : 'Reconnect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Google Ads connection</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Connect your Google Ads account to get started
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                    </svg>
                    {connecting ? 'Connecting...' : 'Connect Google Ads'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integration Setup */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Google Ads Lead Forms Webhook
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure Google Ads to send lead form submissions to your CRM via webhook
            </p>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 space-y-6">
            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={`${window.location.origin}/api/integrations/google`}
                  readOnly
                  className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/integrations/google`)}
                  className="px-4 py-3 bg-gray-200 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Copy this URL and paste it in your Google Ads Lead Form webhook settings
              </p>
            </div>

            {/* Setup Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to your Google Ads account</li>
                <li>Navigate to Tools & Settings → Measurement → Conversions</li>
                <li>Create a new conversion action for "Website"</li>
                <li>Choose "Import" and select "CRM or third-party tool"</li>
                <li>Paste the webhook URL above in the "Postback URL" field</li>
                <li>Configure the lead form fields mapping</li>
                <li>Save and enable the conversion action</li>
              </ol>
            </div>

            {/* Test Connection */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Test Connection</h4>
                  <p className="text-sm text-gray-600">
                    Send a test webhook to verify your integration is working
                  </p>
                </div>
                <button
                  onClick={handleVerifyConnection}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <span>🧪</span>
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center space-x-2">
                    <span className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                      {testResult.success ? '✅' : '❌'}
                    </span>
                    <span className={`font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    {testResult.success ? (
                      <div className="text-green-800">
                        <p>✓ Lead created successfully</p>
                        <p>Lead ID: {testResult.lead_id}</p>
                        <p>Processing time: {testResult.processing_time_ms}ms</p>
                      </div>
                    ) : (
                      <div className="text-red-800">
                        <p>Error: {testResult.error}</p>
                        {testResult.processing_time_ms && <p>Processing time: {testResult.processing_time_ms}ms</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Integration Status
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Current status and configuration details
            </p>
          </div>

          <div className="px-4 py-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Status</h4>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Last Test</h4>
                <span className="text-sm text-gray-600">
                  {testResult ? new Date().toLocaleString() : 'Not tested yet'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Supported Fields</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• Full Name</div>
                  <div>• Phone Number</div>
                  <div>• Email Address</div>
                  <div>• Country</div>
                  <div>• City</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Webhook Method</h4>
                <span className="text-sm text-gray-600">POST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}