'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { leadsAPI } from '@/lib/api';
import api from '@/lib/api';
import TransferSidebar from '@/components/TransferSidebar';
import LeadTransferModal from '@/components/LeadTransferModal';
import { useLeadUpdates } from '@/hooks/useRealtimeUpdates';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useUi } from '@/store/uiStore';

interface LeadFormData {
   full_name: string;
   phone: string;
   email: string;
   country: string;
   language: string;
   source: string;
   campaign_id: string;
   status: string;
   owner_user_id: string;
 }

interface Campaign {
   id: number;
   name: string;
}

interface AdvancedFilters {
   email: string;
      phone: string;
   full_name: string;
   source: string;
   campaign: string;
   status: string;
   owner: string;
   language: string;
   dateRange: string;
   startDate: string;
   endDate: string;
   search: string;
   digital_assets: string;
   country: string;
}

interface Lead {
   id: number;
   full_name: string;
   phone?: string;
   email?: string;
   country?: string;
   source?: string;
   status?: string;
   created_at: string;
   updated_at?: string;
   owner_user_id?: number;
   transfer_to_user_id?: number;
   campaign?: {
     id: number;
     name: string;
   };
   owner?: {
     id: number;
     name: string;
   };
   transferTo?: {
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const STALE_LEAD_THRESHOLD_HOURS = 4;

export default function LeadsPage() {
  const { t } = useLanguage();
  const ui = useUi();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdvancedFilters>({
    source: '',
    campaign: '',
    status: 'new',  // ✅ Default filter set to 'new' instead of empty
    owner: '',
    language: '',
    dateRange: '',
    startDate: '',
    endDate: '',
    search: '',
    email: '',
    phone: '',
    full_name: '',
    digital_assets: '',
    country: '',
  });
  const { connected, leadUpdates } = useLeadUpdates();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLead, setTransferLead] = useState<Lead | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<User | null>(null);
  const [transferringLead, setTransferringLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showTransferSidebar, setShowTransferSidebar] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });
  const [bulkEditData, setBulkEditData] = useState({
    status: '',
    owner_user_id: '',
    campaign_id: '',
    transfer_notes: '',
  });
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('new');  // ✅ Default to 'new' instead of 'all'
  const [showStatusSidebar, setShowStatusSidebar] = useState<boolean>(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowStatusSidebar(true);
    }
  }, []);
  const [formData, setFormData] = useState<LeadFormData>({
    full_name: '',
    phone: '',
    email: '',
    country: '',
    language: '',
    source: '',
    campaign_id: '',
    status: 'new',
    owner_user_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [staleLeadAlert, setStaleLeadAlert] = useState<string | null>(null);
  const staleLeadToastRef = useRef(false);
  const router = useRouter();
const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
const [showFiltersModal, setShowFiltersModal] = useState(false);
  const loadLeads = async () => {
    try {
      // Build query parameters with advanced filters
      const queryParams: any = { ...pagination };

      // Add basic filters
      if (filters.source) queryParams.source = filters.source;
      if (filters.campaign) queryParams.campaign_id = parseInt(filters.campaign);
      if (filters.status) queryParams.status = filters.status;
      if (filters.owner) queryParams.owner_user_id = parseInt(filters.owner);
      if (filters.language) queryParams.language = filters.language;
      if (filters.search) queryParams.search = filters.search;

      // Add date range filters
      const dateRange = getDateRangeFilter();
      if (dateRange) {
        queryParams.start_date = dateRange.startDate;
        queryParams.end_date = dateRange.endDate;
      }

      const response = await leadsAPI.getLeads(queryParams);
      const payload = response.data || {};
      const responseLeads = Array.isArray(payload)
        ? payload
        : payload.leads || payload.data || [];
      const leadsArray = Array.isArray(responseLeads) ? responseLeads : [];
      setLeads(leadsArray);
      setPagination(prev => ({
        ...prev,
        page: payload.meta?.page ?? prev.page,
        limit: payload.meta?.limit ?? prev.limit,
        total:
          payload.meta?.total ??
          payload.total ??
          leadsArray.length,
      }));
    } catch (error) {
      console.error('Error loading leads:', error);
      setMessage({ type: 'error', text: 'Failed to load leads' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      source: '',
      campaign: '',
      status: 'new',  // ✅ Reset to 'new' instead of empty
      owner: '',
      language: '',
      dateRange: '',
      startDate: '',
      endDate: '',
      search: '',
      email: '',
      phone: '',
      full_name: '',
      digital_assets: '',
      country: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/api/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadAssignableUsers = async () => {
    try {
      const response = await api.get('/api/users/transferrable-users');
      setAssignableUsers(response.data || []);
    } catch (error) {
      console.error('Error loading assignable users:', error);
      setAssignableUsers([]);
    }
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (filters.dateRange) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      case 'last7days':
        return {
          startDate: last7Days.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'thismonth':
        return {
          startDate: thisMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'custom':
        return {
          startDate: filters.startDate,
          endDate: filters.endDate
        };
      default:
        return null;
    }
  };

  const handleDeleteLead = (id: number, name: string) => {
    ui.confirm({
      title: t('Delete lead'),
      message: t('Are you sure you want to delete the lead for {name}?', { name }),
      tone: 'danger',
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          await leadsAPI.deleteLead(id);
          setMessage({ type: 'success', text: t('Lead "{name}" deleted successfully', { name }) });
          loadLeads();
        } catch (error: any) {
          setMessage({
            type: 'error',
            text: t('Failed to delete lead: {error}', {
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

  const handleAddLead = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      country: '',
      language: '',
      source: '',
      campaign_id: '',
      status: 'new',
      owner_user_id: '',
    });
    setShowAddModal(true);
  };

  const handleEditLead = (lead: Lead) => {
  // For non-admin/manager users, lock the owner field to current value
  const canChangeOwner = user.role === 'admin' || user.role === 'manager';

  setFormData({
    full_name: lead.full_name,
    phone: lead.phone || '',
    email: lead.email || '',
    country: lead.country || '',
    language: (lead as any)?.language || '',
    source: lead.source || '',
    campaign_id: lead.campaign?.id?.toString() || '',
    status: lead.status || 'new',
    // Non-admin/manager users cannot change owner
    owner_user_id: canChangeOwner
      ? (lead.owner?.id?.toString() || '')
      : (lead.owner_user_id?.toString() || ''),
  });
  setEditingLead(lead);
  setShowEditModal(true);
};

  const handleFormChange = (field: keyof LeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveLead = async () => {
    if (!formData.full_name.trim()) {
      setMessage({ type: 'error', text: t('Full name is required') });
      return;
    }

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        // Convert empty strings to undefined for optional fields
        source: formData.source && formData.source.trim() !== '' ? formData.source : undefined,
        campaign_id: (formData.campaign_id && parseInt(formData.campaign_id) !== 0 && formData.campaign_id.trim() !== '') ? parseInt(formData.campaign_id) : undefined,
        owner_user_id: formData.owner_user_id ? parseInt(formData.owner_user_id) : undefined,
        // Remove empty string fields
        phone: formData.phone && formData.phone.trim() !== '' ? formData.phone : undefined,
        email: formData.email && formData.email.trim() !== '' ? formData.email : undefined,
        country: formData.country && formData.country.trim() !== '' ? formData.country : undefined,
        language: formData.language && formData.language.trim() !== '' ? formData.language : undefined,
      };

      if (editingLead) {
        await leadsAPI.updateLead(editingLead.id, dataToSend);
        setMessage({
          type: 'success',
          text: t('Lead "{name}" updated successfully', { name: formData.full_name }),
        });
      } else {
        await leadsAPI.createLead(dataToSend);
        setMessage({
          type: 'success',
          text: t('Lead "{name}" created successfully', { name: formData.full_name }),
        });
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingLead(null);
      loadLeads();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: t('Failed to save lead: {error}', {
          error: error.response?.data?.message || error.message,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const closeModals = () => {
    setShowAddModal(false);
   setShowEditModal(false);
   setEditingLead(null);
   setShowTransferModal(false);
   setTransferLead(null);
   setTransferringLead(null);
   setSelectedReceiver(null);
   setShowBulkEditModal(false);
   setShowTransferSidebar(false);
   setShowBulkDeleteModal(false);

  };

  const handleTransferLead = (lead: Lead) => {
    if (!selectedReceiver) {
      setMessage({ type: 'error', text: t('Please select a user to transfer to first') });
      return;
    }
    
    setTransferLead(lead);
    setShowTransferModal(true);
  };

  const handleSalesSelect = (receiver: User) => {
    setSelectedReceiver(receiver);
    setMessage({ type: 'success', text: t('Selected {name} for transfer', { name: receiver.name }) });
  };

  const executeLeadTransfer = async (lead: Lead, receiver: User, notes: string) => {
    try {
      setTransferringLead(lead);
      await leadsAPI.transferLead(lead.id, receiver.id, notes);
      setMessage({
        type: 'success',
        text: t('Lead "{lead}" successfully transferred to {receiver}', {
          lead: lead.full_name,
          receiver: receiver.name,
        }),
      });
      loadLeads(); // Refresh the list
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: t('Failed to transfer lead: {error}', {
          error: error.response?.data?.message || error.message,
        }),
      });
    } finally {
      setTransferringLead(null);
      closeModals();
    }
  };

  const handleTransferSuccess = () => {
    // This function is called when the transfer is successful in the modal
    loadLeads();
    closeModals();
    if (transferLead) {
      setMessage({
        type: 'success',
        text: t('Lead "{lead}" successfully transferred to {receiver}', {
          lead: transferLead.full_name,
          receiver: selectedReceiver?.name || '',
        }),
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLeadUpdate = async (leadId: number, updates: any) => {
    try {
      await leadsAPI.updateLead(leadId, updates);
      loadLeads(); // Refresh the leads list
    } catch (error: any) {
      console.error('Error updating lead:', error);
      setMessage({ type: 'error', text: t('Failed to update lead status') });
    }
  };

  const handleLeadClick = (leadId: number) => {
    router.push(`/leads/${leadId}`);
  };

  const handleExportCSV = async () => {
    try {
      const response = await leadsAPI.exportLeads(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: t('Failed to export leads to CSV') });
    }
  };

  const handleBulkDelete = () => {
    if (selectedLeads.size === 0) {
      setMessage({ type: 'error', text: t('Please select leads to delete') });
      return;
    }

    // Show bulk delete modal directly for confirmation
    setBulkDeleteProgress({ current: 0, total: selectedLeads.size });
    setShowBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    try {
      setSaving(true);
      let completed = 0;

      const deletePromises = Array.from(selectedLeads).map(async (leadId) => {
        try {
          await leadsAPI.deleteLead(leadId);
          completed++;
          setBulkDeleteProgress({ current: completed, total: selectedLeads.size });
          return { status: 'fulfilled', leadId };
        } catch (error: any) {
          completed++;
          setBulkDeleteProgress({ current: completed, total: selectedLeads.size });
          return { status: 'rejected', leadId, error };
        }
      });

      const results = await Promise.allSettled(deletePromises);

      const ignored404 = results.filter(
        result => result.status === 'rejected' && result.reason?.response?.status === 404
      ).length;

      const failures = results.filter(
        result => result.status === 'rejected' && result.reason?.response?.status !== 404
      );

      if (failures.length > 0) {
        const error = failures[0] as PromiseRejectedResult;
        throw error.reason;
      }

      setMessage({
        type: 'success',
        text: t('✅ Successfully deleted {count} lead(s)', {
          count: selectedLeads.size - ignored404,
        }),
      });

      setSelectedLeads(new Set());
      loadLeads();

    } catch (error: any) {
      console.error('Bulk delete failed:', error);
      setMessage({
        type: 'error',
        text: t('Failed to delete leads: {error}', {
          error: error?.response?.data?.message || error?.message || 'Unknown error',
        }),
      });
    } finally {
      setSaving(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleBulkTransfer = async () => {
  if (selectedLeads.size === 0) {
    setMessage({ type: 'error', text: t('Please select leads to transfer') });
    return;
  }

  if (!selectedReceiver) {
    setMessage({ type: 'error', text: t('Please select a user to transfer to first') });
    return;
  }

  try {
    setSaving(true);

    // ملاحظات النقل
    const transferNotes =
      bulkEditData.transfer_notes || t('Bulk transfer of {count} leads', { count: selectedLeads.size });

    // تنفيذ النقل لكل الـ Leads المحددة
    const promises = Array.from(selectedLeads).map(leadId =>
      leadsAPI.transferLead(leadId, selectedReceiver.id, transferNotes)
    );

    await Promise.all(promises);

    // رسالة نجاح
    setMessage({
      type: 'success',
      text: t('✅ Successfully transferred {count} lead(s) to {receiver}', {
        count: selectedLeads.size,
        receiver: selectedReceiver.name,
      })
    });

    // إغلاق المودال وتحديث البيانات
    setShowBulkEditModal(false);
    setSelectedLeads(new Set());
    loadLeads();

  } catch (error: any) {
    console.error('Bulk transfer failed:', error);
    setMessage({
      type: 'error',
      text: t('Failed to transfer leads: {error}', {
        error: error.response?.data?.message || error.message,
      }),
    });
  } finally {
    setSaving(false);
  }
};

  const handleExportExcel = async () => {
    try {
      const response = await leadsAPI.exportLeadsExcel(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export leads to Excel' });
    }
  };

  const handleLeadSelect = (leadId: number) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const handleBulkEdit = () => {
    if (selectedLeads.size === 0) {
      setMessage({ type: 'error', text: 'Please select leads to edit' });
      return;
    }
    setBulkEditData({
      status: '',
      owner_user_id: '',
      campaign_id: '',
      transfer_notes: '',
    });
    setShowBulkEditModal(true);
    setShowTransferSidebar(true);
  };

  const handleBulkEditSave = async () => {
    if (selectedLeads.size === 0) return;

    const updates: any = {};
    if (bulkEditData.status) updates.status = bulkEditData.status;
    if (bulkEditData.owner_user_id) updates.owner_user_id = parseInt(bulkEditData.owner_user_id);
    if (bulkEditData.campaign_id && parseInt(bulkEditData.campaign_id) !== 0) updates.campaign_id = parseInt(bulkEditData.campaign_id);

    if (Object.keys(updates).length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one field to update' });
      return;
    }

    try {
      const promises = Array.from(selectedLeads).map(leadId =>
        leadsAPI.updateLead(leadId, updates)
      );
      await Promise.all(promises);

      setMessage({
        type: 'success',
        text: `Successfully updated ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''}`
      });
      setSelectedLeads(new Set());
      setShowBulkEditModal(false);
      loadLeads();
    } catch (error) {
      console.error('Bulk edit failed:', error);
      setMessage({ type: 'error', text: 'Failed to update leads' });
    }
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

useEffect(() => {
  let result = leads;

  // Sort by time (most recent first)
  result = result.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at).getTime();
    const timeB = new Date(b.updated_at || b.created_at).getTime();
    return timeB - timeA; // Descending order (newest first)
  });

  // 🔍 البحث العام (Search)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (lead) =>
        lead.full_name?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.country?.toLowerCase().includes(q) ||
        lead.source?.toLowerCase().includes(q) ||
        lead.status?.toLowerCase().includes(q) ||
        lead.campaign?.name?.toLowerCase().includes(q) ||
        lead.owner?.name?.toLowerCase().includes(q) ||
        (lead as any)?.language?.toLowerCase().includes(q)
    );
  }

  // 🎯 فلترة حسب كل حقل مستقل
  if (filters.campaign)
    result = result.filter(
      (lead) =>
        lead.campaign?.name?.toLowerCase().includes(filters.campaign.toLowerCase()) ||
        lead.campaign?.id?.toString() === filters.campaign
    );

  if (filters.source)
    result = result.filter(
      (lead) => lead.source?.toLowerCase() === filters.source.toLowerCase()
    );

  if (filters.digital_assets)
    result = result.filter(
      (lead) =>
        (lead as any)?.digital_assets?.toLowerCase()?.includes(filters.digital_assets.toLowerCase())
    );

  if (filters.owner)
    result = result.filter(
      (lead) =>
        lead.owner?.name?.toLowerCase().includes(filters.owner.toLowerCase())
    );

  if (filters.email)
    result = result.filter(
      (lead) => lead.email?.toLowerCase().includes(filters.email.toLowerCase())
    );

  if (filters.phone)
    result = result.filter(
      (lead) => lead.phone?.toLowerCase().includes(filters.phone.toLowerCase())
    );

  if (filters.full_name)
    result = result.filter(
      (lead) =>
        lead.full_name?.toLowerCase().includes(filters.full_name.toLowerCase())
    );

  if (filters.country)
    result = result.filter(
      (lead) =>
        lead.country?.toLowerCase().includes(filters.country.toLowerCase())
    );

  if (filters.language)
    result = result.filter(
      (lead) =>
        (lead as any)?.language?.toLowerCase() === filters.language.toLowerCase()
    );

  if (filters.status)
    result = result.filter(
      (lead) => lead.status?.toLowerCase() === filters.status.toLowerCase()
    );

  // 📅 فلترة حسب التاريخ المخصص
  if (filters.startDate)
    result = result.filter(
      (lead) =>
        new Date(lead.created_at) >= new Date(filters.startDate + "T00:00:00")
    );

  if (filters.endDate)
    result = result.filter(
      (lead) =>
        new Date(lead.created_at) <= new Date(filters.endDate + "T23:59:59")
    );

  // 📆 فلترة حسب نطاق التاريخ (dateRange)
  if (filters.dateRange && filters.dateRange !== 'custom') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (filters.dateRange === 'today') {
      result = result.filter(
        (lead) => new Date(lead.created_at).toDateString() === today.toDateString()
      );
    } else if (filters.dateRange === 'yesterday') {
      result = result.filter(
        (lead) => new Date(lead.created_at).toDateString() === yesterday.toDateString()
      );
    } else if (filters.dateRange === 'last7days') {
      result = result.filter(
        (lead) => new Date(lead.created_at) >= last7Days
      );
    } else if (filters.dateRange === 'thismonth') {
      result = result.filter(
        (lead) => new Date(lead.created_at) >= thisMonth
      );
    }
  }

  setFilteredLeads(result);
}, [filters, leads]);

  useEffect(() => {
    if (!leads.length) {
      setStaleLeadAlert(null);
      staleLeadToastRef.current = false;
      return;
    }

    const nowMs = Date.now();
    const staleLeads = leads.filter((lead) => {
      const lastTimestamp = new Date(lead.updated_at || lead.created_at).getTime();
      if (Number.isNaN(lastTimestamp)) {
        return false;
      }
      return nowMs - lastTimestamp >= STALE_LEAD_THRESHOLD_HOURS * 60 * 60 * 1000;
    });

    if (staleLeads.length > 0) {
      const alertMessage = t('⚠️ {count} lead(s) have not been updated for over {hours} hours', {
        count: staleLeads.length,
        hours: STALE_LEAD_THRESHOLD_HOURS,
      });
      setStaleLeadAlert(alertMessage);
      if (!staleLeadToastRef.current) {
        staleLeadToastRef.current = true;
        toast.error(alertMessage, { duration: 5000, icon: '⚠️' });
      }
    } else {
      setStaleLeadAlert(null);
      staleLeadToastRef.current = false;
    }
  }, [leads, t]);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[id^="menu-"]') && !target.closest('button')) {
        document.querySelectorAll('[id^="menu-"]').forEach(menu => {
          menu.classList.add('hidden');
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    // Auto-assign leads to current user
    setFormData(prev => ({ ...prev, owner_user_id: userObj.id.toString() }));
    loadLeads();
    loadCampaigns();
    loadAssignableUsers();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [filters, pagination.page, user]);

// Real-time updates handler
useEffect(() => {
  if (!connected || leadUpdates.length === 0) return;

  const latest = leadUpdates[0];
  const updatedLead = latest.lead;
  let existsAlready = false;

  setLeads(prev => {
    existsAlready = prev.some(l => l.id === updatedLead.id);
    if (existsAlready) {
      return prev.map(l => (l.id === updatedLead.id ? updatedLead : l));
    }
    return [updatedLead, ...prev];
  });

  if (!existsAlready) {
    setPagination(prev => ({
      ...prev,
      total: (prev.total || 0) + 1,
    }));
  }

  setMessage({
    type: 'success',
    text: existsAlready
      ? t('Lead "{name}" was updated in real-time', { name: updatedLead.full_name })
      : t('New lead "{name}" just arrived', { name: updatedLead.full_name }),
  });
}, [leadUpdates, connected, t]);




  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRecords = pagination.total || 0;
  const totalPages = Math.ceil(totalRecords / pagination.limit) || 0;
  const startIndex = (pagination.page - 1) * pagination.limit;
  const paginatedLeads = filteredLeads;
  const endIndex = filteredLeads.length
    ? Math.min(startIndex + filteredLeads.length, totalRecords)
    : startIndex;
  const displayStart = filteredLeads.length ? startIndex + 1 : 0;
  const displayEnd = filteredLeads.length ? endIndex : 0;
  const visibleLeadIds = paginatedLeads.map((lead) => lead.id);
  const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every((id) => selectedLeads.has(id));
  const hasPartialSelection =
    selectedLeads.size > 0 && !allVisibleSelected && visibleLeadIds.some((id) => selectedLeads.has(id));

  const toggleSelectAllVisible = () => {
    const newSelection = new Set(selectedLeads);
    if (allVisibleSelected) {
      visibleLeadIds.forEach((id) => newSelection.delete(id));
    } else {
      visibleLeadIds.forEach((id) => newSelection.add(id));
    }
    setSelectedLeads(newSelection);
  };
  const mobileTableFilters = [
    { key: 'campaign', label: t('Campaign'), type: 'text', placeholder: t('Campaign name') },
    {
      key: 'source',
      label: t('Channel'),
      type: 'select',
      options: ['google', 'facebook', 'tiktok', 'website', 'whatsapp'],
    },
    { key: 'owner', label: t('Owner'), type: 'text', placeholder: t('Owner name') },
    {
      key: 'status',
      label: t('Status'),
      type: 'select',
      options: ['new', 'contacted', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost'],
    },
    { key: 'country', label: t('Country'), type: 'text', placeholder: t('Country') },
    { key: 'language', label: t('Language'), type: 'text', placeholder: t('Language') },
  ];

  const today = new Date();
  const todaysLeads = leads.filter((lead) => {
    const created = new Date(lead.created_at);
    return created.toDateString() === today.toDateString();
  }).length;

  const pendingTransfers = leads.filter((lead) => !!lead.transfer_to_user_id).length;
  const meetingPipeline = leads.filter((lead) => lead.status === 'meeting_scheduled').length;

  const totalLeadCount = Math.max(pagination.total || 0, leads.length);
  const leadHighlights = [
    { label: t('Total leads'), value: totalLeadCount, accent: 'text-blue-600 bg-blue-50' },
    { label: t('Selected'), value: selectedLeads.size, accent: 'text-purple-600 bg-purple-50' },
    { label: t('New today'), value: todaysLeads, accent: 'text-emerald-600 bg-emerald-50' },
    { label: t('Meetings scheduled'), value: meetingPipeline, accent: 'text-amber-600 bg-amber-50' },
    { label: t('Pending transfers'), value: pendingTransfers, accent: 'text-rose-600 bg-rose-50' },
  ];

  const statusOptions = [
    { key: 'new', label: t('New'), icon: 'NEW' },
    { key: 'in_progress', label: t('In Progress'), icon: 'CALL' },
    { key: 'follow_up', label: t('Follow Up'), icon: 'MEET' },
    { key: 'not_answering', label: t('Not Answering'), icon: 'PROP' },
    { key: 'closed', label: t('Closed'), icon: 'CLOSED' },
    { key: 'won', label: t('Won'), icon: 'WON' },
    { key: 'lost', label: t('Lost'), icon: 'LOST' },
    { key: 'all', label: t('All Leads'), icon: 'ALL' },
  ];
  const roleLabels: Record<string, string> = {
    super_admin: t('Super Admin'),
    admin: t('Admin'),
    manager: t('Manager'),
    sales: t('Sales'),
    marketing: t('Marketing'),
    viewer: t('Viewer'),
  };
  const formatSource = (source?: string | null) => {
    switch (source) {
      case 'tiktok':
        return t('TikTok Leads');
      case 'google':
        return t('Google Ads');
      case 'facebook':
        return t('Facebook Ads');
      case 'landing_page':
        return t('Landing Page');
      case 'website':
        return t('Website');
      case 'whatsapp':
        return t('WhatsApp');
      default:
        return source || t('Unknown');
    }
  };


  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mobile-safe-area mx-auto flex max-w-7xl flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                {t('Back to dashboard')}
              </Link>
              <Link href="/accounts" className="text-sm font-medium text-slate-500 hover:text-slate-700">
                {t('Manage accounts')}
              </Link>
              <button
                type="button"
                onClick={() => setShowStatusSidebar((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 lg:hidden"
                aria-label="Toggle filters"
              >
                <span className="text-base">{showStatusSidebar ? '✕' : '☰'}</span>
                <span>{t('Filters')}</span>
              </button>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{t('Leads management')}</h1>
            <p className="text-sm text-slate-500">{t('Track every touchpoint across marketing and sales.')}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:text-right">
            <span className="font-semibold text-slate-900">
              {t('Welcome, {name} ({role})', { name: user.name, role: roleLabels[user.role] || user.role })}
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                onClick={handleLogout}
                className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-sm transition hover:bg-slate-800"
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mobile-safe-area mx-auto max-w-7xl space-y-4 py-4">
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-lg leading-none">
                x
              </button>
            </div>
          </div>
        )}
        {staleLeadAlert && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{staleLeadAlert}</span>
              <button
                onClick={() => {
                  setStaleLeadAlert(null);
                  staleLeadToastRef.current = false;
                }}
                className="text-xs font-semibold uppercase tracking-wide text-rose-500"
              >
                {t('Dismiss')}
              </button>
            </div>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {leadHighlights.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-2 text-2xl font-semibold ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </section>
      </div>

      <div className="flex">
        {/* Main Content - Table/Kanban */}
         {/* Main Content - Table/Kanban */}
        <div className="flex">
        
<main className={`transition-all duration-300 ${showStatusSidebar ? 'pl-[240px]' : 'pl-[72px]'} py-6 sm:px-6 lg:px-8`}>


  {/* زر عائم لفتح/إغلاق الـSidebar */}
  <button
    onClick={() => setShowStatusSidebar((v) => !v)}
    className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-1 h-1 rounded-full shadow-lg bg-white border border-gray-200 hover:shadow-xl transition-all flex items-center justify-center"
    title={showStatusSidebar ? t('Collapse') : t('Expand')}
    aria-label={t('Toggle sidebar')}
  >
    <span className="text-xl">{showStatusSidebar ? '⟨' : '☰'}</span>
  </button>

  <div className="flex w-full h-full overflow-hidden">

    {/* Sidebar: Collapsible + Sticky + Slide-in */}
    <AnimatePresence initial={false}>
   <motion.aside
  key="lead-status-sidebar"
  initial={{ x: -30, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -30, opacity: 0 }}
  transition={{ type: 'tween', duration: 0.25 }}
  className="relative z-20"
>
  <motion.div
    animate={{ width: showStatusSidebar ? 270 : 72 }}
    transition={{ type: 'tween', duration: 0.25 }}
    className="sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-sm"
  >
        <div className="p-3">
          <div className="flex items-center mb-3">
            <span className="mr-2 text-blue-500">📊</span>
            {showStatusSidebar && (
              <h3 className="text-sm font-semibold text-gray-800">{t('Lead Status')}</h3>
            )}
          </div>

          <div className="space-y-2">
            {[
              { key: 'new', icon: '🆕', count: leads.filter(l => l.status === 'new').length },
              { key: 'in_progress', icon: '📞', count: leads.filter(l => l.status === 'in_progress').length },
              { key: 'follow_up', icon: '📅', count: leads.filter(l => l.status === 'follow_up').length },
              { key: 'not_answering', icon: '📵', count: leads.filter(l => l.status === 'not_answering').length },
              { key: 'closed', icon: '🔒', count: leads.filter(l => l.status === 'closed').length },
              { key: 'won', icon: '✅', count: leads.filter(l => l.status === 'won').length },
              { key: 'lost', icon: '❌', count: leads.filter(l => l.status === 'lost').length },
               { key: 'all', icon: '📋', count: leads.length },
            ].map(({ key, icon, count }) => {
              const active = selectedStatusFilter === key || (key === 'all' && filters.status === '');
              return (
                <button
                  key={key}
                  onClick={() => {
                    handleFilterChange('status', key === 'all' ? '' : key);
                    setSelectedStatusFilter(key);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all
                    ${active
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-transparent hover:border-gray-200 text-gray-700'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{icon}</span>
                    {showStatusSidebar && (
                      <span className="font-medium">
                        {statusOptions.find(option => option.key === key)?.label || t('All Leads')}
                      </span>
                    )}
                  </div>
                  {showStatusSidebar ? (
                    <span className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-gray-500'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-semibold">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.aside>
  </AnimatePresence>


    {/* المحتوى الرئيسي */}
     <motion.div
    key="main-content"
    animate={{
      width: showStatusSidebar ? 'calc(100% - 270px)' : 'calc(100% - 72px)',
    }}
    transition={{ type: 'tween', duration: 0.25 }}
    className="flex-1 overflow-hidden transition-all duration-300"
  >
   
    {/* ✅ Toolbar ثابت */}
    <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200 sticky top-0 z-30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selectedLeads.size > 0 && (
            <>
              <button
                onClick={handleBulkEdit}
                className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                🔄 {t('Bulk Transfer')} ({selectedLeads.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                🗑️ {t('Delete Selected')} ({selectedLeads.size})
              </button>
            </>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            {t('Export CSV')}
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
          >
            {t('Export Excel')}
          </button>
          <PermissionGuard
            permission="add_leads"
            user={user}
            fallback={
              <div className="px-3 py-2 bg-gray-400 text-gray-600 rounded-md text-sm cursor-not-allowed">
                {t('No permission to add leads')}
              </div>
            }
          >
            <button
              onClick={handleAddLead}
              className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 flex items-center gap-1"
            >
              <span>＋</span> {t('Add Lead')}
            </button>
          </PermissionGuard>
        </div>
      </div>
    </div>


      {/* جدول FixDigital-style */}
<div className="hidden w-full overflow-x-auto border border-gray-200 rounded-md shadow-sm scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-100 lg:block">
 <table className="w-full min-w-[1200px] text-sm text-gray-800">
    <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <tr className="text-gray-600 text-xs uppercase">
        <th className="px-3 py-3 text-left font-semibold w-10">
          <input
            type="checkbox"
            ref={(node) => {
              selectAllRef.current = node;
              if (node) {
                node.indeterminate = hasPartialSelection;
              }
            }}
            checked={allVisibleSelected && visibleLeadIds.length > 0}
            onChange={toggleSelectAllVisible}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>
        <th className="px-3 py-3 text-left font-semibold">{t('Campaign')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Advertising channel')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Digital assets')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Assigned to')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Primary email')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Main phone')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Full name')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Country')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Language')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Tracking date')}</th>
        <th className="px-3 py-3 text-left font-semibold">{t('Near status')}</th>
      </tr>

      <tr className="bg-white border-t border-gray-200 text-xs text-gray-700">
        <th className="px-3 py-2"></th>
        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Search...')}
            value={filters.campaign}
            onChange={(e) => handleFilterChange('campaign', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value="">{t('All')}</option>
            <option value="google">{t('Google Ads')}</option>
            <option value="facebook">{t('Meta Ads')}</option>
            <option value="tiktok">{t('TikTok')}</option>
            <option value="website">{t('Website')}</option>
            <option value="whatsapp">{t('WhatsApp')}</option>
          </select>
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Search...')}
            onChange={(e) => handleFilterChange('digital_assets', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Owner...')}
            value={filters.owner}
            onChange={(e) => handleFilterChange('owner', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Email...')}
            value={filters.email}
            onChange={(e) => handleFilterChange('email', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Phone...')}
            value={filters.phone}
            onChange={(e) => handleFilterChange('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Name...')}
            value={filters.full_name}
            onChange={(e) => handleFilterChange('full_name', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <input
            type="text"
            placeholder={t('Country...')}
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <select
            value={filters.language}
            onChange={(e) => handleFilterChange('language', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value="">{t('All')}</option>
            <option value="english">{t('English')}</option>
            <option value="arabic">{t('Arabic')}</option>
            <option value="french">{t('French')}</option>
            <option value="spanish">{t('Spanish')}</option>
          </select>
        </th>

        <th className="px-3 py-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          />
        </th>

        <th className="px-3 py-2">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-400"
          >
            <option value="">{t('All')}</option>
            <option value="new">{t('New')}</option>
            <option value="contacted">{t('Contacted')}</option>
            <option value="meeting_scheduled">{t('Meeting')}</option>
            <option value="proposal_sent">{t('Proposal')}</option>
            <option value="closed_won">{t('Closed Won')}</option>
            <option value="closed_lost">{t('Closed Lost')}</option>
          </select>
        </th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
      {paginatedLeads.map((lead) => {
        const rowSelected = selectedLeads.has(lead.id);
        const rawTrackingDate = new Date(lead.updated_at || lead.created_at);
        const trackingDate = Number.isNaN(rawTrackingDate.getTime()) ? new Date() : rawTrackingDate;
        const hoursDiff = (Date.now() - trackingDate.getTime()) / (1000 * 60 * 60);
        const isStale = hoursDiff > STALE_LEAD_THRESHOLD_HOURS;
        const rowClassNames = [
          'transition-colors cursor-pointer',
          rowSelected ? 'bg-blue-50/70 border-l-4 border-blue-500' : 'hover:bg-blue-50',
          isStale ? 'bg-rose-50/70 text-rose-900 border border-rose-200 hover:bg-rose-50/80' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <tr
            key={lead.id}
            className={rowClassNames}
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={rowSelected}
                onChange={() => handleLeadSelect(lead.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </td>
            <td className="px-3 py-2">{lead.campaign?.name || '--'}</td>
            <td className="px-3 py-2">
              {lead.source ? (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                  {lead.source === 'tiktok'
                    ? 'TikTok Leads'
                    : lead.source === 'google'
                    ? 'Google Ads'
                    : lead.source === 'facebook'
                    ? 'Facebook Ads'
                    : lead.source === 'landing_page'
                    ? 'Landing Page'
                    : lead.source === 'website'
                    ? 'Website'
                    : lead.source}
                </span>
              ) : (
                '--'
              )}
            </td>
            <td className="px-3 py-2 text-center">--</td>
            <td className="px-3 py-2">{lead.owner?.name || 'Unassigned'}</td>
            <td className="px-3 py-2">{lead.email || '--'}</td>
            <td className="px-3 py-2">{lead.phone || '--'}</td>
            <td className="px-3 py-2 font-medium text-gray-900">{lead.full_name}</td>
            <td className="px-3 py-2">{lead.country || '--'}</td>
            <td className="px-3 py-2 capitalize">{(lead as any)?.language || '--'}</td>
            <td className="px-3 py-2">
              <div
                className={`inline-block rounded px-2 py-1 text-xs text-center ${
                  isStale ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {trackingDate.toLocaleDateString('en-US', {
                  timeZone: 'Asia/Jerusalem',
                })}
                <br />
                <span className="text-[11px]">
                  {trackingDate.toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Jerusalem',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </td>
            <td className="px-3 py-2 text-sm text-gray-700">
              <span className="text-gray-600">
                {lead.status
                  ? lead.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'No answer'}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

      <div className="space-y-4 lg:hidden">
        {paginatedLeads.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No leads match the current filters.
          </div>
        ) : (
          paginatedLeads.map((lead) => {
            const cardSelected = selectedLeads.has(lead.id);
            return (
            <article
              key={lead.id}
              className={`rounded-2xl border p-5 shadow-sm transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                cardSelected ? 'border-blue-500 bg-blue-50/70 shadow-md' : 'border-slate-200 bg-white hover:shadow-md'
              }`}
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {lead.campaign?.name || 'No campaign'}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">{lead.full_name}</h2>
                    <p className="text-sm text-slate-500 flex flex-wrap items-center gap-1">
                      <span>{lead.country || 'Unknown'}</span>
                      <span className="text-slate-400">|</span>
                      <span>{formatSource(lead.source)}</span>
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={cardSelected}
                      onChange={() => handleLeadSelect(lead.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{lead.status || 'No status'}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Owner: {lead.owner?.name || 'Unassigned'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Updated{' '}
                    {new Date(lead.updated_at || lead.created_at).toLocaleString('en-US', {
                      timeZone: 'Asia/Jerusalem',
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('Email')}:</span>{' '}
                    {lead.email || t('N/A')}
                  </p>
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('Phone')}:</span>{' '}
                    {lead.phone || t('N/A')}
                  </p>
                  <p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('Language')}:</span>{' '}
                    {(lead as any)?.language || t('N/A')}
                  </p>
                </div>
              </div>
            </article>
            );
          })
        )}
      </div>


      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm mt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {t('Showing {start} to {end} of {total} results', {
                start: displayStart,
                end: displayEnd,
                total: totalRecords,
              })}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('Previous')}
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {t('Page {page} of {total}', { page: pagination.page, total: totalPages })}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('Next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* رسائل النجاح/الخطأ (موجودة عندك فوق — أبقيها كما هي إن رغبت) */}
      {message && (
        <div className={`mt-4 px-4 py-3 rounded border text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex justify-between items-center">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-lg leading-none">×</button>
          </div>
        </div>
      )}
       </motion.div>
    </div>
    


</main>


          {/* Add/Edit Lead Modal */}
          {(showAddModal || showEditModal) && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {showAddModal ? t('Add New Lead') : t('Edit Lead')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Full Name')} *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => handleFormChange('full_name', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Phone')}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Email')}</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Country')}</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleFormChange('country', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Language')}</label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleFormChange('language', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('Select Language')}</option>
                        <option value="english">{t('English')}</option>
                        <option value="arabic">{t('Arabic')}</option>
                        <option value="hebrew">{t('Hebrew')}</option>
                        <option value="spanish">{t('Spanish')}</option>
                        <option value="french">{t('French')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Source')}</label>
                      <select
                        value={formData.source}
                        onChange={(e) => handleFormChange('source', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">{t('Select Source')}</option>
                        <option value="facebook">{t('Facebook Ads')}</option>
                        <option value="google">{t('Google Ads')}</option>
                        <option value="tiktok">{t('TikTok')}</option>
                        <option value="website">{t('Website')}</option>
                        <option value="whatsapp">{t('WhatsApp')}</option>
                        <option value="phone">{t('Phone Call')}</option>
                        <option value="landing_page">{t('Landing Page')}</option>
                        <option value="email">{t('Email')}</option>
                        <option value="referral">{t('Referral')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Status')}</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="new">{t('New')}</option>
                        <option value="in_progress">{t('In Progress')}</option>
                        <option value="follow_up">{t('Follow Up')}</option>
                        <option value="not_answering">{t('Not Answering')}</option>
                        <option value="closed">{t('Closed')}</option>
                        <option value="won">{t('Won')}</option>
                        <option value="lost">{t('Lost')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('Campaign ID')}</label>
                      <input
                        type="number"
                        value={formData.campaign_id}
                        onChange={(e) => handleFormChange('campaign_id', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('Optional')}
                      />
                    </div>

                    {/* Owner Assignment Field */}
                    {user.role === 'admin' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('Assign to User')}</label>
                        <select
                          value={formData.owner_user_id}
                          onChange={(e) => handleFormChange('owner_user_id', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{t('Unassigned')}</option>
                          {assignableUsers.map((assignableUser) => (
                            <option key={assignableUser.id} value={assignableUser.id.toString()}>
                              {assignableUser.name} ({assignableUser.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : user.role === 'sales' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('Lead Owner')}</label>
                        <div className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-blue-50 text-blue-700 font-medium">
                          {user.name} (Auto-assigned)
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{t('Leads created by sales users are automatically assigned to them')}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('Current Owner')}</label>
                        <input
                          type="text"
                          value={editingLead?.owner?.name || t('Unassigned')}
                          disabled
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
                        />
                        <input
                          type="hidden"
                          value={formData.owner_user_id}
                          onChange={(e) => handleFormChange('owner_user_id', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('You cannot change lead ownership')}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={closeModals}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={handleSaveLead}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? t('Saving...') : (showAddModal ? t('Add Lead') : t('Update Lead'))}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Modal */}
          {showTransferModal && transferLead && selectedReceiver && (
            <LeadTransferModal
              lead={transferLead}
              receiver={selectedReceiver}
              onClose={closeModals}
              onSuccess={handleTransferSuccess}
            />
          )}

          {/* Bulk Delete Modal */}
          {showBulkDeleteModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex justify-center items-center">
              <div className="relative p-6 border w-11/12 max-w-md shadow-lg rounded-md bg-white z-50">
                <div className="mt-3 text-center">
                  {bulkDeleteProgress.current === 0 ? (
                    // Confirmation Step
                    <>
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('Delete Selected Leads')}
                      </h3>

                      <p className="text-sm text-gray-500 mb-4">
                        {t('Are you sure you want to delete {count} selected lead(s)_ This action cannot be undone_', { count: bulkDeleteProgress.total })}
                      </p>

                      {/* Show selected leads */}
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50 mb-4">
                        {leads
                          .filter(lead => selectedLeads.has(lead.id))
                          .slice(0, 5)
                          .map(lead => (
                            <div key={lead.id} className="flex items-center justify-between py-1 px-2 text-sm">
                              <span className="text-gray-700">{lead.full_name}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                lead.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                lead.status === 'follow_up' ? 'bg-purple-100 text-purple-800' :
                                lead.status === 'not_answering' ? 'bg-orange-100 text-orange-800' :
                                lead.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                lead.status === 'won' ? 'bg-green-100 text-green-800' :
                                lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {lead.status || 'No Status'}
                              </span>
                            </div>
                          ))}
                        {selectedLeads.size > 5 && (
                          <div className="text-center text-xs text-gray-500 py-1">
                            +{selectedLeads.size - 5} more leads
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setShowBulkDeleteModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {t('Cancel')}
                        </button>
                        <button
                          onClick={executeBulkDelete}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
                        >
                          {t('Delete Selected')}
                        </button>
                      </div>
                    </>
                  ) : (
                    // Progress Step
                    <>
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <svg className="h-6 w-6 text-red-600 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('Deleting Leads...')}
                      </h3>

                      <p className="text-sm text-gray-500 mb-4">
                        {t('Please wait while we delete the selected leads. This may take a few moments.')}
                      </p>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }}
                        ></div>
                      </div>

                      <div className="text-sm text-gray-600">
                        {t('Progress: {current} of {total}', {
                          current: bulkDeleteProgress.current,
                          total: bulkDeleteProgress.total
                        })}
                      </div>

                      <div className="mt-4 text-xs text-gray-400">
                        {t('Do not close this window until the process is complete.')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Edit Modal */}
         {/* Bulk Transfer Modal */}
{showBulkEditModal && (
  
   <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex justify-center items-start pt-20">
    
    <div className="relative p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white z-50">
    
        <div className="mt-3">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Transfer {selectedLeads.size} Lead{selectedLeads.size > 1 ? 's' : ''}
        </h3>

        <div className="space-y-4">
          {/* إظهار معلومات النقل */}
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-center mb-2">
              <div className="text-blue-600 mr-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-blue-800">
                You are about to transfer {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''}
              </p>
            </div>
            
            {selectedReceiver ? (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <div className="text-green-600 mr-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-green-700 font-medium">
                    Transfer to: {selectedReceiver.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedReceiver(null)}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center mt-2">
                <div className="text-orange-600 mr-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-orange-600">
                  Please select a user from the transfer sidebar first
                </p>
              </div>
            )}
          </div>

          {/* خيارات إضافية للنقل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Notes (Optional)
            </label>
            <textarea
              placeholder="Add notes about this transfer..."
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              onChange={(e) => setBulkEditData(prev => ({ ...prev, transfer_notes: e.target.value }))}
            />
          </div>

          {/* إظهار قائمة الـ Leads المحددة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Leads ({selectedLeads.size})
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
              {leads
                .filter(lead => selectedLeads.has(lead.id))
                .slice(0, 10) // إظهار أول 10 فقط لتجنب overflow
                .map(lead => (
                  <div key={lead.id} className="flex items-center justify-between py-1 px-2 text-sm">
                    <span className="text-gray-700">{lead.full_name}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'follow_up' ? 'bg-purple-100 text-purple-800' :
                      lead.status === 'not_answering' ? 'bg-orange-100 text-orange-800' :
                      lead.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                      lead.status === 'won' ? 'bg-green-100 text-green-800' :
                      lead.status === 'lost' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status || 'No Status'}
                    </span>
                  </div>
                ))}
              {selectedLeads.size > 10 && (
                <div className="text-center text-xs text-gray-500 py-1">
                  +{selectedLeads.size - 10} more leads
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setShowBulkEditModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleBulkTransfer}
            disabled={!selectedReceiver}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Transfer Leads</span>
          </button>
        </div>
      </div>
    </div>
    {showTransferSidebar && (
      <div className="ml-4 w-80 h-[80vh] bg-white shadow-lg rounded-md overflow-y-auto border border-gray-200">
        <TransferSidebar
          onUserSelect={handleSalesSelect}
          currentUserId={user.id}
          currentLeadId={transferLead?.id}
        />
      </div>
    )}
  </div>
)}

        </div>
      </div>
    </div>
  );
}
