'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, UserCheck, Shield } from 'lucide-react';
import { usersAPI } from '../lib/api';
import { useUi } from '@/store/uiStore';

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

interface TransferSidebarProps {
  onUserSelect: (user: User) => void;
  currentLeadId?: number;
  currentUserId?: number;
}

export default function TransferSidebar({ onUserSelect, currentLeadId, currentUserId }: TransferSidebarProps) {
  const ui = useUi();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTransferrableUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchTransferrableUsers = async () => {
    try {
      const response = await usersAPI.getTransferrableUsers();
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

 

  const handleUserClick = (user: User) => {
    if (user.id === currentUserId) {
      ui.alert({
        title: 'Transfer blocked',
        message: 'You cannot transfer a lead to yourself',
        variant: 'info',
        asToast: true,
      });
      return;
    }
    onUserSelect(user);
  };

  const roleOptions = useMemo(() => ['all', ...new Set(users.map((user) => user.role))], [users]);

  if (loading) {
    return (
      <aside className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-3/4 rounded-full bg-slate-200" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg sm:w-80">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Transfer</p>
          <h2 className="text-lg font-semibold text-slate-900">Select teammate</h2>
          {currentLeadId && (
            <p className="text-xs text-slate-500">Lead #{currentLeadId}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 sm:hidden"
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className={`${isOpen ? 'block' : 'hidden sm:block'}`}>
        <div className="space-y-3 border-b border-slate-100 px-4 py-3">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, email or role"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                  roleFilter === role
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-500 hover:border-blue-200'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No teammates match your filters</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => !isCurrentUser && handleUserClick(user)}
                      className={`flex w-full items-center justify-between px-4 py-4 text-left transition ${
                        isCurrentUser
                          ? 'cursor-not-allowed bg-rose-50 text-rose-700'
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {user.name} {isCurrentUser && '(You)'}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <p className="text-xs text-slate-400 capitalize">
                          <Shield className="mr-1 inline-block h-3 w-3" />
                          {user.role.replace('_', ' ')}
                        </p>
                        {user.team?.name && (
                          <p className="text-xs text-slate-500">Team {user.team.name}</p>
                        )}
                      </div>
                      <UserCheck className="h-5 w-5 text-blue-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
