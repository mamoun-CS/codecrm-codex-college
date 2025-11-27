'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { analyticsAPI } from '@/lib/api';
import DashboardMenu from '@/components/DashboardMenu';
import { useLanguage } from '@/i18n/LanguageProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
  referral: 'Referral',
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  landing_page: 'Landing page',
};

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [costPerLead, setCostPerLead] = useState<any[]>([]);
  const [leadsTrend, setLeadsTrend] = useState<any[]>([]);
  const [pipelineConversion, setPipelineConversion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    sales: 'Sales',
    marketing: 'Marketing',
    viewer: 'Viewer',
  };

  const loadDashboardData = async () => {
    try {
      const [overviewRes, sourceRes, costRes, trendRes, pipelineRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getLeadsBySource(),
        analyticsAPI.getCostPerLead(),
        analyticsAPI.getLeadsTrend(30),
        analyticsAPI.getPipelineConversion(),
      ]);

      setOverview(overviewRes.data);
      setLeadsBySource(sourceRes.data);
      setCostPerLead(costRes.data);
      setLeadsTrend(trendRes.data);
      setPipelineConversion(pipelineRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    // Redirect to role-specific dashboard
    router.push(`/dashboard/${parsedUser.role}`);
  }, [router]);

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return <div className="flex min-h-screen items-center justify-center">{t('Loading...')}</div>;
  }

  if (!user || loading) {
    return <div className="flex min-h-screen items-center justify-center">{t('Loading...')}</div>;
  }

  // Chart data
  const sourceChartData = {
    labels: leadsBySource.map(item => t(SOURCE_LABELS[item.source] || item.source)),
    datasets: [{
      data: leadsBySource.map(item => item.count),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
      ],
    }],
  };

  const trendChartData = {
    labels: leadsTrend.map(item => item.date),
    datasets: [{
      label: t('Leads'),
      data: leadsTrend.map(item => item.count),
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      tension: 0.4,
    }],
  };

  const costChartData = {
    labels: costPerLead.map(item => item.campaign),
    datasets: [{
      label: t('Cost per Lead ($)'),
      data: costPerLead.map(item => item.costPerLead),
      backgroundColor: '#FF6384',
    }],
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('CRM Analytics Dashboard')}</h1>
            <div className="flex items-center gap-4">
              <span>
                {t('Welcome, {name} ({role})', {
                  name: user.name,
                  role: t(roleLabels[user.role] || user.role),
                })}
              </span>
              <button
                onClick={handleLogout}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <DashboardMenu user={user} />

        {/* KPI Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">L</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('Total Leads')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{overview.totalLeads}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">D</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('Total Deals')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{overview.totalDeals}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">%</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('Conversion Rate')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{overview.conversionRate}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">$</span>
                    </div>
                  </div>
                 
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads by Source */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">{t('Leads by Source')}</h3>
            {leadsBySource.length > 0 ? (
              <Doughnut data={sourceChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">{t('No data available')}</p>
            )}
          </div>

          {/* Leads Trend */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">{t('Leads Trend (30 days)')}</h3>
            {leadsTrend.length > 0 ? (
              <Line data={trendChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">{t('No data available')}</p>
            )}
          </div>
        </div>

        {/* Cost per Lead Chart */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">{t('Cost per Lead by Campaign')}</h3>
          {costPerLead.length > 0 ? (
            <Bar data={costChartData} options={{ responsive: true }} />
          ) : (
            <p className="text-gray-500">{t('No campaign data available')}</p>
          )}
        </div>

        {/* Pipeline Conversion */}
        {pipelineConversion && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">{t('Pipeline Conversion')}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {pipelineConversion.stages.map((stage: any, index: number) => (
                <div key={stage.stage} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-sm text-gray-500">{stage.stage}</div>
                  {index === 0 && (
                    <div className="mt-1 text-xs text-green-600">
                      {t('{count} won deals', { count: pipelineConversion.wonDeals })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
