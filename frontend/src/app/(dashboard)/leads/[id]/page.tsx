'use client';

import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { leadsAPI, messagesAPI, twilioSettingsAPI, default as api } from '@/lib/api';
import toast from 'react-hot-toast';
import { LeadStatusBoard, STATUS_META  } from '@/components/LeadStatusBoard';
import { LeadStatus } from '@/lib/models';
import Link from 'next/link';
import TransferSidebar from '@/components/TransferSidebar';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Bell, BellRing } from 'lucide-react';
import { useSocket } from '@/components/SocketProvider';
import { TwilioSettingsFormValues, TwilioSettingsModal } from '@/components/TwilioSettingsModal';
import { useUi } from '@/store/uiStore';
import TaskDetailsModal from '@/components/TaskDetailsModal';


interface Email {
  id: number;
  subject: string;
  to: string;
  body: string;
  status: 'sent' | 'draft' | 'failed';
  sent_at: string;
  created_by: string;
}

interface FileItem {
  id: number;
  name: string;
  size: string;
  url: string;
  uploaded_at: string;
  uploaded_by: string;
}

interface LeadNote {
  id: number;
  note: string;
  created_at: string;
  user: {
    id: number;
    name: string;
  };
}

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source?: string;
  status?: string;
  substatus?: string;
  created_at: string;
  updated_at?: string;
  last_interaction_date?: string;
  campaign?: {
    id: number;
    name: string;
  };
  owner?: {
    id: number;
    name: string;
  };
  notes?: LeadNote[];
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  duration: string;
  location: string;
  participants: string[];
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  created_by: string;
}

interface PriceOffer {
  id: number;
  title: string;
  amount: number;
  currency: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  description: string;
  valid_until: string;
  created_at: string;
  created_by: string;
}

interface SMS {
  id: number;
  to: string;
  message: string;
  status: 'sent' | 'failed';
  sent_at: string;
  created_by: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_to?: {
    id: number;
    name: string;
  };
  created_by: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
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

interface TwilioSettings {
  id: number;
  account_sid: string;
  auth_token: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

const INACTIVITY_THRESHOLD_HOURS = 4;

const TABS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'files', label: 'Files' },
  { id: 'priceOffers', label: 'Price Offers' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'emails', label: 'Emails' },
  { id: 'sms', label: 'SMS' },
  { id: 'notes', label: 'Notes' },
];

type MeetingModalMode = 'create' | 'change' | 'cancel';

const SCHEDULE_MEETING_VALUE =
  STATUS_META.meeting?.subStatuses.find((sub) => sub.label === 'Schedule meeting')?.value ||
  'تحديد اجتماع';
const RESCHEDULE_MEETING_VALUE =
  STATUS_META.meeting?.subStatuses.find((sub) => sub.label === 'Reschedule meeting')?.value ||
  'تغيير وقت الاجتماع';
const CANCEL_MEETING_VALUE =
  STATUS_META.meeting?.subStatuses.find((sub) => sub.label === 'Cancel meeting')?.value ||
  'إلغاء اجتماع';

const MEETING_SUBSTATUS_ACTION_MAP: Record<string, MeetingModalMode> = {
  [SCHEDULE_MEETING_VALUE]: 'create',
  [RESCHEDULE_MEETING_VALUE]: 'change',
  [CANCEL_MEETING_VALUE]: 'cancel',
};

const getResponseData = (response: any): any[] => {
  if (Array.isArray(response?.data)) {
    return response.data;
  } else if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  } else if (Array.isArray(response)) {
    return response;
  }
  return [];
};

export default function EditLeadDetailsPage() {
  const { t } = useLanguage();
  const ui = useUi();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [emailCardAnimation, setEmailCardAnimation] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [priceOffers, setPriceOffers] = useState<PriceOffer[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [showEmailCard, setShowEmailCard] = useState(false);
  const [smsMessages, setSmsMessages] = useState<SMS[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editableField, setEditableField] = useState<string | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<User | null>(null);
  const [lastInteraction, setLastInteraction] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  // Transfer related state
  const [selectedTransferUser, setSelectedTransferUser] = useState<any>(null);
  const [transferNotes, setTransferNotes] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: '',
  });

  // Deal and Meeting modal states
  const [showDealModal, setShowDealModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: LeadStatus;
    substatus?: string | null;
  } | null>(null);
  const [dealForm, setDealForm] = useState({
    amount: '',
    currency: 'USD',
    description: '',
  });
  const [meetingFormModal, setMeetingFormModal] = useState({
    title: '',
    date: '',
    duration: '30',
    location: '',
    notes: '',
  });
  const [trackingMeetingDateTime, setTrackingMeetingDateTime] = useState(
    () => new Date().toISOString().slice(0, 16),
  );
  const [meetingModalMode, setMeetingModalMode] = useState<MeetingModalMode>('create');
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [savingDeal, setSavingDeal] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings | null>(null);
  const [twilioSettingsLoaded, setTwilioSettingsLoaded] = useState(false);
  const [twilioSettingsModalOpen, setTwilioSettingsModalOpen] = useState(false);
  const [twilioSettingsSaving, setTwilioSettingsSaving] = useState(false);
  const [twilioSettingsError, setTwilioSettingsError] = useState<string | null>(null);
  const [callAfterSettings, setCallAfterSettings] = useState(false);


  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    country: '',
    city: '',
    language: '',
    source: '',
    status: 'new',
    campaign_id: '',
  });

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    duration: '30',
    location: '',
    participants: '',
    notes: '',
  });

  const leadSignals = [
    { label: 'Source', icon: 'SRC', value: lead?.source || 'Unknown' },
    { label: 'Call Status', icon: 'CALL', value: lead?.status || 'new' },
    { label: 'Campaign', icon: 'CMP', value: lead?.campaign?.name || 'Not set' },
    { label: 'Owner', icon: 'OWN', value: lead?.owner?.name || 'Unassigned' },
    { label: 'Country', icon: 'CTRY', value: lead?.country || 'Unknown' },
    { label: 'Language', icon: 'LANG', value: lead?.language || 'N/A' },
  ];

  const activityState = useMemo(() => {
    if (!lastInteraction) {
      return {
        label: 'No updates yet',
        needsAttention: true,
        tooltip: 'No recorded CRM activity',
      };
    }

    const diffMs = Math.max(0, now - lastInteraction.getTime());
    const thresholdMs = INACTIVITY_THRESHOLD_HOURS * 60 * 60 * 1000;
    const minutes = Math.floor(diffMs / 60000);
    let relativeLabel = 'Just now';

    if (minutes >= 60 * 24) {
      const days = Math.floor(minutes / (60 * 24));
      relativeLabel = `${days}d ago`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      relativeLabel = `${hours}h ago`;
    } else if (minutes >= 1) {
      relativeLabel = `${minutes}m ago`;
    }

    return {
      label: `Updated ${relativeLabel}`,
      needsAttention: diffMs >= thresholdMs,
      tooltip: lastInteraction.toLocaleString(),
    };
  }, [lastInteraction, now]);

  const [priceOfferForm, setPriceOfferForm] = useState({
    title: '',
    amount: '',
    currency: 'USD',
    description: '',
    valid_until: '',
  });

  const [smsForm, setSmsForm] = useState({
    message: '',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to_user_id: '',
  });

  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const leadNumericId = Number(leadId);

  useEffect(() => {
    if (!lead) {
      setLastInteraction(null);
      return;
    }
    const source =
      lead.last_interaction_date || lead.updated_at || lead.created_at;

    setLastInteraction(source ? new Date(source) : null);
  }, [lead?.last_interaction_date, lead?.updated_at, lead?.created_at]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleLeadRealtimeUpdate = (payload: any) => {
      const payloadLead = payload?.lead || payload?.data || payload;
      const payloadLeadId =
        payloadLead?.id ?? payload?.leadId ?? payload?.entityId;

      if (!payloadLeadId || Number(payloadLeadId) !== leadNumericId) {
        return;
      }

      setLead((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          full_name:
            payloadLead.full_name ?? payloadLead.name ?? prev.full_name,
          phone: payloadLead.phone ?? prev.phone,
          email: payloadLead.email ?? prev.email,
          country: payloadLead.country ?? prev.country,
          city: payloadLead.city ?? prev.city,
          language: payloadLead.language ?? prev.language,
          source: payloadLead.source ?? prev.source,
          status: payloadLead.status ?? prev.status,
          substatus: payloadLead.substatus ?? prev.substatus,
          campaign: payloadLead.campaign
            ? {
                id: payloadLead.campaign.id,
                name: payloadLead.campaign.name,
              }
            : prev.campaign,
          owner: payloadLead.owner
            ? {
                id: payloadLead.owner.id,
                name: payloadLead.owner.name,
              }
            : prev.owner,
          last_interaction_date:
            payloadLead.last_interaction_date ?? prev.last_interaction_date,
          updated_at: payloadLead.updated_at ?? prev.updated_at,
        } as Lead;
      });

      if (payloadLead?.last_interaction_date) {
        setLastInteraction(new Date(payloadLead.last_interaction_date));
      }
    };

    socket.on('lead:updated', handleLeadRealtimeUpdate);
    socket.on('lead_update', handleLeadRealtimeUpdate);
    socket.on('leadUpdated', handleLeadRealtimeUpdate);

    return () => {
      socket.off('lead:updated', handleLeadRealtimeUpdate);
      socket.off('lead_update', handleLeadRealtimeUpdate);
      socket.off('leadUpdated', handleLeadRealtimeUpdate);
    };
  }, [socket, leadNumericId]);

  const ActivityIcon = activityState.needsAttention ? BellRing : Bell;

  const handleWhatsAppClick = () => {
    if (!lead?.phone) {
      ui.alert({
        title: t('No Phone Number'),
        message: t('No phone number available for this lead'),
        variant: 'warning',
      });
      return;
    }
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const initiateCallRequest = async () => {
    if (!lead?.phone) {
      ui.alert({
        title: t('No Phone Number'),
        message: t('No phone number available for this lead'),
        variant: 'warning',
      });
      return;
    }

    try {
      const response = await api.post('/api/calls/initiate', {
        lead_id: parseInt(leadId),
        phone_number: lead.phone,
        lead_name: lead.full_name,
      });

      if (response.data.success) {
        ui.alert({
          title: t('Call Initiated'),
          message: t('Call initiated to {name} at {phone}', { name: lead.full_name, phone: lead.phone }),
          variant: 'success',
        });
        await loadLeadDetails();
      } else {
        ui.alert({
          title: t('Call Failed'),
          message: t('Failed to initiate call: {error}', { error: response.data.message || 'Unknown error' }),
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Call initiation error:', error);
      ui.alert({
        title: t('Call Failed'),
        message: t('Failed to initiate call: {error}', { error: error.response?.data?.message || error.message }),
        variant: 'error',
      });
    }
  };

  const handleCallClick = async () => {
    if (!lead?.phone) {
      alert('No phone number available for this lead');
      return;
    }

    let settingsToUse = twilioSettings;

    if (!twilioSettingsLoaded) {
      settingsToUse = await loadTwilioSettings();
    }

    if (!settingsToUse) {
      setCallAfterSettings(true);
      setTwilioSettingsModalOpen(true);
      setTwilioSettingsError(null);
      return;
    }

    await initiateCallRequest();
  };

  const handleTwilioSettingsSubmit = async (values: TwilioSettingsFormValues) => {
    setTwilioSettingsSaving(true);
    setTwilioSettingsError(null);

    try {
      const payload = {
        account_sid: values.accountSid.trim(),
        auth_token: values.authToken.trim(),
        phone_number: values.phoneNumber.trim(),
      };

      const response = await twilioSettingsAPI.createSettings(payload);
      const savedSettings = response.data?.data || response.data;
      setTwilioSettings(savedSettings);
      setTwilioSettingsModalOpen(false);
      setTwilioSettingsLoaded(true);

      if (callAfterSettings) {
        setCallAfterSettings(false);
        await initiateCallRequest();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save Twilio settings';
      setTwilioSettingsError(message);
    } finally {
      setTwilioSettingsSaving(false);
    }
  };

  const handleTwilioModalClose = () => {
    setTwilioSettingsModalOpen(false);
    setTwilioSettingsError(null);
    setCallAfterSettings(false);
  };

  const handleSMSClick = () => {
    if (!lead?.phone) {
      alert('No phone number available for this lead');
      return;
    }

    // Set a default follow-up message and open SMS card
    setSmsForm({
      message: `Hi ${lead.full_name}, this is a follow-up from our team. How can we help you today?`,
    });

    // Switch to SMS tab
    setActiveTab('sms');

    // Scroll to SMS form area
    setTimeout(() => {
      const smsSection = document.querySelector('[data-sms-form]');
      if (smsSection) {
        smsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Update lead status using the proper API method
const handleMove = async (leadId: number, to: { status: LeadStatus; substatus?: string | null }) => {
  try {
    // Check if this is a meeting-related substatus
    const isScheduleMeeting = to.substatus === 'تحديد اجتماع';
    const isRescheduleMeeting = to.substatus === 'تغيير وقت الاجتماع';
    const isCancelMeeting = to.substatus === 'إلغاء اجتماع';

    // Check if this is a deal-related substatus
    const isDealStatus = to.substatus === 'صفقة في 10 الشهر' || to.substatus === 'صفقة مغلقة';

    // If it's schedule meeting, show meeting modal for creating
    if (isScheduleMeeting) {
      setPendingStatusChange(to);
      setMeetingModalMode('create');
      setShowMeetingModal(true);
      return; // Don't update status yet, wait for meeting to be created
    }

    // If it's reschedule meeting, show meeting selection modal for changing
    if (isRescheduleMeeting) {
      setPendingStatusChange(to);
      setMeetingModalMode('change');
      setShowMeetingModal(true);
      return;
    }

    // If it's cancel meeting, show meeting selection modal for deleting
    if (isCancelMeeting) {
      setPendingStatusChange(to);
      setMeetingModalMode('cancel');
      setShowMeetingModal(true);
      return;
    }

    // If it's a deal status, show deal modal first
    if (isDealStatus) {
      setPendingStatusChange(to);
      setShowDealModal(true);
      return; // Don't update status yet, wait for deal to be created
    }

    // For other statuses, update immediately
    const response = await leadsAPI.updateLeadStatus(leadId, to);
    const { data } = await leadsAPI.getLead(leadId);
    setLead(data);
    toast.success(t('Status updated successfully'));
    return response.data;
  } catch (error) {
    console.error('Error updating lead status:', error);
    toast.error(t('Failed to update status'));
    throw error;
  }
};

  const performStatusChange = async (
    leadId: number,
    to: { status: LeadStatus; substatus?: string | null },
  ) => {
    try {
      // Use the proper API method to update status and substatus
      await leadsAPI.updateLeadStatus(leadId, to);
      toast.success(t('Status updated successfully'));

      // Reload lead data to get updated status and substatus
      const { data } = await leadsAPI.getLead(leadId);
      setLead(data);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t('Failed to update status'));
    }
  };

  const handleSaveDeal = async (leadId: number, amount: number) => {
    try {
      await api.post('/api/deals', { lead_id: leadId, amount });
      toast.success(`تم حفظ الصفقة بمبلغ ${amount}`);
    } catch {
      toast.error('فشل في حفظ الصفقة');
    }
  };

  const handleMeetingDateSelect = useCallback((date: string) => {
    setMeetingForm((prev) => ({
      ...prev,
      date,
    }));
  }, []);

  const handleMeetingDetailsSelect = useCallback((details: {
    title: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    notes: string;
  }) => {
    const dateTime = details.time ? `${details.date}T${details.time}` : details.date;
    setMeetingForm((prev) => ({
      ...prev,
      title: details.title,
      date: dateTime,
      duration: details.duration,
      location: details.location,
      notes: details.notes,
    }));
  }, []);

  const getMeetingActionFromSubstatus = (substatus?: string | null): MeetingModalMode => {
    if (!substatus) return 'create';
    return MEETING_SUBSTATUS_ACTION_MAP[substatus] || 'create';
  };

  const toDateTimeLocalValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  };

  const prefillMeetingFormFromMeeting = (meeting: Meeting) => {
    setMeetingFormModal({
      title: meeting.title || '',
      date: toDateTimeLocalValue(meeting.date),
      duration: meeting.duration?.toString() || '30',
      location: meeting.location || '',
      notes: meeting.notes || '',
    });
  };

  const handleTrackingDateChange = (value: string) => {
    setTrackingMeetingDateTime(value);
    setMeetingFormModal((prev) => ({
      ...prev,
      date: value,
    }));
  };

  // ====== LOADERS ======

  const loadLeadDetails = async () => {
    try {
      const response = await leadsAPI.getLead(parseInt(leadId));
      const leadData = response.data;
      setLead(leadData);
      setFormData({
        full_name: leadData.full_name || '',
        phone: leadData.phone || '',
        email: leadData.email || '',
        country: leadData.country || '',
        city: leadData.city || '',
        language: leadData.language || '',
        source: leadData.source || '',
        status: leadData.status || 'new',
        campaign_id: leadData.campaign?.id?.toString() || '',
      });
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 404) {
        alert('Access denied or lead not found');
        router.push('/leads');
      } else {
        console.error('Error loading lead:', error);
      }
    }
  };

  const loadTwilioSettings = async (): Promise<TwilioSettings | null> => {
    try {
      const response = await twilioSettingsAPI.getMySettings();
      const settingsData = response.data?.data || response.data;
      setTwilioSettings(settingsData);
      return settingsData;
    } catch (error: any) {
      if (error.response?.status === 404) {
        setTwilioSettings(null);
      } else {
        console.error('Error loading Twilio settings:', error);
        toast.error(error.response?.data?.message || 'Failed to load Twilio settings');
      }
      return null;
    } finally {
      setTwilioSettingsLoaded(true);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await leadsAPI.getLeadNotes(parseInt(leadId));
      const notesData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await leadsAPI.getLeadFiles(parseInt(leadId));
      const filesData = getResponseData(response);
      setFiles(filesData);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };
  
  

  const loadPriceOffers = async () => {
    try {
      const response = await leadsAPI.getLeadPriceOffers(parseInt(leadId));
      const priceOffersData = getResponseData(response);
      setPriceOffers(priceOffersData || []);
    } catch (error) {
      console.error('Error loading price offers:', error);
      setPriceOffers([]);
    }
  };

  const loadDeals = async () => {
    try {
      const response = await api.get(`/api/deals?lead_id=${leadId}`);
      setDeals(response.data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      setDeals([]);
    }
  };

  const loadMeetings = async (): Promise<Meeting[]> => {
    try {
      const response = await leadsAPI.getLeadMeetings(parseInt(leadId));
      const meetingsData = getResponseData(response);
      const normalizedMeetings = meetingsData || [];
      setMeetings(normalizedMeetings);
      return normalizedMeetings;
    } catch (error) {
      console.error('Error loading meetings:', error);
      setMeetings([]);
      return [];
    }
  };

  const loadEmails = async () => {
    try {
      const response = await messagesAPI.getLeadEmails(parseInt(leadId));
      const emailsData = getResponseData(response);
      setEmails(emailsData);
    } catch (error) {
      console.error('Error loading emails:', error);
      setEmails([]);
    }
  };

  const loadSMS = async () => {
    try {
      const response = await messagesAPI.getLeadSMS(parseInt(leadId));
      const smsData = getResponseData(response);
      setSmsMessages(smsData);
    } catch (error) {
      console.error('Error loading SMS:', error);
      setSmsMessages([]);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await leadsAPI.getLeadTasks(parseInt(leadId));
      const tasksData = getResponseData(response);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  // ====== HANDLERS ======

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note');
      return;
    }

    setSavingNote(true);
    try {
      await leadsAPI.addLeadNote(parseInt(leadId), newNote.trim());
      setNewNote('');
      await loadNotes();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveLead = async () => {
    if (!formData.full_name.trim()) {
      alert('Full name is required');
      return;
    }

    setSaving(true);
    try {
      // Prepare data with proper type conversions
      const updateData = {
        ...formData,
        campaign_id: formData.campaign_id ? parseInt(formData.campaign_id as string) : null,
      };

      await leadsAPI.updateLead(parseInt(leadId), updateData);
      toast.success(t('Lead updated successfully!'));
      await loadLeadDetails();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('Failed to update lead');
      toast.error(errorMessage);
      console.error('Error updating lead:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploadingFile(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('name', selectedFile.name);
      uploadFormData.append('size', (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB');
      uploadFormData.append('type', selectedFile.type);

      await leadsAPI.uploadLeadFile(parseInt(leadId), uploadFormData);

      alert('File uploaded successfully!');
      setSelectedFile(null);
      await loadFiles();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreatePriceOffer = async () => {
    if (!priceOfferForm.title.trim() || !priceOfferForm.amount) {
      alert('Title and amount are required');
      return;
    }

    try {
      await leadsAPI.createPriceOffer(parseInt(leadId), {
        title: priceOfferForm.title,
        amount: parseFloat(priceOfferForm.amount),
        currency: priceOfferForm.currency,
        description: priceOfferForm.description,
        valid_until: priceOfferForm.valid_until,
        status: 'pending',
      });

      alert('Price offer created successfully!');
      setPriceOfferForm({
        title: '',
        amount: '',
        currency: 'USD',
        description: '',
        valid_until: '',
      });
      await loadPriceOffers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create price offer');
    }
  };

  const handleUserSelect = (receiver: User) => {
    setSelectedReceiver(receiver);
  };

  const handleTransferUserSelect = (user: any) => {
    setSelectedTransferUser(user);
    setShowTransferModal(true);
  };

  const handleTransferLead = async () => {
    if (!selectedTransferUser) {
      alert('Please select a user to transfer to');
      return;
    }

    if (!lead) {
      alert('Lead data not available');
      return;
    }

    setTransferring(true);
    try {
      await leadsAPI.transferLead(lead.id, selectedTransferUser.id, transferNotes.trim());
      alert(`Lead "${lead.full_name}" successfully transferred to ${selectedTransferUser.name}`);
      setShowTransferModal(false);
      setSelectedTransferUser(null);
      setTransferNotes('');
      // Reload lead data to show new owner
      await loadLeadDetails();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to transfer lead');
    } finally {
      setTransferring(false);
    }
  };


  const handleScheduleMeeting = async () => {
    if (!meetingForm.title.trim() || !meetingForm.date) {
      alert('Title and date are required');
      return;
    }

    try {
      await leadsAPI.scheduleMeeting(parseInt(leadId), {
        title: meetingForm.title,
        date: meetingForm.date,
        duration: parseInt(meetingForm.duration),
        location: meetingForm.location,
        participants: meetingForm.participants,
        notes: meetingForm.notes,
        status: 'scheduled',
      });

      alert('Meeting scheduled successfully!');
      setMeetingForm({
        title: '',
        date: '',
        duration: '30',
        location: '',
        participants: '',
        notes: '',
      });
      await loadMeetings();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const handleOpenEmailCard = () => {
    if (!lead?.email) {
      alert('No email address available for this lead');
      return;
    }
    setEmailForm({
      subject: `Follow up with ${lead.full_name}`,
      body: '',
    });
    setShowEmailCard(true);
    setTimeout(() => setEmailCardAnimation(true), 10);
  };

  const handleCloseEmailCard = () => {
    setEmailCardAnimation(false);
    setTimeout(() => {
      setShowEmailCard(false);
      setEmailForm({ subject: '', body: '' });
    }, 300);
  };

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.body.trim()) {
      alert('Subject and body are required');
      return;
    }

    setSendingEmail(true);
    try {
      await messagesAPI.sendEmail({
        lead_id: parseInt(leadId),
        subject: emailForm.subject,
        body: emailForm.body,
      });

      alert('Email sent successfully!');
      setEmailForm({ subject: '', body: '' });
      handleCloseEmailCard();
      await loadEmails();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.message.trim()) {
      alert('Message is required');
      return;
    }

    setSendingSMS(true);
    try {
      await leadsAPI.sendSMS(parseInt(leadId), { message: smsForm.message });

      alert('SMS sent successfully!');
      setSmsForm({ message: '' });
      await loadSMS();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      alert('Task title is required');
      return;
    }

    try {
      await leadsAPI.createTask(parseInt(leadId), {
        title: taskForm.title,
        description: taskForm.description,
        due_date: taskForm.due_date,
        priority: taskForm.priority,
        status: 'pending',
      });

      alert('Task created successfully!');
      setTaskForm({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        assigned_to_user_id: '',
      });
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await leadsAPI.updateTask(parseInt(leadId), taskId, { status: newStatus });
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update task');
    }
  };

  // Alias for TaskDetailsModal compatibility
  const handleTaskStatusUpdate = handleUpdateTaskStatus;

  const handleTaskModalClose = () => {
    setTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleDealSubmit = async () => {
    if (!dealForm.amount || parseFloat(dealForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSavingDeal(true);
    try {
      const substatus = pendingStatusChange?.substatus;

      // Check if the substatus is "Deal on the 10th of the month" (صفقة في 10 الشهر)
      if (substatus === 'صفقة في 10 الشهر') {
        // Save as price offer with pending status
        await leadsAPI.createPriceOffer(parseInt(leadId), {
          title: `Deal - ${lead?.full_name}`,
          amount: parseFloat(dealForm.amount),
          currency: dealForm.currency,
          description: dealForm.description || 'Deal on the 10th of the month',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          status: 'pending',
        });
        toast.success(t('Price offer saved successfully'));
      } else if (substatus === 'صفقة مغلقة') {
        // Save to deals table
        await api.post('/api/deals', {
          lead_id: parseInt(leadId),
          amount: parseFloat(dealForm.amount),
          currency: dealForm.currency,
          description: dealForm.description || 'Closed deal',
        });

        // Also create a price offer with accepted status for closed deals
        await leadsAPI.createPriceOffer(parseInt(leadId), {
          title: `Closed Deal - ${lead?.full_name}`,
          amount: parseFloat(dealForm.amount),
          currency: dealForm.currency,
          description: dealForm.description || 'Closed deal',
          valid_until: new Date().toISOString().split('T')[0], // Today
          status: 'accepted',
        });

        toast.success(t('Deal saved successfully with amount {amount} {currency}', {
          amount: dealForm.amount,
          currency: dealForm.currency
        }));
      }

      // Update status
      if (pendingStatusChange) {
        await performStatusChange(parseInt(leadId), pendingStatusChange);
      }

      setShowDealModal(false);
      setDealForm({ amount: '', currency: 'USD', description: '' });
      setPendingStatusChange(null);
      await loadPriceOffers();
      await loadDeals();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create deal');
    } finally {
      setSavingDeal(false);
    }
  };

  const handleMeetingModalConfirm = async () => {
    if (!pendingStatusChange) {
      toast.error(t('No status update prepared for this action.'));
      return;
    }

    if (meetingModalMode === 'cancel') {
      if (!selectedMeetingId) {
        toast.error(t('Please select a meeting to cancel.'));
        return;
      }
      setSavingMeeting(true);
      try {
        await leadsAPI.deleteMeeting(parseInt(leadId), selectedMeetingId);
        alert(t('Meeting cancelled successfully!'));
        await loadMeetings();
        await performStatusChange(parseInt(leadId), pendingStatusChange);
        setShowMeetingModal(false);
        setSelectedMeetingId(null);
        setPendingStatusChange(null);
      } catch (error: any) {
        alert(error.response?.data?.message || t('Failed to cancel meeting'));
      } finally {
        setSavingMeeting(false);
      }
      return;
    }

    if (!meetingFormModal.title.trim() || !meetingFormModal.date) {
      alert(t('Title and date are required'));
      return;
    }

    if (meetingModalMode === 'change' && !selectedMeetingId) {
      toast.error(t('Please select a meeting to update.'));
      return;
    }

    setSavingMeeting(true);
    try {
      if (meetingModalMode === 'change' && selectedMeetingId) {
        await leadsAPI.updateMeeting(parseInt(leadId), selectedMeetingId, {
          title: meetingFormModal.title,
          date: meetingFormModal.date,
          duration: parseInt(meetingFormModal.duration),
          location: meetingFormModal.location,
          notes: meetingFormModal.notes,
          status: 'scheduled',
        });
        alert(t('Meeting updated successfully!'));
      } else {
        await leadsAPI.scheduleMeeting(parseInt(leadId), {
          title: meetingFormModal.title,
          date: meetingFormModal.date,
          duration: parseInt(meetingFormModal.duration),
          location: meetingFormModal.location,
          participants: '',
          notes: meetingFormModal.notes,
          status: 'scheduled',
        });
        alert(t('Meeting scheduled successfully!'));
      }

      const meetingNoteParts: string[] = [];
      if (meetingFormModal.date) {
        meetingNoteParts.push(
          meetingModalMode === 'change'
            ? `${t('Meeting updated to')}: ${formatDate(meetingFormModal.date)}`
            : `${t('Meeting time')}: ${formatDate(meetingFormModal.date)}`
        );
      }
      if (pendingStatusChange?.substatus) {
        meetingNoteParts.push(`Substatus: ${pendingStatusChange.substatus}`);
      }
      if (meetingNoteParts.length > 0) {
        try {
          await leadsAPI.addLeadNote(parseInt(leadId), meetingNoteParts.join(' | '));
          await loadNotes();
        } catch (noteError) {
          console.error('Failed to save meeting notes entry:', noteError);
        }
      }

      await loadMeetings();
      await performStatusChange(parseInt(leadId), pendingStatusChange);

      setShowMeetingModal(false);
      setMeetingFormModal({
        title: '',
        date: '',
        duration: '30',
        location: '',
        notes: '',
      });
      if (meetingModalMode === 'create') {
        setTrackingMeetingDateTime(new Date().toISOString().slice(0, 16));
      }
      setMeetingModalMode('create');
      setSelectedMeetingId(null);
      setPendingStatusChange(null);
    } catch (error: any) {
      const defaultMessage =
        meetingModalMode === 'change'
          ? t('Failed to update meeting')
          : t('Failed to schedule meeting');
      alert(error.response?.data?.message || defaultMessage);
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleMeetingModalClose = () => {
    setShowMeetingModal(false);
    setMeetingModalMode('create');
    setSelectedMeetingId(null);
    setPendingStatusChange(null);
    setMeetingFormModal({
      title: '',
      date: trackingMeetingDateTime,
      duration: '30',
      location: '',
      notes: '',
    });
  };

  const handleDeleteTask = async (taskId: number) => {
    ui.confirm({
      title: t('Delete Task'),
      message: t('Are you sure you want to delete this task? This action cannot be undone.'),
      variant: 'danger',
      confirmText: t('Delete'),
      cancelText: t('Cancel'),
      onConfirm: async () => {
        try {
          await leadsAPI.deleteTask(parseInt(leadId), taskId);
          await loadTasks();
          ui.alert({
            title: t('Success'),
            message: t('Task deleted successfully'),
            variant: 'success',
          });
        } catch (error: any) {
          ui.alert({
            title: t('Error'),
            message: error.response?.data?.message || t('Failed to delete task'),
            variant: 'error',
          });
        }
      },
    });
  };

  // Alias for TaskDetailsModal compatibility
  const handleTaskDelete = handleDeleteTask;

  // ====== INIT EFFECT ======

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
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }

    const initializeData = async () => {
      await Promise.all([
        loadLeadDetails(),
        loadNotes(),
        loadFiles(),
        loadPriceOffers(),
        loadDeals(),
        loadMeetings(),
        loadEmails(),
        loadSMS(),
        loadTasks(),
        loadTwilioSettings(),
      ]);
      setLoading(false);
    };

    initializeData();
  }, [router, leadId]);

  // ====== RENDER STATES ======

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


  const meetingModalTitle =
    meetingModalMode === 'cancel'
      ? t('Cancel Meeting')
      : meetingModalMode === 'change'
      ? t('Update Meeting')
      : t('Schedule Meeting');
  const meetingModalDescription =
    meetingModalMode === 'cancel'
      ? t('Select a meeting to cancel for {name}', { name: lead?.full_name || '' })
      : meetingModalMode === 'change'
      ? t('Update meeting details for {name}', { name: lead?.full_name || '' })
      : t('Set meeting details for {name}', { name: lead?.full_name || '' });
  const meetingModalHeaderClass =
    meetingModalMode === 'cancel'
      ? 'bg-red-600'
      : meetingModalMode === 'change'
      ? 'bg-blue-600'
      : 'bg-orange-600';
  const meetingModalButtonLabel =
    meetingModalMode === 'cancel'
      ? savingMeeting
        ? t('Deleting...')
        : t('Delete Meeting')
      : meetingModalMode === 'change'
      ? savingMeeting
        ? t('Updating...')
        : t('Update Meeting')
      : savingMeeting
      ? t('Scheduling...')
      : t('Schedule Meeting');
  const meetingModalButtonClass =
    meetingModalMode === 'cancel'
      ? 'bg-red-600 hover:bg-red-700'
      : meetingModalMode === 'change'
      ? 'bg-blue-600 hover:bg-blue-700'
      : 'bg-orange-600 hover:bg-orange-700';
  const meetingModalActionDisabled =
    savingMeeting ||
    (meetingModalMode === 'cancel' && !selectedMeetingId) ||
    (meetingModalMode === 'change' &&
      (!selectedMeetingId || !meetingFormModal.title.trim() || !meetingFormModal.date)) ||
    (meetingModalMode === 'create' && (!meetingFormModal.title.trim() || !meetingFormModal.date));

  return (

      <div className="min-h-screen bg-gray-50 font-sans">
        
      {/* Floating Email Card */}
      {showEmailCard && (
        <>
          <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${
              emailCardAnimation ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleCloseEmailCard}
          />

          <div
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
              emailCardAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
          >
            <div className="bg-white rounded-xl shadow-2xl  w-full  max-h-[90vh] overflow-hidden">
              <div className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Send Email</h2>
                  <p className="text-purple-100 text-sm">To: {lead.email}</p>
                </div>
                <button
                  onClick={handleCloseEmailCard}
                  className="text-white hover:text-purple-200 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white rounded"
                  aria-label="Close email card"
                >
                  ×
                </button>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Email subject"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) =>
                      setEmailForm((prev) => ({ ...prev, body: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={8}
                    placeholder="Type your email message here..."
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Templates
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        setEmailForm((prev) => ({
                          ...prev,
                          subject: `Follow up with ${lead.full_name}`,
                          body: `Dear ${lead.full_name},\n\nI hope this email finds you well. I wanted to follow up on our previous conversation.\n\nPlease let me know if you have any questions or need further information.\n\nBest regards,\n${
                            user?.name || 'Sales Team'
                          }`,
                        }))
                      }
                      className="p-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Follow Up
                    </button>
                    <button
                      onClick={() =>
                        setEmailForm((prev) => ({
                          ...prev,
                          subject: `Meeting Request - ${lead.full_name}`,
                          body: `Dear ${lead.full_name},\n\nI would like to schedule a meeting to discuss your requirements in more detail.\n\nPlease let me know your availability for the coming week.\n\nBest regards,\n${
                            user?.name || 'Sales Team'
                          }`,
                        }))
                      }
                      className="p-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Meeting Request
                    </button>
                    <button
                      onClick={() =>
                        setEmailForm((prev) => ({
                          ...prev,
                          subject: `Proposal for ${lead.full_name}`,
                          body: `Dear ${lead.full_name},\n\nThank you for your interest. I've attached our proposal for your review.\n\nPlease review the document and let me know if you have any questions.\n\nBest regards,\n${
                            user?.name || 'Sales Team'
                          }`,
                        }))
                      }
                      className="p-2 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      Proposal
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Characters: {emailForm.body.length}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCloseEmailCard}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={
                      sendingEmail ||
                      !emailForm.subject.trim() ||
                      !emailForm.body.trim()
                    }
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {sendingEmail && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{sendingEmail ? 'Sending...' : 'Send Email'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deal Modal */}
      {showDealModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
            onClick={() => setShowDealModal(false)}
          />

          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] transition-all duration-300 scale-100 opacity-100">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Create Deal</h2>
                  <p className="text-green-100 text-sm">Enter deal details for {lead?.full_name}</p>
                </div>
                <button
                  onClick={() => setShowDealModal(false)}
                  className="text-white hover:text-green-200 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white rounded"
                  aria-label="Close deal modal"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      value={dealForm.amount}
                      onChange={(e) => setDealForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={dealForm.currency}
                      onChange={(e) => setDealForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="ILS">ILS</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={dealForm.description}
                      onChange={(e) => setDealForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Deal details and terms..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowDealModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDealSubmit}
                    disabled={savingDeal || !dealForm.amount}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {savingDeal && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{savingDeal ? 'Creating Deal...' : 'Create Deal'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[55] transition-opacity duration-300"
            onClick={handleMeetingModalClose}
          />

          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] transition-all duration-300 scale-100 opacity-100">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className={`${meetingModalHeaderClass} text-white px-6 py-4 flex justify-between items-center`}>
                <div>
                  <h2 className="text-xl font-semibold">{meetingModalTitle}</h2>
                  <p className="text-white/80 text-sm">{meetingModalDescription}</p>
                </div>
                <button
                  onClick={handleMeetingModalClose}
                  className="text-white hover:text-white/80 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white rounded"
                  aria-label="Close meeting modal"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {(meetingModalMode === 'change' || meetingModalMode === 'cancel') && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t('Select Meeting')}
                    </p>
                    {meetings.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {t('There are no meetings to manage.')}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {meetings.map((meeting) => (
                          <label
                            key={meeting.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition ${
                              selectedMeetingId === meeting.id
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="meeting-manage"
                              value={meeting.id}
                              checked={selectedMeetingId === meeting.id}
                              onChange={() => {
                                setSelectedMeetingId(meeting.id);
                                if (meetingModalMode === 'change') {
                                  prefillMeetingFormFromMeeting(meeting);
                                }
                              }}
                              className="mt-1"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {meeting.title || t('Untitled meeting')}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(meeting.date)}</p>
                              {meeting.location && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {t('Location')}: {meeting.location}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {meetingModalMode !== 'cancel' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {`${t('Meeting Title')} *`}
                      </label>
                      <input
                        type="text"
                        value={meetingFormModal.title}
                        onChange={(e) => setMeetingFormModal(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder={t('Meeting with client')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {`${t('Date & Time')} *`}
                      </label>
                      <input
                        type="datetime-local"
                        value={meetingFormModal.date || trackingMeetingDateTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMeetingFormModal(prev => ({ ...prev, date: value }));
                          if (meetingModalMode === 'create') {
                            setTrackingMeetingDateTime(value);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      {meetingModalMode === 'create' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t('Use the Tracking Date picker above to choose the meeting time.')}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Duration (minutes)')}
                      </label>
                      <select
                        value={meetingFormModal.duration}
                        onChange={(e) => setMeetingFormModal(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="30">{t('30 minutes')}</option>
                        <option value="60">{t('60 minutes')}</option>
                        <option value="90">{t('90 minutes')}</option>
                        <option value="120">{t('120 minutes')}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Location')}
                      </label>
                      <input
                        type="text"
                        value={meetingFormModal.location}
                        onChange={(e) => setMeetingFormModal(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder={t('Meeting location or online link')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Notes')}
                      </label>
                      <textarea
                        value={meetingFormModal.notes}
                        onChange={(e) => setMeetingFormModal(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows={3}
                        placeholder={t('Meeting agenda and notes...')}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleMeetingModalClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('Close')}
                  </button>
                  <button
                    onClick={handleMeetingModalConfirm}
                    disabled={meetingModalActionDisabled}
                    className={`${meetingModalButtonClass} text-white px-6 py-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2`}
                  >
                    {savingMeeting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{meetingModalButtonLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Transfer Modal */}
      {showTransferModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
            onClick={() => setShowTransferModal(false)}
          />

          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] transition-all duration-300 scale-100 opacity-100">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="bg-orange-600 text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Confirm Transfer</h2>
                  <p className="text-orange-100 text-sm">Transfer lead to another user</p>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-white hover:text-orange-200 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-white rounded"
                  aria-label="Close transfer modal"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Lead: {lead?.full_name}</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Current Owner:</strong> {lead?.owner?.name || 'Unassigned'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Transfer To:</strong> {selectedTransferUser?.name}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Notes (Optional)
                  </label>
                  <textarea
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Add any notes about why this lead is being transferred..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferLead}
                    disabled={transferring}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {transferring && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{transferring ? 'Transferring...' : 'Confirm Transfer'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
  <div className="mobile-safe-area w-full flex flex-col gap-4 py-4 pl-[20px]">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Lead workspace</p>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{lead.full_name}</h1>
        <p className="text-sm text-slate-500">
          Owner: {lead.owner?.name || 'Unassigned'} | Status: {lead.status || 'new'}
        </p>
      </div>
      <Link href="/leads" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
        Back to leads
      </Link>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-2 text-sm font-semibold ${
          activityState.needsAttention
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
        title={activityState.tooltip}
      >
        <ActivityIcon className="h-5 w-5" />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last CRM update
          </span>
          <span>{activityState.label}</span>
        </div>
      </div>

      {activityState.needsAttention && (
        <span className="text-xs font-semibold text-red-600">
          Needs attention (4h+ without changes)
        </span>
      )}
    </div>

    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 text-sm">
      <button
        onClick={handleSMSClick}
        disabled={!lead?.phone}
        className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
      >
        📱 SMS
      </button>

      <button
        onClick={handleCallClick}
        disabled={!lead?.phone}
        className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
      >
        📞 Call
      </button>

      <button
        onClick={handleWhatsAppClick}
        disabled={!lead?.phone}
        className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
      >
        WA Web
      </button>

      <button
        onClick={handleWhatsAppClick}
        disabled={!lead?.phone}
        className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
      >
        WA API
      </button>

      <button
        onClick={handleOpenEmailCard}
        disabled={!lead?.email}
        className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
      >
        Send Email
      </button>
    </div>

  </div>
</header>

      <div className="mobile-safe-area w-full flex  flex-col gap-6 py-6 lg:flex-row">
              
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Lead signal sidebar */}
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-64">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 text-sm lg:flex lg:flex-col lg:overflow-visible lg:pb-0">
               <button
              onClick={handleCallClick}
              disabled={!lead?.phone}
              className="snap-start rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
            >
              📞 Call
            </button>
              {leadSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="snap-start rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {signal.icon}
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {signal.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{signal.value}</p>
                </div>
              ))}
              
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-6">
            {/* Status board */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">📅</span>
                    <span className="text-sm font-medium text-gray-700">
                      Tracking Date
                    </span>
                    <input
                      type="datetime-local"
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      value={trackingMeetingDateTime}
                      onChange={(e) => handleTrackingDateChange(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    🕒 {trackingMeetingDateTime
                      ? new Date(trackingMeetingDateTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : t('Select meeting time')}
                  </div>
                </div>
                <div className="text-sm text-gray-600">General / No response</div>
              </div>

          <LeadStatusBoard
            lead={{
              id: lead.id,
              full_name: lead.full_name || '',
              phone: lead.phone || '',
              email: lead.email || '',
              substatus: lead.substatus || undefined,
              status: (lead.status as LeadStatus) || 'new',
              created_at: lead.created_at,
              owner: lead.owner ? {
                id: lead.owner.id,
                name: lead.owner.name,
              } : undefined,
              campaign: lead.campaign ? {
                id: lead.campaign.id,
                name: lead.campaign.name,
              } : undefined,
            }}
            formData={formData}
            setFormData={setFormData}
            editableField={editableField}
            setEditableField={setEditableField}
            handleFormChange={handleFormChange}
            handleSaveLead={handleSaveLead}
            router={router}
            handleLogout={handleLogout}
            onMove={handleMove}
            onSaveDeal={handleSaveDeal}
            onMeetingDateSelect={handleMeetingDateSelect}
            user={user}
          />


            </div>

            {/* Notes / Tabs + content */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              {/* Comment box */}
              <div className="mb-6">

    <div className="
  grid 
  grid-cols-1 
  gap-5
  md:grid-cols-[repeat(5,minmax(230px,1fr))]
  items-start
">


      {/* Notes Box (Left side) */}
      <div className="col-span-4 bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Update notes from the conversation
        </label>

        <textarea
          placeholder="Add a comment or note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
          rows={5}
          disabled={savingNote}
        />

        <div className="flex justify-end mt-4">
          <button
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {savingNote ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Transfer Sidebar (Right side) */}
      {(user?.role === 'admin' ||
        user?.role === 'manager' ||
        user?.role === 'sales' ||
        user?.role === 'marketing') && (
        <aside className="w-full bg-white border border-gray-200 rounded-lg shadow-sm h-auto sticky top-24 p-3">
          <h3 className="text-gray-800 font-semibold text-sm mb-3">
            Transfer Lead
          </h3>
          <TransferSidebar
            onUserSelect={handleTransferUserSelect}
            currentUserId={user.id}
            currentLeadId={parseInt(leadId)}
          />
        </aside>
      )}

    </div>
    </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {/* TASKS TAB */}
                {activeTab === 'tasks' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Tasks</h3>

                    {/* Create Task Form */}
                    <div className="mb-6 p-4 border border-gray-300 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Create New Task</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={taskForm.title}
                            onChange={(e) =>
                              setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Task title"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={taskForm.description}
                            onChange={(e) =>
                              setTaskForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Task description..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                          </label>
                          <input
                            type="datetime-local"
                            value={taskForm.due_date}
                            onChange={(e) =>
                              setTaskForm((prev) => ({
                                ...prev,
                                due_date: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) =>
                              setTaskForm((prev) => ({
                                ...prev,
                                priority: e.target.value as any,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleCreateTask}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Create Task
                        </button>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-3">
                      {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📋</div>
                          <p>No tasks yet</p>
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    task.priority === 'urgent'
                                      ? 'bg-red-100 text-red-800'
                                      : task.priority === 'high'
                                      ? 'bg-orange-100 text-orange-800'
                                      : task.priority === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    task.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : task.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : task.status === 'overdue'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {task.status ? task.status.replace('_', ' ') : 'pending'}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-500 mt-3">
                              {task.due_date && (
                                <div>Due: {formatDate(task.due_date)}</div>
                              )}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() =>
                                    handleUpdateTaskStatus(
                                      task.id,
                                      task.status === 'completed'
                                        ? 'pending'
                                        : 'completed',
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  {task.status === 'completed'
                                    ? 'Mark Pending'
                                    : 'Mark Complete'}
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* FILES TAB */}
                {activeTab === 'files' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Files</h3>

                    <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <input
                          type="file"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="text-4xl mb-2">📁</div>
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedFile
                              ? selectedFile.name
                              : 'Choose a file or drag and drop here'}
                          </p>
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                            Select File
                          </button>
                        </label>
                      </div>
                      {selectedFile && (
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={handleFileUpload}
                            disabled={uploadingFile}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
                          >
                            {uploadingFile ? 'Uploading...' : 'Upload File'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {files.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📁</div>
                          <p>No files uploaded yet</p>
                        </div>
                      ) : (
                        files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">📄</div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {file.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {file.size} • Uploaded by {file.uploaded_by} •{' '}
                                  {formatDate(file.uploaded_at)}
                                </div>
                              </div>
                            </div>
                            <a
                              href={file.url}
                              download
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Change History & Comments
                    </h3>

                    <div className="space-y-4">
                      {notes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📝</div>
                          <p>No notes yet</p>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <div
                            key={note.id}
                            className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-4 py-3 rounded-r-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">
                                {note.user.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {note.note}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PRICE OFFERS TAB */}
                {activeTab === 'priceOffers' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Price Offers & Deals
                    </h3>

                    <div className="mb-6 p-4 border border-gray-300 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Create New Price Offer
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={priceOfferForm.title}
                            onChange={(e) =>
                              setPriceOfferForm((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Offer title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount *
                          </label>
                          <input
                            type="number"
                            value={priceOfferForm.amount}
                            onChange={(e) =>
                              setPriceOfferForm((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency
                          </label>
                          <select
                            value={priceOfferForm.currency}
                            onChange={(e) =>
                              setPriceOfferForm((prev) => ({
                                ...prev,
                                currency: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="USD">USD</option>
                            <option value="ILS">ILS</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            value={priceOfferForm.valid_until}
                            onChange={(e) =>
                              setPriceOfferForm((prev) => ({
                                ...prev,
                                valid_until: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={priceOfferForm.description}
                            onChange={(e) =>
                              setPriceOfferForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}

                            placeholder="Offer details and terms..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleCreatePriceOffer}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Create Offer
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Closed Deals Section */}
                      {deals.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
                            <span className="mr-2">✅</span> Closed Deals
                          </h4>
                          {deals.map((deal) => (
                            <div
                              key={`deal-${deal.id}`}
                              className="p-4 border-2 border-green-200 bg-green-50 rounded-lg mb-3"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    Closed Deal - {lead?.full_name}
                                  </h4>
                                  <p className="text-sm text-green-700 font-medium">
                                    Status: Won
                                  </p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                                  CLOSED WON
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold text-xl text-green-700">
                                    {formatCurrency(deal.amount, deal.currency)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Deal ID: #{deal.id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Price Offers Section */}
                      {priceOffers.length > 0 && (
                        <div>
                          <h4 className="text-md font-semibold text-yellow-700 mb-3 flex items-center">
                            <span className="mr-2">📋</span> Price Offers
                          </h4>
                          {priceOffers.map((offer) => (
                            <div
                              key={`offer-${offer.id}`}
                              className="p-4 border border-gray-200 rounded-lg mb-3"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {offer.title}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {offer.description}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    offer.status === 'accepted'
                                      ? 'bg-green-100 text-green-800'
                                      : offer.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : offer.status === 'expired'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {offer.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold text-lg text-gray-900">
                                    {formatCurrency(offer.amount, offer.currency)}
                                  </span>
                                  {offer.valid_until && (
                                    <span>
                                      {' '}
                                      • Valid until {formatDate(offer.valid_until)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Created by {offer.created_by} •{' '}
                                  {formatDate(offer.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {priceOffers.length === 0 && deals.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">💰</div>
                          <p>No price offers or deals yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MEETINGS TAB */}
                {activeTab === 'meetings' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Meetings</h3>

                    <div className="mb-6 p-4 border border-gray-300 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Schedule New Meeting
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={meetingForm.title}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Meeting title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date & Time *
                          </label>
                          <input
                            type="datetime-local"
                            value={meetingForm.date}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                date: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (minutes)
                          </label>
                          <select
                            value={meetingForm.duration}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                duration: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={meetingForm.location}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                location: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Meeting location"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Participants
                          </label>
                          <input
                            type="text"
                            value={meetingForm.participants}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                participants: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Participants names"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={meetingForm.notes}
                            onChange={(e) =>
                              setMeetingForm((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Meeting agenda and notes..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleScheduleMeeting}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Schedule Meeting
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {meetings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">📅</div>
                          <p>No meetings scheduled</p>
                        </div>
                      ) : (
                        meetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {meeting.title}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {meeting.notes}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  meeting.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : meeting.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {meeting.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-600">
                              <div>
                                <span>{formatDate(meeting.date)}</span>
                                <span> • {meeting.duration} minutes</span>
                                <span> • {meeting.location}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Created by {meeting.created_by} •{' '}
                                {formatDate(meeting.created_at)}
                              </div>
                            </div>
                            {meeting.participants && (
                              <div className="mt-2 text-xs text-gray-500">
                                Participants: {meeting.participants}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* EMAILS TAB */}
                {activeTab === 'emails' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Emails</h3>

                    <div className="mb-6 p-4 border border-gray-300 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Send Email to {lead.email}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject *
                          </label>
                          <input
                            type="text"
                            value={emailForm.subject}
                            onChange={(e) =>
                              setEmailForm((prev) => ({
                                ...prev,
                                subject: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Email subject"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Body *
                          </label>
                          <textarea
                            value={emailForm.body}
                            onChange={(e) =>
                              setEmailForm((prev) => ({
                                ...prev,
                                body: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={6}
                            placeholder="Type your email message here..."
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleSendEmail}
                          disabled={sendingEmail}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                        >
                          {sendingEmail ? 'Sending...' : 'Send Email'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {emails.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">✉️</div>
                          <p>No emails sent yet</p>
                        </div>
                      ) : (
                        emails.map((email) => (
                          <div
                            key={email.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {email.subject}
                                </h4>
                                <p className="text-sm text-gray-600">To: {email.to}</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  email.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : email.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {email.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {email.body}
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                              Sent by {email.created_by} • {formatDate(email.sent_at)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* SMS TAB */}
                {activeTab === 'sms' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      SMS Messages
                    </h3>

                    <div className="mb-6 p-4 border border-gray-300 rounded-lg" data-sms-form>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Send SMS to {lead.phone}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message *
                          </label>
                          <textarea
                            value={smsForm.message}
                            onChange={(e) =>
                              setSmsForm((prev) => ({
                                ...prev,
                                message: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                            placeholder="Type your SMS message here..."
                            maxLength={160}
                          />
                          <div className="text-xs text-gray-500 text-right mt-1">
                            {smsForm.message.length}/160 characters
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleSendSMS}
                          disabled={sendingSMS}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
                        >
                          {sendingSMS ? 'Sending...' : 'Send SMS'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {smsMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">💬</div>
                          <p>No SMS messages sent yet</p>
                        </div>
                      ) : (
                        smsMessages.map((sms) => (
                          <div
                            key={sms.id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm text-gray-600">To: {sms.to}</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  sms.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {sms.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {sms.message}
                            </p>
                            <div className="mt-2 text-xs text-gray-500">
                              Sent by {sms.created_by} • {formatDate(sms.sent_at)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4 border-blue-500">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 bg-blue-500 text-white px-3 py-2 rounded">
                Change history
              </h2>
              <div className="space-y-4">
                {/* Lead Creation */}
                <div className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-blue-600 text-lg">🎯</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {user?.name || 'Manager'}
                      </span>
                      <p className="text-sm text-gray-500">
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Lead was created from {lead.source || 'N/A'} source
                    </p>
                  </div>
                </div>

                {/* Status-related notes */}
                {notes
                  .filter((note) => {
                    const text = note.note.toLowerCase();
                    return (
                      text.includes('status') ||
                      text.includes('moved') ||
                      text.includes('updated')
                    );
                  })
                  .map((note) => (
                    <div
                      key={`status-${note.id}`}
                      className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-blue-600 text-lg">📝</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {note.user.name}
                          </span>
                          <p className="text-sm text-gray-500">
                            {formatDate(note.created_at)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{note.note}</p>
                      </div>
                    </div>
                  ))}

                {/* Tasks in history */}
                {tasks.map((task) => {
                   const contentLines = task.content?.split('\n') || [];
                   const title = contentLines[0] || 'New Task';
                   const isCompleted = task.completed || !!task.done_at;

                  return (
                    <div
                      key={`task-${task.id}`}
                      className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-blue-600 text-lg">📋</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {task.user?.name || 'Manager'}
                          </span>
                          <p className="text-sm text-gray-500">
                            {formatDate(task.created_at)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Task: {title} - Status: {isCompleted ? 'completed' : 'pending'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Emails in history */}
                {emails.map((email) => (
                  <div
                    key={`email-${email.id}`}
                    className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-lg">✉️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {email.created_by}
                        </span>
                        <p className="text-sm text-gray-500">
                          {formatDate(email.sent_at)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Email sent: {email.subject}
                      </p>
                    </div>
                  </div>
                ))}

                {/* SMS in history */}
                {smsMessages.map((sms) => (
                  <div
                    key={`sms-${sms.id}`}
                    className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-lg">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {sms.created_by}
                        </span>
                        <p className="text-sm text-gray-500">
                          {formatDate(sms.sent_at)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">SMS sent</p>
                    </div>
                  </div>
                ))}

                {/* Meetings in history */}
                {meetings.map((meeting) => (
                  <div
                    key={`meeting-${meeting.id}`}
                    className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-lg">📅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {meeting.created_by}
                        </span>
                        <p className="text-sm text-gray-500">
                          {formatDate(meeting.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Meeting scheduled: {meeting.title}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Files in history */}
                {files.map((file) => (
                  <div
                    key={`file-${file.id}`}
                    className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-600 text-lg">📎</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {file.uploaded_by}
                        </span>
                        <p className="text-sm text-gray-500">
                          {formatDate(file.uploaded_at)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        File uploaded: {file.name}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Non-status notes */}
                {notes
                  .filter((note) => {
                    const text = note.note.toLowerCase();
                    return (
                      !text.includes('status') &&
                      !text.includes('moved') &&
                      !text.includes('updated')
                    );
                  })
                  .map((note) => (
                    <div
                      key={`note-${note.id}`}
                      className="flex items-start space-x-4 border-l-2 border-blue-200 pl-4 shadow-sm"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-blue-600 text-lg">📝</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {note.user.name}
                          </span>
                          <p className="text-sm text-gray-500">
                            {formatDate(note.created_at)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{note.note}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {twilioSettingsModalOpen && (
        <TwilioSettingsModal
          isOpen={twilioSettingsModalOpen}
          onClose={handleTwilioModalClose}
          onSubmit={handleTwilioSettingsSubmit}
          saving={twilioSettingsSaving}
          error={twilioSettingsError}
          initialValues={
            twilioSettings
              ? {
                  accountSid: twilioSettings.account_sid,
                  authToken: twilioSettings.auth_token,
                  phoneNumber: twilioSettings.phone_number,
                }
              : undefined
          }
        />
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={taskModalOpen}
        onClose={handleTaskModalClose}
        onUpdateStatus={handleTaskStatusUpdate}
        onDelete={handleTaskDelete}
      />

 
    </div>
  );

}