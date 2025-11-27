'use client';

import { useState } from 'react';
import { Phone, DollarSign, TrendingUp, Calendar, Target } from 'lucide-react';

const filters = [
  { label: 'Call Status', icon: Phone, description: 'Last contact result' },
  { label: 'Price Near', icon: DollarSign, description: 'Budget alignment' },
  { label: 'Transaction Price', icon: TrendingUp, description: 'Average deal size' },
  { label: 'Meeting Pace', icon: Calendar, description: 'Upcoming events' },
  { label: 'Campaign', icon: Target, description: 'Attribution source' },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Insights</p>
          <h3 className="text-lg font-semibold text-slate-900">Advertising data</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 md:hidden"
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className={`space-y-3 px-4 pb-4 ${isOpen ? 'block' : 'hidden md:block'}`}>
        {filters.map(({ label, icon: Icon, description }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              <span className="text-xs text-slate-500">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
