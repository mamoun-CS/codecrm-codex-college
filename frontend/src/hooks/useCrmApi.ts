'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import crmApi, {
  CampaignFilters,
  LeadsFilters,
  IntegrationsFilters,
  SyncPayload,
} from '@/lib/apiClient';
// Import types from the new schema
import type { Lead, Campaign } from '@/types_new/leads';
import type { Integration } from '@/types_new/integrations';

// Define local types for forms and responses (since they're not exported from apiClient)
interface LeadFormValues {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  status?: import('@/types_new/enums').LeadStatus;
  source?: import('@/types_new/enums').LeadSource;
  campaign_id?: number;
  owner_user_id?: number;
  assigned_to?: number;
  custom_fields?: Record<string, any>;
  raw_payload?: Record<string, any>;
}

interface CampaignFormValues {
  name: string;
  description?: string;
  country?: string;
  ad_source_id?: number;
  created_by?: number;
  platform_campaign_id?: string;
  active?: boolean;
  budget?: number;
  cost_per_lead?: number;
}

interface IntegrationFormValues {
  provider: import('@/types_new/enums').IntegrationProvider;
  name?: string;
  slug?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  page_id?: string;
  page_name?: string;
  account_id?: string;
  webhook_url?: string;
  webhook_config?: any;
  extra?: any;
  connected_at?: string;
  created_by?: number;
  user_id?: number;
  type?: import('@/types_new/enums').IntegrationType;
  status?: import('@/types_new/enums').IntegrationStatus;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
}

interface LeadsResponse extends PaginatedResponse<Lead> {}
interface CampaignsResponse extends PaginatedResponse<Campaign> {}
interface IntegrationsResponse extends PaginatedResponse<Integration> {}

type Key = [string, string];
const serialize = (value: unknown) => JSON.stringify(value ?? {});

const usePaginatedSWR = <T,>(key: Key, fetcher: () => Promise<PaginatedResponse<T>>) => {
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });
  return {
    data: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
};

/* -------------------------------------------------------------------------- */
/*                                   Leads                                     */
/* -------------------------------------------------------------------------- */

export const useLeadsQuery = (filters?: LeadsFilters) => {
  return usePaginatedSWR<Lead>(
    ['leads', serialize(filters)],
    () => crmApi.leads.list(filters),
  );
};

export const useLeadDetails = (id?: number) => {
  const shouldFetch = Boolean(id);
  const { data, error, isLoading, mutate } = useSWR<Lead>(
    shouldFetch ? ['lead', String(id)] : null,
    () => crmApi.leads.get(id as number),
  );
  return { lead: data, isLoading, isError: Boolean(error), error, mutate };
};

export const useLeadMutations = () => {
  const { mutate } = useSWRConfig();

  const invalidateLeads = useCallback(
    () => mutate((key) => Array.isArray(key) && key[0] === 'leads'),
    [mutate],
  );

  const createLead = useCallback(
    async (payload: LeadFormValues) => {
      const lead = await crmApi.leads.create(payload);
      await invalidateLeads();
      return lead;
    },
    [invalidateLeads],
  );

  const updateLead = useCallback(
    async (id: number, payload: Partial<Lead>) => {
      const lead = await crmApi.leads.update(id, payload);
      await invalidateLeads();
      await mutate(['lead', String(id)]);
      return lead;
    },
    [invalidateLeads, mutate],
  );

  const deleteLead = useCallback(
    async (id: number) => {
      await crmApi.leads.remove(id);
      await invalidateLeads();
      await mutate(['lead', String(id)]);
    },
    [invalidateLeads, mutate],
  );

  const transferLead = useCallback(
    async (payload: { leadId: number; receiverId: number; notes?: string }) => {
      const response = await crmApi.leads.transfer(payload);
      await invalidateLeads();
      await mutate(['lead', String(payload.leadId)]);
      return response;
    },
    [invalidateLeads, mutate],
  );

  return { createLead, updateLead, deleteLead, transferLead };
};

/* -------------------------------------------------------------------------- */
/*                                Integrations                                 */
/* -------------------------------------------------------------------------- */

export const useIntegrationsQuery = (filters?: IntegrationsFilters) => {
  return usePaginatedSWR<Integration>(
    ['integrations', serialize(filters)],
    () => crmApi.integrations.list(filters),
  );
};

export const useIntegrationMutations = () => {
  const { mutate } = useSWRConfig();
  const invalidate = useCallback(
    () => mutate((key) => Array.isArray(key) && key[0] === 'integrations'),
    [mutate],
  );

  const createIntegration = useCallback(
    async (payload: IntegrationFormValues) => {
      const integration = await crmApi.integrations.create(payload);
      await invalidate();
      return integration;
    },
    [invalidate],
  );

  const updateIntegration = useCallback(
    async (id: number, payload: Partial<Integration>) => {
      const integration = await crmApi.integrations.update(id, payload);
      await invalidate();
      await mutate(['integration', String(id)]);
      return integration;
    },
    [invalidate, mutate],
  );

  const deleteIntegration = useCallback(
    async (id: number) => {
      await crmApi.integrations.remove(id);
      await invalidate();
      await mutate(['integration', String(id)]);
    },
    [invalidate, mutate],
  );

  const triggerSync = useCallback(async (id: number) => {
    const res = await crmApi.integrations.triggerSync(id);
    await invalidate();
    return res;
  }, [invalidate]);

  return {
    createIntegration,
    updateIntegration,
    deleteIntegration,
    triggerSync,
    connectOAuth: crmApi.integrations.connectOAuth,
    disconnectOAuth: crmApi.integrations.disconnectOAuth,
  };
};

/* -------------------------------------------------------------------------- */
/*                                 Campaigns                                   */
/* -------------------------------------------------------------------------- */

export const useCampaignsQuery = (filters?: CampaignFilters) => {
  return usePaginatedSWR<Campaign>(
    ['campaigns', serialize(filters)],
    () => crmApi.campaigns.list(filters),
  );
};

export const useCampaignAnalytics = (id?: number) => {
  const shouldFetch = Boolean(id);
  const { data, error, isLoading } = useSWR(
    shouldFetch ? ['campaign-stats', String(id)] : null,
    () => crmApi.campaigns.analytics(id as number),
  );
  return { stats: data?.data, isLoading, isError: Boolean(error), error };
};

export const useCampaignMutations = () => {
  const { mutate } = useSWRConfig();
  const invalidate = useCallback(
    () => mutate((key) => Array.isArray(key) && key[0] === 'campaigns'),
    [mutate],
  );

  const createCampaign = useCallback(
    async (payload: CampaignFormValues) => {
      const campaign = await crmApi.campaigns.create(payload);
      await invalidate();
      return campaign;
    },
    [invalidate],
  );

  const updateCampaign = useCallback(
    async (id: number, payload: Partial<Campaign>) => {
      const campaign = await crmApi.campaigns.update(id, payload);
      await invalidate();
      await mutate(['campaign', String(id)]);
      return campaign;
    },
    [invalidate, mutate],
  );

  const deleteCampaign = useCallback(
    async (id: number) => {
      await crmApi.campaigns.remove(id);
      await invalidate();
      await mutate(['campaign', String(id)]);
    },
    [invalidate, mutate],
  );

  return { createCampaign, updateCampaign, deleteCampaign };
};

/* -------------------------------------------------------------------------- */
/*                                   Sync                                      */
/* -------------------------------------------------------------------------- */

export const useSyncLeads = () => {
  const { mutate } = useSWRConfig();
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [error, setError] = useState<unknown>(null);

  const syncLeads = useCallback(
    async (payload: SyncPayload) => {
      setStatus('running');
      setError(null);
      try {
        const response = await crmApi.sync.leads(payload);
        setStatus('success');
        await mutate((key) => Array.isArray(key) && key[0] === 'leads');
        return response;
      } catch (err) {
        setStatus('error');
        setError(err);
        throw err;
      }
    },
    [mutate],
  );

  const triggerAutoSync = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      const response = await crmApi.sync.triggerAuto();
      setStatus('success');
      await mutate((key) => Array.isArray(key) && key[0] === 'leads');
      return response;
    } catch (err) {
      setStatus('error');
      setError(err);
      throw err;
    }
  }, [mutate]);

  return {
    syncLeads,
    triggerAutoSync,
    status,
    error,
  };
};

/* -------------------------------------------------------------------------- */
/*                               Usage Examples                               */
/* -------------------------------------------------------------------------- */

/**
 * const { data: leads, meta, isLoading } = useLeadsQuery({ status: 'new' });
 * const { createLead } = useLeadMutations();
 *
 * const handleSubmit = async (values: LeadFormValues) => {
 *   await createLead(values);
 * };
 *
 * const { data: integrations } = useIntegrationsQuery({ platform_type: 'meta' });
 * const { triggerSync } = useIntegrationMutations();
 *
 * await triggerSync(integrationId);
 */

