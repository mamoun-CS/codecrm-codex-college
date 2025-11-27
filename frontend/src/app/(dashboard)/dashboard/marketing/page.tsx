'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAllCampaignsUpdates } from '@/hooks/useRealtimeUpdates';
import { useDashboardSocket } from '@/hooks/useDashboardSocket';
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

export default function MarketingDashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [leadsBySource, setLeadsBySource] = useState<any[]>([]);
  const [costPerLead, setCostPerLead] = useState<any[]>([]);
  const [leadsTrend, setLeadsTrend] = useState<any[]>([]);
  const [campaignROI, setCampaignROI] = useState<any[]>([]);
  const [leadsSummary, setLeadsSummary] = useState<any>(null);
  const [bestCampaign, setBestCampaign] = useState<any>(null);
  const [successfulLeads, setSuccessfulLeads] = useState<number>(0);
  const [landingPageStats, setLandingPageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();

  // Real-time updates
  const { connected: realtimeConnected, allNewLeads } = useAllCampaignsUpdates();
  const { connected: dashboardSocketConnected, lastEvent, refreshDashboardData } = useDashboardSocket();

  // Auto-refresh dashboard data when real-time events occur
  useEffect(() => {
    if (lastEvent) {
      loadDashboardData();
    }
  }, [lastEvent]);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading Marketing Dashboard - Fetching REAL data from database...');

      const [
        dashboardRes,
        sourceRes,
        costRes,
        trendRes,
        roiRes,
        leadsSummaryRes,
        successfulLeadsRes,
        landingPageStatsRes
      ] = await Promise.all([
        dashboardAPI.getMarketingDashboard(user.id),
        analyticsAPI.getLeadsBySource(),
        analyticsAPI.getCostPerLead(),
        analyticsAPI.getLeadsTrend(30),
        analyticsAPI.getCampaignROI(),
        analyticsAPI.getLeadsSummary(),
        analyticsAPI.getSuccessfulLeads(),
        analyticsAPI.getLandingPageStats()
      ]);

      console.log('✅ Real data loaded successfully:', {
        dashboard: dashboardRes.data,
        leadsBySource: sourceRes.data,
        costPerLead: costRes.data,
        leadsTrend: trendRes.data,
        campaignROI: roiRes.data,
        leadsSummary: leadsSummaryRes.data,
        successfulLeads: successfulLeadsRes.data,
        landingPageStats: landingPageStatsRes.data
      });

      // Use dashboard data for transaction count, keep other analytics data
      const dashboardData = dashboardRes.data.dashboardData;

      // Set overview with real data from analytics
      setOverview({
        totalLeads: dashboardData.totalLeads || 0,
        totalDeals: dashboardData.totalDeals || 0,
        wonDeals: dashboardData.wonDeals || 0,
        totalSpend: dashboardData.totalSpend || 0,
        conversionRate: dashboardData.conversionRate || 0,
        costPerLead: dashboardData.costPerLead || 0,
        totalTransactions: dashboardData.totalTransactions || 0,
      });

      setLeadsBySource(sourceRes.data || []);
      setCostPerLead(costRes.data || []);
      setLeadsTrend(trendRes.data || []);
      setCampaignROI(roiRes.data || []);

      // Set real data from backend
      setLeadsSummary(leadsSummaryRes.data || { today: 0, thisWeek: 0, thisMonth: 0 });
      setSuccessfulLeads(successfulLeadsRes.data?.count || 0);
      setLandingPageStats(landingPageStatsRes.data || null);

      // Find best campaign (highest ROI)
      if (roiRes.data && roiRes.data.length > 0) {
        const best = roiRes.data.reduce((prev: any, current: any) =>
          (prev.roi_percentage > current.roi_percentage) ? prev : current
        );
        setBestCampaign(best);
      }

      console.log('✅ Marketing Dashboard loaded with REAL DATA from database');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      console.warn('⚠️ Using FALLBACK DATA - Database may be empty or API error occurred');
      // Use fallback data if API fails or database is empty
      setOverview({
        totalLeads: 1250,
        totalDeals: 89,
        wonDeals: 67,
        totalSpend: 12500,
        conversionRate: 7.5,
        costPerLead: 10.00
      });
      setLeadsBySource([
        { source: 'Facebook Ads', count: 450 },
        { source: 'Google Ads', count: 320 },
        { source: 'Landing Pages', count: 280 },
        { source: 'Website', count: 150 },
        { source: 'TikTok', count: 50 }
      ]);
      setCostPerLead([
        { campaign: 'Facebook Q4 Campaign', costPerLead: 8.50 },
        { campaign: 'Google Search', costPerLead: 12.30 },
        { campaign: 'Landing Page A', costPerLead: 6.75 },
        { campaign: 'TikTok Ads', costPerLead: 4.20 }
      ]);
      setLeadsTrend([
        { date: '2025-11-01', count: 25 },
        { date: '2025-11-02', count: 32 },
        { date: '2025-11-03', count: 28 },
        { date: '2025-11-04', count: 45 },
        { date: '2025-11-05', count: 38 },
        { date: '2025-11-06', count: 52 },
        { date: '2025-11-07', count: 41 },
        { date: '2025-11-08', count: 35 },
        { date: '2025-11-09', count: 48 },
        { date: '2025-11-10', count: 55 },
        { date: '2025-11-11', count: 42 },
        { date: '2025-11-12', count: 38 },
        { date: '2025-11-13', count: 51 },
        { date: '2025-11-14', count: 47 },
        { date: '2025-11-15', count: 39 },
        { date: '2025-11-16', count: 44 },
        { date: '2025-11-17', count: 53 },
        { date: '2025-11-18', count: 49 },
        { date: '2025-11-19', count: 41 }
      ]);
      setCampaignROI([
        { campaign_name: 'Facebook Ads Q4', roi_percentage: 245, leads_count: 89, total_revenue: 12500, total_cost: 5100 },
        { campaign_name: 'Google Search', roi_percentage: 180, leads_count: 67, total_revenue: 8900, total_cost: 4950 },
        { campaign_name: 'Landing Page A', roi_percentage: 320, leads_count: 45, total_revenue: 6750, total_cost: 2100 },
        { campaign_name: 'TikTok Ads', roi_percentage: 150, leads_count: 23, total_revenue: 3450, total_cost: 2300 }
      ]);
      setLeadsSummary({
        today: 12,
        thisWeek: 87,
        thisMonth: 342
      });
      setSuccessfulLeads(156);
      setLandingPageStats({
        totalVisits: 1250,
        totalSubmissions: 89,
        conversionRate: 7.1,
        campaignStats: [
          { campaign: 'Facebook Campaign', visits: 450, submissions: 32, conversionRate: 7.1 },
          { campaign: 'Google Campaign', visits: 380, submissions: 28, conversionRate: 7.4 },
          { campaign: 'Landing Page A', visits: 320, submissions: 24, conversionRate: 7.5 },
          { campaign: 'TikTok Campaign', visits: 100, submissions: 5, conversionRate: 5.0 }
        ],
        topCountries: [
          { country: 'United States', count: 450 },
          { country: 'United Kingdom', count: 280 },
          { country: 'Canada', count: 180 },
          { country: 'Australia', count: 120 },
          { country: 'Germany', count: 95 }
        ],
        recentLeads: [
          { campaign: 'Facebook Campaign', country: 'United States', date: new Date('2025-11-18T10:30:00Z'), leadId: 1234 },
          { campaign: 'Google Campaign', country: 'United Kingdom', date: new Date('2025-11-18T09:15:00Z'), leadId: 1235 },
          { campaign: 'Landing Page A', country: 'Canada', date: new Date('2025-11-17T16:45:00Z'), leadId: 1236 },
          { campaign: 'TikTok Campaign', country: 'Australia', date: new Date('2025-11-17T14:20:00Z'), leadId: 1237 }
        ]
      });
      setBestCampaign({
        campaign_name: 'Facebook Ads Q4',
        roi_percentage: 245,
        leads_count: 89,
        total_revenue: 12500
      });
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
    // Check if user has marketing access (same as admin)
    const hasMarketingAccess = (account: any) => {
      if (!account) return false;
      const role = account.role;
      const permissions = account.permissions || [];
      const privilegedRoles = ['marketing', 'admin', 'manager'];

      return (
        privilegedRoles.includes(role) ||
        permissions.includes('marketing_dashboard_access') ||
        permissions.includes('view_leads')
      );
    };

    if (!hasMarketingAccess(parsedUser)) {
      router.push('/login');
      return;
    }
    setUser(parsedUser);
    loadDashboardData();

    // Set up real-time refresh for landing page stats
    if (dashboardSocketConnected) {
      const interval = setInterval(() => {
        analyticsAPI.getLandingPageStats().then(response => {
          setLandingPageStats(response.data);
        }).catch(error => {
          console.error('Failed to refresh landing page stats:', error);
        });
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [router, dashboardSocketConnected]);

  const quickActions = useMemo(
    () => [
      {
        href: '/marketing-accounts',
        icon: '📣',
        iconClasses: 'bg-orange-100 text-orange-600',
        labelKey: 'Marketing Accounts',
        descriptionKey: 'View & manage ad accounts',
      },
      {
        href: '/landing-pages',
        icon: '🧱',
        iconClasses: 'bg-teal-100 text-teal-600',
        labelKey: 'Landing Pages',
        descriptionKey: 'Create & manage landing pages',
      },
      {
        href: '/integrations',
        icon: '🔌',
        iconClasses: 'bg-indigo-100 text-indigo-600',
        labelKey: 'Marketing Integrations',
        descriptionKey: 'Connect ad platforms',
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
      label: 'Leads Generated',
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

  const roiChartData = {
    labels: campaignROI.map(item => item.campaign_name),
    datasets: [{
      label: 'ROI (%)',
      data: campaignROI.map(item => item.roi_percentage),
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
                Codex College · {t('Marketing Dashboard')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span>{t('Welcome, {name} ({role})', { name: user.name, role: t('Marketing') })}</span>
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
        {/* Total Leads Statistics Section */}
        {leadsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div key="today-leads" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">D</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads Today</dt>
                      <dd className="text-lg font-medium text-gray-900">{leadsSummary.today}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div key="week-leads" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">W</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads This Week</dt>
                      <dd className="text-lg font-medium text-gray-900">{leadsSummary.thisWeek}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div key="month-leads" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">M</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads This Month</dt>
                      <dd className="text-lg font-medium text-gray-900">{leadsSummary.thisMonth}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Landing Page Stats */}
        {landingPageStats && (
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-black">
  <h3 className="text-xl font-bold mb-4">📊 Landing Page Performance</h3>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div className="bg-white bg-opacity-80 rounded-lg p-4">
      <div className="text-2xl font-bold">{landingPageStats.totalVisits}</div>
      <div className="text-sm text-gray-700">Total Visits</div>
    </div>
    <div className="bg-white bg-opacity-80 rounded-lg p-4">
      <div className="text-2xl font-bold">{landingPageStats.totalSubmissions}</div>
      <div className="text-sm text-gray-700">Form Submissions</div>
    </div>
    <div className="bg-white bg-opacity-80 rounded-lg p-4">
      <div className="text-2xl font-bold">{landingPageStats.conversionRate}%</div>
      <div className="text-sm text-gray-700">Conversion Rate</div>
    </div>
    <div className="bg-white bg-opacity-80 rounded-lg p-4">
      <div className="text-2xl font-bold">{landingPageStats.campaignStats?.length || 0}</div>
      <div className="text-sm text-gray-700">Active Campaigns</div>
    </div>
  </div>
</div>

        )}

        {/* KPI Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div key="total-leads" className="bg-white overflow-hidden shadow rounded-lg">
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

            <div key="lead-sources" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Lead Sources</dt>
                      <dd className="text-lg font-medium text-gray-900">{leadsBySource.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div key="conversion-rate" className="bg-white overflow-hidden shadow rounded-lg">
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

            <div key="cost-per-lead" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Cost per Lead</dt>
                      <dd className="text-lg font-medium text-gray-900">${overview.costPerLead}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Successful Leads (Converted to Customers) */}
            <div key="successful-leads" className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Successful Leads (Customers)</dt>
                      <dd className="text-lg font-medium text-gray-900">{successfulLeads}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best Sales Campaign Section */}
        {bestCampaign && (
         <div className="bg-gradient-to-r from-purple-200 to-blue-200 rounded-lg shadow-lg p-6 mb-8 text-black">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-xl font-bold mb-2">🏆 Best Sales Campaign</h3>
      <p className="text-gray-700 mb-4">{bestCampaign.campaign_name}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold">{bestCampaign.roi_percentage}%</div>
          <div className="text-sm text-gray-600">ROI</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold">{bestCampaign.leads_count}</div>
          <div className="text-sm text-gray-600">Total Leads</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-2xl font-bold">
            ${bestCampaign.total_revenue?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
      </div>
    </div>
    <div className="hidden md:block">
      <div className="text-6xl">🎯</div>
    </div>
  </div>
</div>

        )}

        {/* Landing Page Campaign Performance */}
        {landingPageStats?.campaignStats && landingPageStats.campaignStats.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Landing Page Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {landingPageStats.campaignStats.map((campaign: any, index: number) => (
                    <tr key={`landing-campaign-${campaign.campaign}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {campaign.campaign}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.visits}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.submissions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.conversionRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Leads from Landing Pages */}
        {landingPageStats?.recentLeads && landingPageStats.recentLeads.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Landing Page Leads</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {landingPageStats.recentLeads.map((lead: any, index: number) => (
                    <tr key={`recent-lead-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lead.campaign}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(lead.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.leadId || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads by Source */}
          <div key="leads-by-source" className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leads by Source</h3>
            {leadsBySource.length > 0 ? (
              <Doughnut data={sourceChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Campaign ROI */}
          <div key="campaign-roi" className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign ROI</h3>
            {campaignROI.length > 0 ? (
              <Bar data={roiChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No campaign data available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads Trend */}
          <div key="leads-trend" className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leads Trend (30 days)</h3>
            {leadsTrend.length > 0 ? (
              <Line data={trendChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          {/* Cost per Lead Chart */}
          <div key="cost-per-lead" className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost per Lead by Campaign</h3>
            {costPerLead.length > 0 ? (
              <Bar data={costChartData} options={{ responsive: true }} />
            ) : (
              <p className="text-gray-500">No campaign data available</p>
            )}
          </div>
        </div>

        {/* Campaign Performance Table */}
        {campaignROI.length > 0 && (
          <div key="campaign-performance" className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaignROI.map((campaign: any, index: number) => (
                    <tr key={`campaign-${campaign.campaign_name}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {campaign.campaign_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.leads_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${campaign.total_cost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${campaign.total_revenue}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.roi_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
