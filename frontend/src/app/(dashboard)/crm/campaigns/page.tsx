'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CampaignsManager from '@/components/crm/CampaignsManager';
import { PermissionGuard } from '@/components/PermissionBasedPageBuilder';

export default function CrmCampaignsPage() {
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
        Loading campaigns...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg">
        <p className="text-xs uppercase tracking-wider text-slate-500">Campaigns</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Performance planner</h1>
        <p className="text-sm text-slate-500">
          Track budget, spend, and ROI for every campaign synced from integrated platforms.
        </p>
      </div>

      <PermissionGuard
        roles={['super_admin', 'admin', 'manager', 'marketing']}
        user={user}
        fallback={
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
            You do not have permission to manage campaigns.
          </div>
        }
      >
        <CampaignsManager />
      </PermissionGuard>
    </div>
  );
}

