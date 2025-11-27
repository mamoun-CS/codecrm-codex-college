'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
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

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  leads: Lead[];
  selectedLeads: Set<number>;
  onLeadClick: (leadId: number) => void;
  onLeadSelect: (leadId: number) => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  leads,
  selectedLeads,
  onLeadClick,
  onLeadSelect,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });
  const { t } = useLanguage();

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-100 rounded-lg p-4">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <h3 className="font-semibold text-gray-900">{t(title)}</h3>
          </div>
          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
            {leads.length}
          </span>
        </div>

        {/* Droppable Area */}
        <div
          ref={setNodeRef}
          className={`min-h-96 rounded-lg transition-colors ${
            isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-white'
          }`}
        >
          <SortableContext items={leads.map(lead => `lead-${lead.id}`)} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-3">
              {leads.map(lead => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.has(lead.id)}
                  onClick={() => onLeadClick(lead.id)}
                  onSelect={() => onLeadSelect(lead.id)}
                />
              ))}

              {leads.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                  <div className="mb-2 text-3xl">📭</div>
                  <p className="text-sm">{t('No leads in this stage')}</p>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
