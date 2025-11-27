'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { leadsAPI } from '@/lib/api';
import TransferSidebar from '@/components/TransferSidebar';
import { useUi } from '@/store/uiStore';

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  source?: string;
  status?: string;
  owner?: {
    id: number;
    name: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  team?: {
    id: number;
    name: string;
  };
}

export default function TransferLeadPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<User | null>(null);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  const ui = useUi();

  const loadLeadDetails = async () => {
    try {
      const response = await leadsAPI.getLead(parseInt(leadId));
      setLead(response.data);
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 404) {
        ui.alert({
          title: 'Access Denied',
          message: 'Access denied or lead not found',
          variant: 'error',
        });
        router.push('/leads');
      } else {
        console.error('Error loading lead:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (receiver: User) => {
    setSelectedReceiver(receiver);
  };

  const handleTransfer = async () => {
    if (!selectedReceiver) {
      ui.alert({
        title: 'Validation Error',
        message: 'Please select a user to transfer to',
        variant: 'error',
      });
      return;
    }

    if (!lead) {
      ui.alert({
        title: 'Error',
        message: 'Lead data not available',
        variant: 'error',
      });
      return;
    }

    setTransferring(true);
    try {
      await leadsAPI.transferLead(lead.id, selectedReceiver.id, transferNotes.trim());
      ui.alert({
        title: 'Success',
        message: `Lead "${lead.full_name}" successfully transferred to ${selectedReceiver.name}`,
        variant: 'success',
      });
      router.push(`/leads/${leadId}`);
    } catch (error: any) {
      ui.alert({
        title: 'Transfer Failed',
        message: error.response?.data?.message || 'Failed to transfer lead',
        variant: 'error',
      });
    } finally {
      setTransferring(false);
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

    try {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      loadLeadDetails();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router, leadId]);

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lead not found</h2>
          <button
            onClick={() => router.push('/leads')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                href={`/leads/${leadId}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Lead Details
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Transfer Lead: {lead.full_name}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Welcome, {user?.name} ({user?.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Transfer Sidebar */}
        {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales' || user?.role === 'marketing') && (
          <TransferSidebar
            onUserSelect={handleUserSelect}
            currentUserId={user.id}
            currentLeadId={lead.id}
          />
        )}

         Main Content 
        <div className="flex-1">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Lead Information Card 
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.country || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.source || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Status</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.status || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Owner</label>
                  <p className="mt-1 text-sm text-gray-900">{lead.owner?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>*/}

            {/* Transfer Details 
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Transfer Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Recipient
                  </label>
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                    {selectedReceiver ? (
                      <div>
                        <p className="font-medium text-gray-900">{selectedReceiver.name}</p>
                        <p className="text-sm text-gray-600">{selectedReceiver.email}</p>
                        <p className="text-xs text-gray-500">Role: {selectedReceiver.role}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Please select a user from the sidebar to transfer this lead to.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Notes (Optional)
                  </label>
                  <textarea
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Add any notes about why this lead is being transferred..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                </div>
              </div>
            </div>*/}

            {/* Action Buttons 
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.push(`/leads/${leadId}`)}
                disabled={transferring}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedReceiver || transferring}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center space-x-2"
              >
                {transferring && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{transferring ? 'Transferring...' : 'Confirm Transfer'}</span>
              </button>
            </div>
            */}
            <h1>hello</h1>
          </main>
        </div>
      </div>
    </div>
  );
}