'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AxiosError } from 'axios';
import useSWRInfinite from 'swr/infinite';
import toast from 'react-hot-toast';
import LeadsActionsToolbar from '@/components/leads/LeadsActionsToolbar';
import LeadsFilters from '@/components/leads/LeadsFilters';
import LeadsTable from '@/components/leads/LeadsTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLeadStream } from '@/hooks/useLeadStream';
import { leadsAPI } from '@/lib/api';
import type {
  LeadFilters,
  LeadListItem,
  PaginatedLeadsResponse,
  SortState,
} from '@/types/leads';

const LeadDetailsSidebar = dynamic(
  () => import('@/components/leads/LeadDetailsSidebar'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-center text-sm text-slate-400">
        يتم تحميل تفاصيل العميل...
      </div>
    ),
  },
);

const PAGE_SIZE = 50;
const STALE_LEAD_THRESHOLD_HOURS = 4; // ⚠️ Warning threshold for stale leads

const DEFAULT_FILTERS: LeadFilters = {
  status: 'new',  // ✅ Default filter set to 'new' instead of 'all'
  source: 'all',
  owner: '',
  search: '',
  startDate: '',
  endDate: '',
};

type LeadsKey = [
  'leads-status',
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  SortState['field'],
  SortState['direction'],
];

export default function LeadsStatusPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name?: string } | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ field: 'created_at', direction: 'desc' });
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staleLeadsCount, setStaleLeadsCount] = useState(0);
  const [totalStaleLeadsCount, setTotalStaleLeadsCount] = useState(0);
  const [showStaleWarning, setShowStaleWarning] = useState(true);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = window.localStorage.getItem('token');
    const userData = window.localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setCurrentUser(parsed);
    } catch {
      window.localStorage.removeItem('user');
    }
    setIsReady(true);
  }, [router]);

  const normalizedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const getKey = useCallback(
    (pageIndex: number, previousPage: PaginatedLeadsResponse | null): LeadsKey | null => {
      if (!isReady) {
        return null;
      }
      if (previousPage && !previousPage.meta.hasNextPage) {
        return null;
      }
      return [
        'leads-status',
        pageIndex + 1,
        normalizedFilters.status,
        normalizedFilters.source,
        normalizedFilters.owner,
        normalizedFilters.search,
        normalizedFilters.startDate,
        normalizedFilters.endDate,
        sort.field,
        sort.direction,
      ];
    },
    [isReady, normalizedFilters, sort.field, sort.direction],
  );

  const fetcher = useCallback(async (key: LeadsKey): Promise<PaginatedLeadsResponse> => {
    const [
      ,
      page,
      status,
      source,
      owner,
      search,
      startDate,
      endDate,
      sortField,
      sortDirection,
    ] = key;

    const params = {
      page,
      limit: PAGE_SIZE,
      status: status !== 'all' ? status : undefined,
      source: source !== 'all' ? source : undefined,
      owner: owner || undefined,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sortBy: sortField === 'name' ? 'full_name' : sortField,
      sortOrder: sortDirection,
    };

    const response = await leadsAPI.getLeads(params);
    return response.data;
  }, []);

  const {
    data,
    size,
    setSize,
    mutate,
    isLoading,
    isValidating,
  } = useSWRInfinite<PaginatedLeadsResponse, AxiosError, LeadsKey>(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    keepPreviousData: true,
    onError: () => toast.error('تعذر تحميل العملاء'),
  });

  const leads = useMemo<LeadListItem[]>(
    () => (data ? data.flatMap((page) => page.leads) : []),
    [data],
  );
  const total = data?.[0]?.meta.total ?? 0;
  const hasMore = data && data.length > 0 ? data[data.length - 1].meta.hasNextPage : false;

  // ⚠️ Detect stale leads in CURRENT filtered view
  useEffect(() => {
    if (!leads || leads.length === 0) {
      setStaleLeadsCount(0);
      return;
    }

    const now = Date.now();
    const staleLeads = leads.filter((lead) => {
      const lastUpdate = lead.updated_at ? new Date(lead.updated_at).getTime() : new Date(lead.created_at).getTime();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      return hoursSinceUpdate > STALE_LEAD_THRESHOLD_HOURS;
    });

    setStaleLeadsCount(staleLeads.length);
  }, [leads]);

  // ⚠️ Fetch ALL leads to check for stale ones (regardless of filters)
  useEffect(() => {
    if (!isReady) return;

    const checkAllStaleLeads = async () => {
      try {
        // Fetch ALL leads - fetch multiple pages to ensure we get everything
        let allLeads: LeadListItem[] = [];
        let currentPage = 1;
        let hasMore = true;

        // Fetch up to 5 pages (5000 leads max) to check for stale leads
        while (hasMore && currentPage <= 5) {
          const response = await leadsAPI.getLeads({
            page: currentPage,
            limit: 1000,
            status: undefined, // Get ALL statuses
            source: undefined,
            owner: undefined,
            search: undefined,
          });

          const pageLeads = response.data?.leads || response.data?.data || [];
          allLeads = [...allLeads, ...pageLeads];

          // Check if there are more pages
          const meta = response.data?.meta;
          hasMore = meta?.hasNextPage || false;
          currentPage++;
        }

        console.log(`🔍 Checking ${allLeads.length} total leads for staleness...`);

        const now = Date.now();
        const staleLeads = allLeads.filter((lead: LeadListItem) => {
          const lastUpdate = lead.updated_at ? new Date(lead.updated_at).getTime() : new Date(lead.created_at).getTime();
          const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
          return hoursSinceUpdate > STALE_LEAD_THRESHOLD_HOURS;
        });

        console.log(`⚠️ Found ${staleLeads.length} stale leads (not updated in ${STALE_LEAD_THRESHOLD_HOURS}+ hours)`);

        setTotalStaleLeadsCount(staleLeads.length);

        // Show toast notification if there are stale leads
        if (staleLeads.length > 0) {
          // Show the warning banner again if there are stale leads
          setShowStaleWarning(true);

          const message = staleLeads.length === 1
            ? `⚠️ ${staleLeads.length} lead has not been updated for over ${STALE_LEAD_THRESHOLD_HOURS} hours`
            : `⚠️ ${staleLeads.length} leads have not been updated for over ${STALE_LEAD_THRESHOLD_HOURS} hours`;

          toast.error(message, {
            duration: 8000,
            position: 'top-center',
            icon: '⚠️',
          });
        }
      } catch (error) {
        console.error('❌ Error checking stale leads:', error);
      }
    };

    checkAllStaleLeads();

    // Re-check every 5 minutes
    const interval = setInterval(checkAllStaleLeads, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isReady]);

  const handleFiltersChange = useCallback((changes: Partial<LeadFilters>) => {
    setFilters((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleSortChange = useCallback((nextSort: SortState) => {
    setSort(nextSort);
  }, []);

  const handleSelectLead = useCallback((leadId: number) => {
    setSelectedLeadId(leadId);
    setSidebarOpen(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    setSize((previous) => previous + 1);
  }, [setSize]);

  const handleRefresh = useCallback(() => {
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  const mergeIncomingLeads = useCallback(
    (incoming: LeadListItem[]) => {
      mutate(
        (pages) => mergeLeadsIntoPages(pages, incoming, sort),
        { revalidate: false },
      );
    },
    [mutate, sort],
  );

  const patchLead = useCallback(
    (lead: LeadListItem) => {
      mutate(
        (pages) => patchLeadInPages(pages, lead),
        { revalidate: false },
      );
    },
    [mutate],
  );

  const { connected } = useLeadStream({
    onInsert: mergeIncomingLeads,
    onUpdate: patchLead,
  });

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <main dir="rtl" className="space-y-6">
      <LeadsActionsToolbar
        total={total}
        isRefreshing={isValidating}
        onRefresh={handleRefresh}
        connected={connected}
        userName={currentUser?.name}
        staleLeadsCount={totalStaleLeadsCount}
      />

      {/* ⚠️ Stale Leads Warning Banner - Shows ALL stale leads in system */}
      {totalStaleLeadsCount > 0 && showStaleWarning && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-200">
                  {totalStaleLeadsCount === 1
                    ? `${totalStaleLeadsCount} lead has not been updated for over ${STALE_LEAD_THRESHOLD_HOURS} hours`
                    : `${totalStaleLeadsCount} leads have not been updated for over ${STALE_LEAD_THRESHOLD_HOURS} hours`}
                </h3>
                <p className="text-xs text-amber-300/80">
                  These leads may need immediate attention. Please review and update them.
                  {staleLeadsCount > 0 && filters.status === 'new' && (
                    <span className="ml-2 font-semibold">
                      ({staleLeadsCount} in current "New" filter)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowStaleWarning(false)}
              className="text-xs font-semibold uppercase tracking-wide text-amber-300 hover:text-amber-100 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <LeadsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      <LeadsTable
        leads={leads}
        sort={sort}
        onSortChange={handleSortChange}
        selectedLeadId={selectedLeadId}
        onSelectLead={handleSelectLead}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />

      <LeadDetailsSidebar
        leadId={selectedLeadId}
        open={sidebarOpen && Boolean(selectedLeadId)}
        onClose={closeSidebar}
        onLeadUpdated={patchLead}
      />
    </main>
  );
}

function mergeLeadsIntoPages(
  pages: PaginatedLeadsResponse[] | undefined,
  incoming: LeadListItem[],
  sort: SortState,
) {
  if (!pages?.length || !incoming.length) {
    return pages;
  }

  const sortedIncoming = sortLeadsBy(incoming, sort);
  const incomingCount = new Set(sortedIncoming.map((lead) => lead.id)).size;
  const seen = new Set<number>();
  let carry = sortedIncoming;

  return pages.map((page) => {
    const limit = page.meta.limit ?? PAGE_SIZE;
    const combined = [...carry, ...page.leads];
    const deduped: LeadListItem[] = [];

    combined.forEach((lead) => {
      if (seen.has(lead.id)) {
        return;
      }
      seen.add(lead.id);
      deduped.push(lead);
    });

    const pageLeads = deduped.slice(0, limit);
    carry = deduped.slice(limit);

    return {
      ...page,
      leads: pageLeads,
      data: pageLeads,
      meta: {
        ...page.meta,
        total: page.meta.total + incomingCount,
      },
    };
  });
}

function patchLeadInPages(
  pages: PaginatedLeadsResponse[] | undefined,
  update: LeadListItem,
) {
  if (!pages?.length) {
    return pages;
  }

  let touched = false;

  const nextPages = pages.map((page) => {
    let pageMutated = false;
    const rows = page.leads.map((lead) => {
      if (lead.id !== update.id) {
        return lead;
      }
      touched = true;
      pageMutated = true;
      return {
        ...lead,
        ...update,
        name: update.name ?? lead.name,
      };
    });

    return pageMutated ? { ...page, leads: rows, data: rows } : page;
  });

  return touched ? nextPages : pages;
}

function sortLeadsBy(leads: LeadListItem[], sort: SortState) {
  const sorted = [...leads];
  sorted.sort((a, b) => {
    if (sort.field === 'created_at') {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort.direction === 'asc' ? diff : -diff;
    }

    if (sort.field === 'status') {
      const diff = a.status.localeCompare(b.status);
      return sort.direction === 'asc' ? diff : -diff;
    }

    const diff = a.name.localeCompare(b.name);
    return sort.direction === 'asc' ? diff : -diff;
  });

  return sorted;
}
