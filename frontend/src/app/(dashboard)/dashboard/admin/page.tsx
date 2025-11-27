'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAllCampaignsUpdates } from '@/hooks/useRealtimeUpdates';
import { useDashboardSocket } from '@/hooks/useDashboardSocket';
import DashboardMenu from '@/components/DashboardMenu';
import { useLanguage } from '@/i18n/LanguageProvider';

import toast from 'react-hot-toast';

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

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [costPerLead, setCostPerLead] = useState<any[]>([]);
  const [leadsTrend, setLeadsTrend] = useState<any[]>([]);
  const [pipelineConversion, setPipelineConversion] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastLeadCount, setLastLeadCount] = useState<number>(0);
  const [staleLeadsInfo, setStaleLeadsInfo] = useState<{
    staleLeadsCount: number;
    thresholdHours: number;
    oldestLeadUpdatedAt: string | null;
  } | null>(null);
  const router = useRouter();
  const staleToastRef = useRef(false);

  // Real-time updates hook
  const { allNewLeads, connected } = useAllCampaignsUpdates();
  const { connected: dashboardSocketConnected, lastEvent, refreshDashboardData } = useDashboardSocket();

  const refreshStaleLeads = async () => {
    try {
      const response = await dashboardAPI.getStaleLeads();
      const data = response.data;
      setStaleLeadsInfo(data);

      if (data.staleLeadsCount > 0) {
        if (!staleToastRef.current) {
          staleToastRef.current = true;
          toast(
            t('⚠️ {count} lead(s) have not been updated for over {hours} hours', {
              count: data.staleLeadsCount,
              hours: data.thresholdHours,
            }),
            { duration: 5000, icon: '⚠️' },
          );
        }
      } else {
        staleToastRef.current = false;
      }
    } catch (error) {
      console.error('Error fetching stale lead stats:', error);
    }
  };

  const loadDashboardData = async (currentUser: any) => {
    if (!currentUser?.id) {
      console.warn('User not available for dashboard data loading');
      return;
    }

    try {
      const [
        dashboardRes,
        sourceRes,
        costRes,
        trendRes,
        pipelineRes,
        teamRes
      ] = await Promise.all([
        dashboardAPI.getAdminDashboard(currentUser.id),
        analyticsAPI.getLeadsBySource(),
        analyticsAPI.getCostPerLead(),
        analyticsAPI.getLeadsTrend(30),
        analyticsAPI.getPipelineConversion(),
        analyticsAPI.getTeamPerformance(),
      ]);

      // Use dashboard data for all metrics
      const dashboardData = dashboardRes.data.dashboardData;

      // Calculate cost per lead from analytics data
      const totalSpend = costRes.data.reduce((sum: number, item: any) => sum + (item.total_spend || 0), 0);
      const totalLeads = dashboardData.totalLeads || 1; // Avoid division by zero
      const calculatedCostPerLead = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0.00';

      setOverview({
        totalLeads: dashboardData.totalLeads,
        totalTransactions: dashboardData.totalTransactions,
        wonDeals: dashboardData.wonDeals,
        conversionRate: dashboardData.conversionRate,
        costPerLead: calculatedCostPerLead,
      });

      setLeadsBySource(sourceRes.data);
      setCostPerLead(costRes.data);
      setLeadsTrend(trendRes.data);
      setPipelineConversion(pipelineRes.data);
      setTeamPerformance(teamRes.data);
      await refreshStaleLeads();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when new leads arrive
  useEffect(() => {
    if (allNewLeads.length > 0 && user) {
      loadDashboardData(user);
    }
  }, [allNewLeads, user]);

  // Auto-refresh dashboard data when real-time events occur
  useEffect(() => {
    if (lastEvent && user) {
      loadDashboardData(user);
    }
  }, [lastEvent, user]);

  // Listen for dashboard refresh events
  useEffect(() => {
    const handleDashboardRefresh = (event: any) => {
      if (user) {
        loadDashboardData(user).then(() => {
        }).catch((error) => {
          console.error('🔄 [ADMIN DASHBOARD] Error reloading dashboard data:', error);
        });
      }
    };

    window.addEventListener('dashboard:refresh', handleDashboardRefresh);

    return () => {
      window.removeEventListener('dashboard:refresh', handleDashboardRefresh);
    };
  }, [user]);

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
    if (parsedUser.role !== 'admin') {
      router.push('/login');
      return;
    }
    setUser(parsedUser);
    loadDashboardData(parsedUser);

    // Set up polling for lead count changes (fallback for socket issues)
    const pollInterval = setInterval(async () => {
      try {
        const overviewRes = await analyticsAPI.getOverview();
        const currentLeadCount = overviewRes.data.totalLeads;

        if (currentLeadCount !== lastLeadCount && lastLeadCount > 0) {
          loadDashboardData(parsedUser);
          // Show notification for new leads
          if (currentLeadCount > lastLeadCount) {
            const newLeadsCount = currentLeadCount - lastLeadCount;
            toast.success(`${newLeadsCount} new lead${newLeadsCount > 1 ? 's' : ''} added!`, {
              duration: 4000,
              icon: '🎯',
            });
          }
        }

        setLastLeadCount(currentLeadCount);
      } catch (error) {
        // Silently handle polling errors
        console.error('🔄 [ADMIN DASHBOARD] Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [router]); // Removed lastLeadCount from dependencies to fix useEffect warning

  // Don't render anything on the server side to avoid hydration issues
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  // Chart data
  const sourceChartData = {
    labels: Array.isArray(leadsBySource) ? leadsBySource.map(item => item.source) : [],
    datasets: [{
      data: Array.isArray(leadsBySource) ? leadsBySource.map(item => item.count) : [],
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
      ],
    }],
  };

  const trendChartData = {
    labels: Array.isArray(leadsTrend) ? leadsTrend.map(item => item.date) : [],
    datasets: [{
      label: 'Leads',
      data: Array.isArray(leadsTrend) ? leadsTrend.map(item => item.count) : [],
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      tension: 0.4,
    }],
  };

  const costChartData = {
    labels: Array.isArray(costPerLead) ? costPerLead.map(item => item.campaign) : [],
    datasets: [{
      label: 'Cost per Lead ($)',
      data: Array.isArray(costPerLead) ? costPerLead.map(item => item.costPerLead) : [],
      backgroundColor: '#FF6384',
    }],
  };

  const teamChartData = {
    labels: Array.isArray(teamPerformance) ? teamPerformance.map(item => item.user_name) : [],
    datasets: [{
      label: 'Leads Generated',
      data: Array.isArray(teamPerformance) ? teamPerformance.map(item => item.leads_count) : [],
      backgroundColor: '#4BC0C0',
    }],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mobile-safe-area mx-auto flex max-w-7xl flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <img src="/favicon.ico" alt="Codex College Logo" className="h-10 w-10 rounded-2xl bg-blue-50 p-2" />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Admin Control</p>
              <h1 className="text-2xl font-semibold text-slate-900 lg:text-3xl">Codex College Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center">
            <span className="font-medium text-slate-900">Welcome, {user.name} (Admin)</span>
            <span className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${dashboardSocketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {dashboardSocketConnected ? 'Live socket connected' : 'Offline'}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mobile-safe-area mx-auto flex w-full max-w-7xl flex-col gap-6 py-6">
        {/* Permission-based Menu */}
        <DashboardMenu user={user} />

        {staleLeadsInfo && staleLeadsInfo.staleLeadsCount > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            <p className="font-semibold">
              {t('⚠️ {count} lead(s) have not been updated for over {hours} hours', {
                count: staleLeadsInfo.staleLeadsCount,
                hours: staleLeadsInfo.thresholdHours,
              })}
            </p>
            {staleLeadsInfo.oldestLeadUpdatedAt && (
              <p className="mt-1 text-xs text-rose-600">
                {t('Oldest update was at {time}', {
                  time: new Date(staleLeadsInfo.oldestLeadUpdatedAt).toLocaleString(),
                })}
              </p>
            )}
          </div>
        )}

      
        

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Leads by Source */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Leads by Source</h3>
            {Array.isArray(leadsBySource) && leadsBySource.length > 0 ? (
              <div className="h-64 sm:h-80">
                <Doughnut data={sourceChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            ) : (
              <p className="text-gray-500 text-sm sm:text-base">No data available</p>
            )}
          </div>

          {/* Team Performance */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Team Performance</h3>
            {Array.isArray(teamPerformance) && teamPerformance.length > 0 ? (
              <div className="h-64 sm:h-80">
                <Bar data={teamChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            ) : (
              <p className="text-gray-500 text-sm sm:text-base">No team data available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Leads Trend */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Leads Trend (30 days)</h3>
            {Array.isArray(leadsTrend) && leadsTrend.length > 0 ? (
              <div className="h-64 sm:h-80">
                <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            ) : (
              <p className="text-gray-500 text-sm sm:text-base">No data available</p>
            )}
          </div>

          {/* Cost per Lead Chart */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Cost per Lead by Campaign</h3>
            {Array.isArray(costPerLead) && costPerLead.length > 0 ? (
              <div className="h-64 sm:h-80">
                <Bar data={costChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            ) : (
              <p className="text-gray-500 text-sm sm:text-base">No campaign data available</p>
            )}
          </div>
        </div>

        {/* Pipeline Conversion */}
        {pipelineConversion && pipelineConversion.stages && Array.isArray(pipelineConversion.stages) && (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Pipeline Conversion</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {pipelineConversion.stages.map((stage: any, index: number) => (
                <div key={stage.stage} className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">{stage.stage}</div>
                  {index === 0 && (
                    <div className="text-xs text-green-600 mt-2 font-medium">
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
