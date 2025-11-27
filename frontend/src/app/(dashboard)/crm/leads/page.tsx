'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LeadsTable from '@/components/crm/LeadsTable';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';

export default function CrmLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = window.localStorage.getItem('token');
    const storedUser = window.localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      router.push('/login');
    } finally {
      setInitializing(false);
    }
  }, [router]);

  if (initializing || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-lg">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-slate-500">Leads</p>
          <h1 className="text-3xl font-semibold text-slate-900">Unified pipeline</h1>
          <p className="text-sm text-slate-500">
            Monitor every lead generated across Meta, TikTok, Google, and manual sources in one responsive view.
          </p>
        </div>
      </div>

      <PermissionGuard
        roles={['super_admin', 'admin', 'manager', 'sales', 'marketing']}
        user={user}
        fallback={
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
            You do not have permission to view this module.
          </div>
        }
      >
        <LeadsTable />
      </PermissionGuard>
    </div>
  );
}

