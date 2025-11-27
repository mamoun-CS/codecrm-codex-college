'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/crm/Dashboard';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';

export default function UnifiedDashboardPage() {
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
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <PermissionGuard
        roles={['super_admin', 'admin', 'manager']}
        user={user}
        fallback={
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
            You do not have permission to view the unified dashboard.
          </div>
        }
      >
        <Dashboard />
      </PermissionGuard>
    </div>
  );
}

