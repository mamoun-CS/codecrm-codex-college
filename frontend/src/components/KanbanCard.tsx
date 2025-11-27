'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/i18n/LanguageProvider';

interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  source?: string;
  status?: string;
  created_at: string;
  owner?: {
    id: number;
    name: string;
  };
  campaign?: {
    id: number;
    name: string;
  };
}

interface KanbanCardProps {
  lead: Lead;
  isSelected: boolean;
  isDragging?: boolean;
  onClick: () => void;
  onSelect: () => void;
}

export function KanbanCard({ lead, isSelected, isDragging, onClick, onSelect }: KanbanCardProps) {
  const { t, locale } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: `lead-${lead.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(dateString)
    );

  const sourceLabels: Record<string, string> = {
    facebook: 'Facebook',
    google: 'Google',
    tiktok: 'TikTok',
    website: 'Website',
    whatsapp: 'WhatsApp',
    phone: 'Phone',
    landing_page: 'Landing page',
    email: 'Email',
    referral: 'Referral',
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'google': return 'bg-red-100 text-red-800';
      case 'tiktok': return 'bg-black text-white';
      case 'website': return 'bg-green-100 text-green-800';
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'phone': return 'bg-gray-100 text-gray-800';
      case 'landing_page': return 'bg-purple-100 text-purple-800';
      case 'email': return 'bg-orange-100 text-orange-800';
      case 'referral': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = () => {
    // Simple priority logic based on days since creation
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation > 7) return 'border-l-red-500'; // Overdue
    if (daysSinceCreation > 3) return 'border-l-yellow-500'; // Attention needed
    return 'border-l-green-500'; // New
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border-l-4 ${getPriorityColor()} rounded-lg shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging || sortableIsDragging ? 'opacity-50 rotate-2' : ''}`}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          onSelect();
        } else {
          onClick();
        }
      }}
      {...attributes}
      {...listeners}
    >
      {/* Selection Checkbox */}
      <div className="flex items-start justify-between mb-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="mt-1"
        />
        <span className="text-xs text-gray-500">{formatDate(lead.created_at)}</span>
      </div>

      {/* Lead Name */}
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {lead.full_name}
      </h4>

      {/* Contact Info */}
      <div className="mb-3 space-y-1">
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📞</span>
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>✉️</span>
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Source Badge */}
      {lead.source && (
        <div className="mb-2">
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getSourceColor(lead.source)}`}>
            {t(sourceLabels[lead.source] || lead.source)}
          </span>
        </div>
      )}

      {/* Campaign & Owner */}
      <div className="text-xs text-gray-500 space-y-1">
        {lead.campaign && (
          <div>🎯 {lead.campaign.name}</div>
        )}
        {lead.owner && (
          <div>👤 {lead.owner.name}</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Quick call action
            if (lead.phone) {
              window.open(`tel:${lead.phone}`);
            }
          }}
          className="flex-1 rounded bg-blue-500 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-600"
          disabled={!lead.phone}
        >
          📞 {t('Call')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Quick WhatsApp action
            if (lead.phone) {
              const cleanPhone = lead.phone.replace(/\D/g, '');
              window.open(`https://wa.me/${cleanPhone}`, '_blank');
            }
          }}
          className="flex-1 rounded bg-green-500 px-2 py-1 text-xs text-white transition-colors hover:bg-green-600"
          disabled={!lead.phone}
        >
          💬 {t('WhatsApp')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Quick email action - would open email modal
            if (lead.email) {
              window.open(`mailto:${lead.email}`);
            }
          }}
          className="flex-1 rounded bg-purple-500 px-2 py-1 text-xs text-white transition-colors hover:bg-purple-700"
          disabled={!lead.email}
        >
          ✉️ {t('Email')}
        </button>
      </div>
    </div>
  );
}
