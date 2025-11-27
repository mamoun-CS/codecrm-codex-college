'use client';

import { useEffect, useState } from 'react';
import { LeadStatus } from '@/lib/models';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';
import { useLanguage } from '@/i18n/LanguageProvider';
import toast from 'react-hot-toast';
import { useUi } from '@/store/uiStore';

// نفس LeadLite المستخدم بصفحتك (نسخة أخف)
export interface LeadLite {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  status?: LeadStatus;
  substatus?: string;
  created_at: string;
  updated_at?: string;
  owner?: {
    id: number;
    name: string;
  };
  campaign?: {
    id: number;
    name: string;
  };
}

type SubStatusOption = {
  value: string;
  label: string;
};

type StatusMeta = {
  title: string;
  color: string;
  subStatuses: SubStatusOption[];
};

// STATUS_META كما هو في كودك
export const STATUS_META: Record<string, StatusMeta> = {
  deal: {
    title: 'Deal',
    color: '#28A745',
    subStatuses: [
      { value: 'صفقة في 10 الشهر', label: 'Deal on the 10th of the month' },
      { value: 'صفقة مغلقة', label: 'Closed deal' },
    ],
  },
  meeting: {
    title: 'Meeting',
    color: '#F39C12',
    subStatuses: [
      { value: 'تحديد اجتماع', label: 'Schedule meeting' },
      { value: 'إلغاء اجتماع', label: 'Cancel meeting' },
      { value: 'تغيير وقت الاجتماع', label: 'Reschedule meeting' },
    ],
  },
  not_applicable: {
    title: 'Not Applicable',
    color: '#E74C3C',
    subStatuses: [
      { value: 'السعر عالي', label: 'Price too high' },
      { value: 'المكان الجغرافي', label: 'Wrong location' },
      { value: 'مش جاهز', label: 'Not ready' },
      { value: 'بدو تعليم وجاهي', label: 'Prefers in-person learning' },
      { value: 'فش وقت', label: 'No time' },
      { value: 'رقم غلط', label: 'Wrong number' },
      { value: 'لم يتم الرد لأكثر من يومين', label: 'No response for two days' },
      { value: 'مش جدي', label: 'Not serious' },
      { value: 'ممحي', label: 'Removed' },
    ],
  },
  in_treatment: {
    title: 'In Treatment',
    color: '#3498DB',
    subStatuses: [
      { value: 'جديد', label: 'New lead' },
      { value: 'لم يتم الرد', label: 'No answer yet' },
      { value: 'الرجوع في ساعة أخرى', label: 'Call back later' },
      { value: 'Follow up', label: 'Follow up' },
      { value: 'إرسال ملفات', label: 'Send files' },
      { value: 'تواصل مجدد', label: 'Re-engage' },
    ],
  },
};

const SOURCE_OPTIONS = [
  { value: '', label: 'Select Source' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting_scheduled: 'Meeting scheduled',
  proposal_sent: 'Proposal sent',
  closed_won: 'Closed won',
  closed_lost: 'Closed lost',
};

interface LeadStatusBoardProps {
   lead: LeadLite;
   formData: any;
  setFormData: any;
  editableField: string | null;
  setEditableField: (v: string | null) => void;
  handleFormChange: (field: string, value: any) => void;
  handleSaveLead: () => void;
   router: any;
   handleLogout: () => void;
   user: any;

   onMove?: (
     leadId: number,
   to: { status: LeadStatus; substatus?: string | null }
  ) => Promise<void>;

  onSaveDeal?: (leadId: number, amount: number) => Promise<void>;
  onMeetingDateSelect?: (date: string) => void;
  onMeetingDetailsSelect?: (details: {
    title: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    notes: string;
  }) => void;
}


export function LeadStatusBoard({
   lead: initialLead,
   formData,
   setFormData,
   editableField,
   setEditableField,
   handleFormChange,
   handleSaveLead,
   router,
   handleLogout,
  user,
  onMove,
  onSaveDeal,
  onMeetingDateSelect,
  onMeetingDetailsSelect,
 }: LeadStatusBoardProps) {
  const { t, dir } = useLanguage();
  const ui = useUi();
  const [lead, setLead] = useState<LeadLite>(initialLead);
  const [dealPrompt, setDealPrompt] = useState<{
    open: boolean;
    status: LeadStatus | null;
    subStatus: string | null;
  }>({ open: false, status: null, subStatus: null });
  const [dealAmount, setDealAmount] = useState('');
  const [meetingActive, setMeetingActive] = useState(
    initialLead?.status === 'meeting_scheduled'
  );
  const [meetingDate, setMeetingDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [meetingTimeLabel, setMeetingTimeLabel] = useState(
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: 'numeric', second: 'numeric' })
  );
  const [meetingPrompt, setMeetingPrompt] = useState<{
    open: boolean;
    status: LeadStatus | null;
    subStatus: string | null;
  }>({ open: false, status: null, subStatus: null });
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    duration: '30',
    location: '',
    notes: '',
  });

  const updateMeetingTime = () => {
    setMeetingTimeLabel(
      new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
    );
  };

  const openMeetingPrompt = (status: LeadStatus, subStatus: string) => {
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];
    const defaultTime = now.toTimeString().slice(0, 5);

    setMeetingDetails({
      title: initialLead.full_name ? `${t('Meeting with')} ${initialLead.full_name}` : '',
      date: defaultDate,
      time: defaultTime,
      duration: '30',
      location: '',
      notes: '',
    });
    setMeetingPrompt({ open: true, status, subStatus });
  };

  useEffect(() => {
    setLead(initialLead);
    const isMeeting = initialLead.status === 'meeting_scheduled';
    setMeetingActive(isMeeting);
    if (isMeeting) {
      const today = new Date().toISOString().split('T')[0];
      setMeetingDate(today);
      updateMeetingTime();
      onMeetingDateSelect?.(today);
    }
  }, [initialLead.id, initialLead.status, onMeetingDateSelect]);

  const finalizeStatusChange = async (
    statusKey: string,
    newStatus: LeadStatus,
    subStatus: string
  ) => {
    if (!lead) return;
    const previousLead = lead;
    const previousMeetingActive = meetingActive;
    const previousMeetingDate = meetingDate;

    setLead((prev) => (prev ? { ...prev, status: newStatus, substatus: subStatus } : prev));

    const isMeetingStatus = statusKey === 'meeting';
    let appliedMeetingDate = meetingDate;

    if (isMeetingStatus) {
      appliedMeetingDate = new Date().toISOString().split('T')[0];
      setMeetingActive(true);
      setMeetingDate(appliedMeetingDate);
      updateMeetingTime();
    } else {
      setMeetingActive(false);
    }

    try {
      await onMove?.(lead.id, { status: newStatus, substatus: subStatus });
      if (isMeetingStatus) {
        onMeetingDateSelect?.(appliedMeetingDate);
      }
    } catch (error) {
      if (previousLead) {
        setLead(previousLead);
      }
      setMeetingActive(previousMeetingActive);
      setMeetingDate(previousMeetingDate);
      throw error;
    }
  };

  // عند الضغط على SubStatus
 const handleChipClick = async (statusKey: string, subStatus: string) => {
  console.log('🟡 Chip clicked:', { statusKey, subStatus, leadId: lead.id });
  
  try {
    const statusKeyToLeadStatus: Record<string, LeadStatus> = {
      deal: 'closed_won',
      meeting: 'meeting_scheduled', 
      not_applicable: 'closed_lost',
      in_treatment: 'new'
    };

    const newStatus: LeadStatus = statusKeyToLeadStatus[statusKey];
    console.log('🟡 New status to set:', newStatus);

    if (statusKey === 'deal' && onSaveDeal) {
      console.log('🟡 Processing deal...');
      await onMove?.(lead.id, { status: newStatus, substatus: subStatus });
      return;
    }

    if (statusKey === 'meeting') {
      console.log('🟡 Processing meeting...');
      await onMove?.(lead.id, { status: newStatus, substatus: subStatus });
      return;
    }

    console.log('🟡 Finalizing status change...');
    await finalizeStatusChange(statusKey, newStatus, subStatus);
    
  } catch (error: any) {
    console.error('🔴 Error in handleChipClick:', error);
    const errorMessage = error?.response?.data?.message || t('Failed to update status');
    toast.error(errorMessage);
  }
};

  const handleDealConfirm = async () => {
    if (!dealPrompt.status) return;
    const parsedAmount = parseFloat(dealAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      ui.alert({
        title: t('Validation error'),
        message: t('Please enter a valid amount'),
        variant: 'error',
      });
      return;
    }

    await onSaveDeal?.(lead.id, parsedAmount);
    await finalizeStatusChange('deal', dealPrompt.status, dealPrompt.subStatus || '');
    setDealPrompt({ open: false, status: null, subStatus: null });
    setDealAmount('');
  };

  const handleDealCancel = () => {
    setDealPrompt({ open: false, status: null, subStatus: null });
    setDealAmount('');
  };

  const handleMeetingDateChange = (value: string) => {
    setMeetingDate(value);
    updateMeetingTime();
    onMeetingDateSelect?.(value);
  };

  const handleMeetingConfirm = async () => {
    if (!meetingPrompt.status) return;
    if (!meetingDetails.date) {
      toast.error(t('Meeting date is required'));
      return;
    }
    try {
      await finalizeStatusChange('meeting', meetingPrompt.status, meetingPrompt.subStatus || '');
      onMeetingDetailsSelect?.(meetingDetails);
      setMeetingPrompt({ open: false, status: null, subStatus: null });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || t('Failed to update status');
      toast.error(errorMessage);
    }
  };

  const handleMeetingCancel = () => {
    setMeetingPrompt({ open: false, status: null, subStatus: null });
  };

  return (
   <div dir={dir} className="mt-[50px] pt-4 pr-[15px] pl-[10px]">
  <div
    className="
      grid 
      grid-cols-1 
      sm:grid-cols-2
      md:grid-cols-3
      lg:grid-cols-[repeat(5,minmax(250px,1fr))]
      gap-5
    "
  >

 {/* Right info panel */}
 
     
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div
  key={key}
  className="
    rounded-lg 
    border border-gray-200 
    bg-white 
    p-4 
    shadow-sm
    min-w-[280px]    
    gap-4
  "
>
            <div
              className="mb-4 rounded-lg py-3 text-center font-semibold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {t(meta.title)}
            </div>

            <div className="space-y-2">
              {meta.subStatuses.map((sub) => {
                const isActive = lead.substatus === sub.value;
                return (
                  <div
                    key={sub.value}
                    onClick={() => handleChipClick(key, sub.value)}
                    className={`cursor-pointer rounded px-3 py-2 text-sm transition ${
                      isActive
                        ? 'border border-blue-300 bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {t(sub.label)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div  className="
    rounded-lg 
    border border-gray-200 
    bg-white 
    p-4 
    shadow-sm
    min-h-[230px]   
    min-w-[260px] 
  ">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">
                {t('{name} – Lead status – Customer', { name: lead.full_name })}
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">{`${t('Full Name')}:`}</span>
                  <div className="flex items-center gap-2">
                    {editableField === 'full_name' ? (
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) =>
                          handleFormChange('full_name', e.target.value)
                        }
                        onBlur={() => {
                          setEditableField(null);
                          handleSaveLead();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLead()}
                        className="text-sm text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {formData.full_name || t('N/A')}
                      </span>
                    )}
                    <PermissionGuard
                      permission="edit_leads"
                      user={user}
                      fallback={
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0">✏️</span>
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditableField(
                            editableField === 'full_name' ? null : 'full_name',
                          )
                        }
                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200 flex-shrink-0"
                      >
                        ✏️
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
                <hr className="border-gray-200" />

                {/* Phone */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">{`${t('Phone')}:`}</span>
                  <div className="flex items-center gap-2">
                    {editableField === 'phone' ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        onBlur={() => {
                          setEditableField(null);
                          handleSaveLead();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLead()}
                        className="text-sm text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {formData.phone || t('N/A')}
                      </span>
                    )}
                    <PermissionGuard
                      permission="edit_leads"
                      user={user}
                      fallback={
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0">✏️</span>
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditableField(editableField === 'phone' ? null : 'phone')
                        }
                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200 flex-shrink-0"
                      >
                        ✏️
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
                <hr className="border-gray-200" />

                {/* Email */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">{`${t('Email')}:`}</span>
                  <div className="flex items-center gap-2">
                    {editableField === 'email' ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        onBlur={() => {
                          setEditableField(null);
                          handleSaveLead();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLead()}
                        className="text-sm text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {formData.email || t('N/A')}
                      </span>
                    )}
                    <PermissionGuard
                      permission="edit_leads"
                      user={user}
                      fallback={
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0">✏️</span>
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditableField(editableField === 'email' ? null : 'email')
                        }
                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200 flex-shrink-0"
                      >
                        ✏️
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
                <hr className="border-gray-200" />

                {/* City */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">{`${t('City')}:`}</span>
                  <div className="flex items-center gap-2">
                    {editableField === 'city' ? (
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                        onBlur={() => {
                          setEditableField(null);
                          handleSaveLead();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLead()}
                        className="text-sm text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-900">
                        {formData.city || t('N/A')}
                      </span>
                    )}
                    <PermissionGuard
                      permission="edit_leads"
                      user={user}
                      fallback={
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0">✏️</span>
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditableField(editableField === 'city' ? null : 'city')
                        }
                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200 flex-shrink-0"
                      >
                        ✏️
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
                <hr className="border-gray-200" />

                {/* Source / Reason - Editable */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">{`${t('Reason')}:`}</span>
                  <div className="flex items-center gap-2">
                    {editableField === 'source' ? (
                      <select
                        value={formData.source || ''}
                        onChange={(e) => handleFormChange('source', e.target.value)}
                        onBlur={() => {
                          setEditableField(null);
                          handleSaveLead();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditableField(null);
                            handleSaveLead();
                          } else if (e.key === 'Escape') {
                            setEditableField(null);
                          }
                        }}
                        className="text-sm text-gray-900 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {SOURCE_OPTIONS.map(option => (
                          <option key={option.value || 'default'} value={option.value}>
                            {t(option.label)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900">
                        {formData.source
                          ? t(
                              SOURCE_OPTIONS.find(
                                option => option.value && option.value === formData.source
                              )?.label || formData.source
                            )
                          : t('N/A')}
                      </span>
                    )}
                    <PermissionGuard
                      permission="edit_leads"
                      user={user}
                      fallback={
                        <span className="text-gray-300 cursor-not-allowed flex-shrink-0">✏️</span>
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setEditableField(
                            editableField === 'source' ? null : 'source',
                          )
                        }
                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200 flex-shrink-0"
                        title={t('Edit reason')}
                      >
                        ✏️
                      </button>
                    </PermissionGuard>
                  </div>
                </div>

                {/* Extra info: campaign, status */}
                <hr className="border-gray-200" />
                <div className="space-y-2 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{`${t('Status')}:`}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {lead.status ? t(STATUS_LABELS[lead.status] || lead.status) : t('N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{`${t('Campaign')}:`}</span>
                    <span className="text-gray-900">
                      {lead.campaign?.name || t('N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{`${t('Owner')}:`}</span>
                    <span className="text-gray-900">
                      {lead.owner?.name || t('N/A')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => router.push('/leads')}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← {t('Back to Leads')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    {t('Logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
      {meetingActive && (
        <div className="col-span-2 mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">{t('Meeting Schedule')}</p>
          <div className="flex flex-col gap-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">📅</span>
              <span className="text-sm font-medium text-gray-700">{t('Tracking Date')}</span>
              <input
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                type="date"
                value={meetingDate}
                onChange={(e) => handleMeetingDateChange(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">🕒 {meetingTimeLabel}</div>
          </div>
        </div>
      )}
      {meetingPrompt.open && (
        <div className="col-span-2  fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">{t('Schedule meeting')}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {t('Capture the meeting details before moving the lead to the meeting status.')}
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('Meeting title')}
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={meetingDetails.title}
                  onChange={(e) =>
                    setMeetingDetails((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Date')}
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={meetingDetails.date}
                    onChange={(e) =>
                      setMeetingDetails((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Time')}
                  </label>
                  <input
                    type="time"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={meetingDetails.time}
                    onChange={(e) =>
                      setMeetingDetails((prev) => ({ ...prev, time: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Duration (minutes)')}
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={meetingDetails.duration}
                    onChange={(e) =>
                      setMeetingDetails((prev) => ({ ...prev, duration: e.target.value }))
                    }
                  >
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                    <option value="60">60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Location')}
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={meetingDetails.location}
                    onChange={(e) =>
                      setMeetingDetails((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('Notes')}</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  value={meetingDetails.notes}
                  onChange={(e) =>
                    setMeetingDetails((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleMeetingCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleMeetingConfirm}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t('Confirm meeting')}
              </button>
            </div>
          </div>
        </div>
      )}
      {dealPrompt.open && (
        <div className="col-span-2  fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">{t('Enter deal amount')}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {t('Capture the final price for this deal before closing it.')}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">{t('Amount')}</label>
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleDealCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleDealConfirm}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                {t('Save Deal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadStatusBoard;
