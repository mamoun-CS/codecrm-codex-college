'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { marketingAPI } from '@/lib/api';
import { useUi } from '@/store/uiStore';
import { useLanguage } from '@/i18n/LanguageProvider';

interface MarketingAccount {
  id: number;
  name: string;
  email: string;
  campaign_budget: number;
  spending_limit: number;
  reports_access: 'read-only' | 'full-access';
  leads_access: 'read-only' | 'no-access';
  status: 'active' | 'paused';
  created_at: string;
  updated_at: string;
}

interface MarketingAccountForm {
  name: string;
  email: string;
  campaign_budget: number;
  spending_limit: number;
  reports_access: 'read-only' | 'full-access';
  leads_access: 'read-only' | 'no-access';
  status: 'active' | 'paused';
}

export default function MarketingAccountsPage() {
  const { t } = useLanguage();
  const ui = useUi();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<MarketingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MarketingAccount | null>(null);
  const [formData, setFormData] = useState<MarketingAccountForm>({
    name: '',
    email: '',
    campaign_budget: 0,
    spending_limit: 0,
    reports_access: 'read-only',
    leads_access: 'read-only',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const loadAccounts = async () => {
    try {
      const response = await marketingAPI.getMarketingAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading marketing accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load marketing accounts' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    setFormData({
      name: '',
      email: '',
      campaign_budget: 0,
      spending_limit: 0,
      reports_access: 'read-only',
      leads_access: 'read-only',
      status: 'active',
    });
    setEditingAccount(null);
    setShowModal(true);
  };

  const handleEditAccount = (account: MarketingAccount) => {
    setFormData({
      name: account.name,
      email: account.email,
      campaign_budget: account.campaign_budget,
      spending_limit: account.spending_limit,
      reports_access: account.reports_access,
      leads_access: account.leads_access,
      status: account.status,
    });
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleFormChange = (field: keyof MarketingAccountForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAccount = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        await marketingAPI.updateMarketingAccount(editingAccount.id, formData);
        setMessage({ type: 'success', text: `Marketing account "${formData.name}" updated successfully` });
      } else {
        await marketingAPI.createMarketingAccount(formData);
        setMessage({ type: 'success', text: `Marketing account "${formData.name}" created successfully` });
      }

      setShowModal(false);
      loadAccounts();
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to save marketing account: ' + (error.response?.data?.message || error.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = (id: number, name: string) => {
    ui.confirm({
      title: t('Delete marketing account'),
      message: t('Are you sure you want to delete the marketing account "{name}"?', { name }),
      tone: 'danger',
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await marketingAPI.deleteMarketingAccount(id);
          setMessage({ type: 'success', text: t('Marketing account "{name}" deleted successfully', { name }) });
          loadAccounts();
        } catch (error: any) {
          setMessage({
            type: 'error',
            text: t('Failed to delete marketing account: {error}', {
              error: error.response?.data?.message || error.message,
            }),
          });
        }
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
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
    loadAccounts();
  }, [router]);

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
            Back to Login
          </button>
        </div>
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
              {/* Back to Dashboard Button */}
              <Link
                href="/dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                title="Back to Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </Link>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Marketing</p>
                <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className="flex justify-between items-center">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-xl hover:opacity-70"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Marketing Accounts Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Marketing Accounts ({accounts.length})
            </h3>
            {(user.role === 'admin' || user.role === 'manager') && (
              <button
                onClick={handleAddAccount}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add Marketing Account</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget & Limits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-500">{account.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Budget: ${account.campaign_budget.toLocaleString()}</div>
                        <div className="text-gray-500">Limit: ${account.spending_limit.toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Reports: {account.reports_access.replace('-', ' ')}</div>
                        <div className="text-gray-500">Leads: {account.leads_access.replace('-', ' ')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(user.role === 'admin' || user.role === 'manager') && (
                          <>
                            <button
                              onClick={() => handleEditAccount(account)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(account.id, account.name)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {accounts.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-lg">No marketing accounts found.</p>
              <p className="text-sm mt-2">Create your first marketing account to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAccount ? 'Edit Marketing Account' : 'Add Marketing Account'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Account Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter account name"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Daily Campaign Budget ($)</label>
                  <input
                    type="number"
                    value={formData.campaign_budget}
                    onChange={(e) => handleFormChange('campaign_budget', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Spending Limit ($)</label>
                  <input
                    type="number"
                    value={formData.spending_limit}
                    onChange={(e) => handleFormChange('spending_limit', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reports Access</label>
                  <select
                    value={formData.reports_access}
                    onChange={(e) => handleFormChange('reports_access', e.target.value as 'read-only' | 'full-access')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="read-only">Read Only</option>
                    <option value="full-access">Full Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Leads Access</label>
                  <select
                    value={formData.leads_access}
                    onChange={(e) => handleFormChange('leads_access', e.target.value as 'read-only' | 'no-access')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="read-only">Read Only</option>
                    <option value="no-access">No Access</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value as 'active' | 'paused')}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : (editingAccount ? 'Update Account' : 'Create Account')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}