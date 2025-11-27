'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { analyticsAPI, dashboardAPI } from '@/lib/api';
import { useDashboardSocket } from '@/hooks/useDashboardSocket';
import { Manager } from 'socket.io-client';
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

export default function ManagerDashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [costPerLead, setCostPerLead] = useState<any[]>([]);
  const [leadsTrend, setLeadsTrend] = useState<any[]>([]);
  const [pipelineConversion, setPipelineConversion] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();

  // Real-time updates
  const { connected: dashboardSocketConnected, lastEvent, refreshDashboardData } = useDashboardSocket();

  const loadDashboardData = async () => {
    try {
      const [
        dashboardRes,
        sourceRes,
        costRes,
        trendRes,
        pipelineRes,
        teamRes
      ] = await Promise.all([
        dashboardAPI.getManagerDashboard(user.id),
        analyticsAPI.getLeadsBySource(),
        analyticsAPI.getCostPerLead(),
        analyticsAPI.getLeadsTrend(30),
        analyticsAPI.getPipelineConversion(),
        analyticsAPI.getTeamPerformance(),
      ]);

      // Use dashboard data for transaction count, keep other analytics data
      const dashboardData = dashboardRes.data.dashboardData;
      setOverview((prevOverview: any) => ({
        ...prevOverview,
        totalTransactions: dashboardData.totalTransactions,
      }));

      setLeadsBySource(sourceRes.data);
      setCostPerLead(costRes.data);
      setLeadsTrend(trendRes.data);
      setPipelineConversion(pipelineRes.data);
      setTeamPerformance(teamRes.data);
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
    if (parsedUser.role !== 'manager') {
      router.push('/login');
      return;
    }
    setUser(parsedUser);
    loadDashboardData();
  }, [router]);

  // Auto-refresh dashboard data when real-time events occur
  useEffect(() => {
    if (lastEvent) {
      loadDashboardData();
    }
  }, [lastEvent]);

  const quickActions = useMemo(
    () => [
      {
        href: '/register',
        icon: '+',
        iconClasses: 'bg-green-100 text-green-600',
        labelKey: 'Create Account',
        descriptionKey: 'Add new user to the system',
      },
      {
        href: '/accounts',
        icon: '👥',
        iconClasses: 'bg-blue-100 text-blue-600',
        labelKey: 'Manage Accounts',
        descriptionKey: 'Control all users',
      },
      {
        href: '/marketing-accounts',
        icon: '📣',
        iconClasses: 'bg-orange-100 text-orange-600',
        labelKey: 'Marketing Accounts',
        descriptionKey: 'View & manage ad accounts',
      },
      {
        href: '/leads',
        icon: '🎯',
        iconClasses: 'bg-purple-100 text-purple-600',
        labelKey: 'All Leads',
        descriptionKey: 'View leads list',
      },
      {
        href: '/landing-pages',
        icon: '🧱',
        iconClasses: 'bg-teal-100 text-teal-600',
        labelKey: 'Landing Pages',
        descriptionKey: 'Create & manage landing pages',
      },
    ],
    [],
  );

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">{t('Loading___')}</div>;
  }

  if (!user || loading) {
    return <div className="min-h-screen flex items-center justify-center">{t('Loading___')}</div>;
  }

  // Chart data
  const sourceChartData = {
    labels: leadsBySource.map(item => item.source),
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
      label: 'Leads',
      data: leadsTrend.map(item => item.count),
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      tension: 0.4,
    }],
  };

  const costChartData = {
    labels: costPerLead.map(item => item.campaign),
    datasets: [{
      label: 'Cost per Lead ($)',
      data: costPerLead.map(item => item.costPerLead),
      backgroundColor: '#FF6384',
    }],
  };

  const teamChartData = {
    labels: teamPerformance.map(item => item.user_name),
    datasets: [{
      label: 'Leads Generated',
      data: teamPerformance.map(item => item.leads_count),
      backgroundColor: '#4BC0C0',
    }],
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img src="/favicon.ico" alt="Codex College Logo" className="h-10 w-10" />
              <h1 className="text-3xl font-bold text-gray-900">
                Codex College · {t('Manager Dashboard')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span>{t('Welcome, {name} ({role})', { name: user.name, role: t('Manager') })}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${dashboardSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {dashboardSocketConnected ? t('Live Updating') : t('Offline')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-semibold ${action.iconClasses}`}>
                  {action.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t(action.labelKey)}</p>
                  <p className="text-xs text-slate-500">{t(action.descriptionKey)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

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
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                      <dd className="text-lg font-medium text-gray-900">{overview.totalTransactions}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
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
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Cost per Lead</dt>
                      <dd className="text-lg font-medium text-gray-900">${overview.costPerLead}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads by Source */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leads by Source</h3>
            {leadsBySource.length > 0 ? (
              <Doughnut data={sourceChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Team Performance */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Performance</h3>
            {teamPerformance.length > 0 ? (
              <Bar data={teamChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No team data available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads Trend */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leads Trend (30 days)</h3>
            {leadsTrend.length > 0 ? (
              <Line data={trendChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Cost per Lead Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost per Lead by Campaign</h3>
            {costPerLead.length > 0 ? (
              <Bar data={costChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No campaign data available</p>
            )}
          </div>
        </div>

        {/* Pipeline Conversion */}
        {pipelineConversion && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pipeline Conversion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelineConversion.stages.map((stage: any, index: number) => (
                <div key={stage.stage} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-sm text-gray-500">{stage.stage}</div>
                  {index === 0 && (
                    <div className="text-xs text-green-600 mt-1">
                      {pipelineConversion.wonDeals} won deals
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
