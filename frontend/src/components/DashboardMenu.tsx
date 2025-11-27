'use client';

import Link from 'next/link';
import {
  Users,
  UserPlus,
  Briefcase,
  FolderKanban,
  Megaphone,
  Layers,
  MonitorDot,
  GaugeCircle,
  LineChart,
  BarChartBig,
  Activity,
  CloudUpload,
  ShieldCheck,
  Workflow,
  FileSpreadsheet,
  Rocket,
  Music2,
} from 'lucide-react';
import { PermissionGuard } from './PermissionBasedPageBuilder';
import { useLanguage } from '@/i18n/LanguageProvider';

interface DashboardMenuProps {
  user: any;
}

const menuItems = [
  { href: '/register', label: 'Create Account', icon: UserPlus, badge: 'Admin', permission: 'manage_users' },
  { href: '/accounts', label: 'Manage Accounts', icon: Users, permission: 'view_leads' },
  { href: '/marketing-accounts', label: 'Marketing Accounts', icon: Megaphone, permission: 'marketing_dashboard_access' },
  { href: '/leads', label: 'All Leads', icon: FolderKanban, permission: 'view_leads' },
  { href: '/landing-pages', label: 'Landing Pages', icon: Layers, permission: 'marketing_dashboard_access' },
  { href: '/integrations', label: 'Integrations', icon: Workflow, permission: 'marketing_dashboard_access' },
  { href: '/csv-upload', label: 'Upload CSV Data', icon: CloudUpload, permission: 'manage_users' },
  { href: '/login', label: 'Login Page', icon: ShieldCheck, permission: 'manage_users' },
];

function DashboardMenu({ user }: DashboardMenuProps) {
  const { t } = useLanguage();

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{t('Navigation')}</p>
          <h2 className="text-xl font-semibold text-slate-900">{t('Quick access')}</h2>
        </div>
        <p className="text-xs text-slate-500">{t('Tap a card to jump into the right workspace.')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {menuItems.map(({ href, label, icon: Icon, badge, permission }) => (
          <PermissionGuard key={href} permission={permission} user={user} fallback={null}>
            <Link
              href={href}
              className="group relative rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
            >
              {badge && (
                <span className="absolute right-4 top-4 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">
                  {t(badge)}
                </span>
              )}

              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t(label)}</p>
                  <p className="text-xs text-slate-500">{t('Optimized for mobile + desktop')}</p>
                </div>
              </div>

              <span className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600">
                {t('Open')}
                <svg
                  className="ml-1 h-3 w-3 transition group-hover:translate-x-1"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </PermissionGuard>
        ))}
      </div>
    </section>
  );
}

export default DashboardMenu;
