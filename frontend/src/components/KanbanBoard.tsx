'use client';

import React from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';

const KanbanBoard: React.FC = () => {
  const { t, locale } = useLanguage();
  const columns = [
    {
      title: 'Deal',
      color: 'bg-green-500',
      subRows: ['Deal closed', 'High potential', 'Qualified lead'],
    },
    {
      title: 'Meeting',
      color: 'bg-yellow-500',
      subRows: ['Schedule a meeting', 'Meeting confirmed', 'Follow up needed'],
    },
    {
      title: 'Not applicable',
      color: 'bg-red-500',
      subRows: ['Not interested', 'Wrong contact', 'Duplicate'],
    },
    {
      title: 'In treatment',
      color: 'bg-blue-500',
      subRows: ['No answer', 'Call back later', 'In progress'],
    },
  ];
  const timestamp = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="bg-white p-6 shadow-sm">
      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">{timestamp}</div>
          <div className="text-sm text-gray-600">{t('Tracking date:')}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{t('General Process')}</span>
          <span className="text-sm text-gray-700">{t('No response Status')}</span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-4 gap-6">
        {columns.map((column, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${column.color}`}></div>
              <h3 className="font-semibold text-gray-800">{t(column.title)}</h3>
            </div>
            <div className="space-y-2">
              {column.subRows.map((subRow, subIndex) => (
                <div key={subIndex} className="bg-white rounded-md p-3 shadow-sm border">
                  <div className="text-sm text-gray-700">{t(subRow)}</div>
                  {/* Mock lead cards */}
                  {subIndex === 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-500">John Doe - 050-1234567</div>
                      <div className="text-xs text-gray-500">Jane Smith - 050-7654321</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
