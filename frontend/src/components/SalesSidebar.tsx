'use client';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  team_id?: number;
}

interface SalesSidebarProps {
  onSelect: (user: User) => void;
}

export default function SalesSidebar({ onSelect }: SalesSidebarProps) {
  const [sales, setSales] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/users/sales-list', {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setSales(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch sales list:', err);
        setLoading(false);
      });
  }, []);

  const filteredSales = sales.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Team</p>
          <h3 className="text-lg font-semibold text-slate-900">Sales members</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 md:hidden"
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={`mt-4 space-y-3 ${isOpen ? 'block' : 'hidden md:block'}`}>
        <input
          type="search"
          placeholder="Search teammates"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <ul className="space-y-2">
          {filteredSales.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelect(user)}
                className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </button>
            </li>
          ))}
          {!filteredSales.length && (
            <li className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              No matching team members
            </li>
          )}
        </ul>
      </div>
    </>
  );

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:w-72">
      {loading ? (
        <div className="space-y-3">
          <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
      ) : (
        content
      )}
    </aside>
  );
}
