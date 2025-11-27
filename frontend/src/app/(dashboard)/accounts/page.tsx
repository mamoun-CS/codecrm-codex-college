'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersAPI, leadsAPI } from '@/lib/api';
import { MARKETING_ACCESS_DESCRIPTION, MARKETING_ACCESS_PERMISSIONS } from '@/constants/rolePermissions';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useUi } from '@/store/uiStore';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  team_id?: number;
  active: boolean;
  team?: {
    id: number;
    name: string;
  };
}

interface Lead {
  id: number;
  full_name: string;
  owner?: {
    id: number;
    name: string;
  };
}

export default function AccountsPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transferLead, setTransferLead] = useState<Lead | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<User | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const ui = useUi();

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      setUsers(response.data);
    } catch (err: any) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowedRoles = async () => {
    try {
      const response = await usersAPI.getAllowedRoles();
      setAllowedRoles(response.data.roles);
    } catch (err: any) {
      console.error('Error fetching allowed roles:', err);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Change User Role',
        message: `Are you sure you want to change this user's role to ${newRole}?`,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      if (newRole === 'marketing') {
        await usersAPI.updateUser(userId, {
          role: 'marketing',
          permissions: MARKETING_ACCESS_PERMISSIONS,
        });
      } else {
        await usersAPI.updateUserRole(userId, newRole);
      }
      // Refresh the users list
      fetchUsers();
    } catch (err: any) {
      ui.alert({
        title: 'Error',
        message: 'Failed to update user role: ' + (err.response?.data?.message || err.message),
        variant: 'error',
      });
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      ui.confirm({
        title: 'Delete User',
        message: `Are you sure you want to delete the account for ${userName}? This action cannot be undone.`,
        tone: 'danger',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      await usersAPI.deleteUser(userId);
      // Refresh the users list
      fetchUsers();
    } catch (err: any) {
      ui.alert({
        title: 'Error',
        message: 'Failed to delete user: ' + (err.response?.data?.message || err.message),
        variant: 'error',
      });
    }
  };

  const handleTransferLead = (lead: Lead, receiver: User) => {
    setTransferLead(lead);
    setSelectedReceiver(receiver);
    setShowTransferModal(true);
  };

  const executeLeadTransfer = async (leadId: number, receiverId: number, notes: string) => {
    try {
      await leadsAPI.transferLead(leadId, receiverId, notes);
      setMessage({ 
        type: 'success', 
        text: `Lead successfully transferred` 
      });
      // Refresh the users list
      fetchUsers();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to transfer lead: ' + (err.response?.data?.message || err.message) 
      });
    }
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

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Check if user has permission to view this page
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
    fetchAllowedRoles();
  }, [router]);

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return <div>Loading...</div>;
  }

  if (!user) return <div>Loading...</div>;

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Account Management</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <span className="text-sm sm:text-base text-gray-700">Welcome, {user.name} ({user.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded hover:bg-red-700 text-sm sm:text-base w-full sm:w-auto"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Message Display */}
        {message && (
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          } rounded`}>
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

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    User Accounts
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage user roles and permissions. Only users with lower privilege levels are shown.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <Link
                    href="/register"
                    className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm font-medium"
                  >
                    ➕ Create User
                  </Link>
                  <Link
                    href="/marketing-accounts"
                    className="bg-purple-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors text-center text-sm font-medium"
                  >
                    Marketing Accounts
                  </Link>
                </div>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border-l-4 border-red-400">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <ul className="divide-y divide-gray-200">
              {users.map((accountUser) => (
                <li key={accountUser.id} className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {accountUser.name}
                          </h3>
                          <p className="text-sm text-gray-500">{accountUser.email}</p>
                          <p className="text-xs text-gray-400">
                            Team: {accountUser.team?.name || 'No Team'} | Status: {accountUser.active ? 'Active' : 'Inactive'}
                          </p>
                          {accountUser.role === 'marketing' && (
                            <p className="mt-1 text-xs text-orange-600">
                              {t(MARKETING_ACCESS_DESCRIPTION)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                      <select
                        value={accountUser.role}
                        onChange={(e) => handleRoleChange(accountUser.id, e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 text-sm w-full sm:w-auto"
                      >
                        <option value={accountUser.role}>{accountUser.role}</option>
                        {allowedRoles
                          .filter(role => role !== accountUser.role) // Don't show current role again
                          .map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleDeleteUser(accountUser.id, accountUser.name)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex-1 sm:flex-none"
                          disabled={accountUser.id === user.id} // Can't delete yourself
                        >
                          Delete
                        </button>
                        {/* Transfer Lead Button */}
                        <button
                          onClick={() => handleTransferLead({ id: 0, full_name: 'Sample Lead' }, accountUser)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex-1 sm:flex-none"
                        >
                          Transfer
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {users.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-gray-500">
                No users found or you don't have permission to view them.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Transfer Lead Modal */}
      {showTransferModal && transferLead && selectedReceiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Transfer Lead to {selectedReceiver.name}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead ID
              </label>
              <input
                type="number"
                placeholder="Enter Lead ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Notes *
              </label>
              <textarea
                placeholder="Explain why you're transferring this lead..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const leadIdInput = document.querySelector('input[placeholder="Enter Lead ID"]') as HTMLInputElement;
                  const notesInput = document.querySelector('textarea[placeholder="Explain why you\'re transferring this lead..."]') as HTMLTextAreaElement;
                  
                  if (!leadIdInput?.value) {
                    setMessage({ type: 'error', text: 'Please enter a Lead ID' });
                    return;
                  }
                  
                  if (!notesInput?.value.trim()) {
                    setMessage({ type: 'error', text: 'Please add transfer notes' });
                    return;
                  }
                  
                  executeLeadTransfer(parseInt(leadIdInput.value), selectedReceiver.id, notesInput.value.trim());
                  setShowTransferModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Transfer Lead
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
