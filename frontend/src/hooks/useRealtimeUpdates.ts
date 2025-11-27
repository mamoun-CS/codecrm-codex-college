import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeConfig {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface CampaignUpdate {
  campaignId: number;
  country: string;
  data: any;
  timestamp: Date;
}

interface NewLeadNotification {
  type: 'new_lead';
  campaignId: number;
  country: string;
  lead: any;
  timestamp: Date;
}

interface LeadCreatedEvent {
  eventName: string;
  type: string;
  data: any;
  timestamp: string;
}

interface CampaignAnalytics {
  campaignId: number;
  country: string;
  analytics: {
    lead_count: number;
    conversion_count: number;
    cost_per_lead: number;
    conversion_rate: number;
    remaining_budget: number;
    budget_utilization: number;
  };
  timestamp: Date;
}

interface BudgetAlert {
  type: 'budget_alert';
  campaignId: number;
  country: string;
  budget: number;
  spent: number;
  remaining: number;
  utilization: number;
  threshold: 'warning' | 'exceeded';
  timestamp: Date;
}

interface LeadUpdate {
  leadId: number;
  country: string;
  lead: any;
  timestamp: Date;
}

interface UserActivity {
  userId: number;
  country: string;
  activity: {
    type: string;
    description: string;
    entityType?: string;
    entityId?: number;
  };
  timestamp: Date;
}

interface TaskUpdate {
  taskId: number;
  leadId: number;
  country: string;
  task: any;
  timestamp: Date;
}

interface MeetingUpdate {
  meetingId: number;
  leadId: number;
  country: string;
  meeting: any;
  timestamp: Date;
}

interface PriceOfferUpdate {
  offerId: number;
  leadId: number;
  country: string;
  offer: any;
  timestamp: Date;
}

interface LandingPageUpdate {
  pageId: number;
  campaignId: number;
  country: string;
  page: any;
  timestamp: Date;
}

interface EntityUpdate {
  entityType: string;
  entityId: number;
  country: string;
  data: any;
  timestamp: Date;
}

export const useLeadUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [leadUpdates, setLeadUpdates] = useState<LeadUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const pushUpdate = (lead: any, eventCountry?: string) => {
      if (!lead) return;
      const normalizedCountry = eventCountry ?? lead.country ?? '';
      if (country && normalizedCountry && normalizedCountry !== country) {
        return;
      }
      const normalized: LeadUpdate = {
        leadId: lead.id,
        country: normalizedCountry,
        lead,
        timestamp: new Date(),
      };
      setLeadUpdates(prev => [normalized, ...prev].slice(0, 50));
    };

    const handleLeadUpdate = (data: LeadUpdate) => {
      pushUpdate(data.lead ?? data, data.country);
    };

    const handleNewLead = (notification: NewLeadNotification) => {
      pushUpdate(notification.lead, notification.country);
    };

    const handleLeadCreated = (event: LeadCreatedEvent) => {
      pushUpdate(event.data, event.data?.country);
    };

    socket.on('lead_update', handleLeadUpdate);
    socket.on('lead:updated', handleLeadUpdate);
    socket.on('lead:new', handleNewLead);
    socket.on('leadCreated', handleLeadCreated);

    return () => {
      socket.off('lead_update', handleLeadUpdate);
      socket.off('lead:updated', handleLeadUpdate);
      socket.off('lead:new', handleNewLead);
      socket.off('leadCreated', handleLeadCreated);
    };
  }, [socket, connected, country]);

  return { connected, leadUpdates };
};

export const useUserActivityUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleUserActivity = (data: UserActivity) => {
      if (!country || data.country === country) {
        setUserActivities(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('user_activity', handleUserActivity);

    return () => {
      socket.off('user_activity', handleUserActivity);
    };
  }, [socket, connected, country]);

  return { connected, userActivities };
};

export const useTaskUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleTaskUpdate = (data: TaskUpdate) => {
      if (!country || data.country === country) {
        setTaskUpdates(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('task_update', handleTaskUpdate);

    return () => {
      socket.off('task_update', handleTaskUpdate);
    };
  }, [socket, connected, country]);

  return { connected, taskUpdates };
};

export const useMeetingUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [meetingUpdates, setMeetingUpdates] = useState<MeetingUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleMeetingUpdate = (data: MeetingUpdate) => {
      if (!country || data.country === country) {
        setMeetingUpdates(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('meeting_update', handleMeetingUpdate);

    return () => {
      socket.off('meeting_update', handleMeetingUpdate);
    };
  }, [socket, connected, country]);

  return { connected, meetingUpdates };
};

export const usePriceOfferUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [priceOfferUpdates, setPriceOfferUpdates] = useState<PriceOfferUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handlePriceOfferUpdate = (data: PriceOfferUpdate) => {
      if (!country || data.country === country) {
        setPriceOfferUpdates(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('price_offer_update', handlePriceOfferUpdate);

    return () => {
      socket.off('price_offer_update', handlePriceOfferUpdate);
    };
  }, [socket, connected, country]);

  return { connected, priceOfferUpdates };
};

export const useLandingPageUpdates = (country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [landingPageUpdates, setLandingPageUpdates] = useState<LandingPageUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleLandingPageUpdate = (data: LandingPageUpdate) => {
      if (!country || data.country === country) {
        setLandingPageUpdates(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('landing_page_update', handleLandingPageUpdate);

    return () => {
      socket.off('landing_page_update', handleLandingPageUpdate);
    };
  }, [socket, connected, country]);

  return { connected, landingPageUpdates };
};

export const useEntityUpdates = (entityType: string, country?: string) => {
  const { socket, connected } = useRealtimeUpdates();
  const [entityUpdates, setEntityUpdates] = useState<EntityUpdate[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleEntityUpdate = (data: EntityUpdate) => {
      if (data.entityType === entityType && (!country || data.country === country)) {
        setEntityUpdates(prev => [data, ...prev].slice(0, 50));
      }
    };

    socket.on('entity_update', handleEntityUpdate);

    return () => {
      socket.off('entity_update', handleEntityUpdate);
    };
  }, [socket, connected, entityType, country]);

  return { connected, entityUpdates };
};

export const useRealtimeUpdates = (config: RealtimeConfig = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    const newSocket = io(`${socketUrl}/realtime`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: config.autoConnect !== false,
      reconnection: config.reconnection !== false,
      reconnectionAttempts: config.reconnectionAttempts || 5,
      reconnectionDelay: config.reconnectionDelay || 1000,
      timeout: 20000, // 20 second timeout
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    newSocket.on('connected', (data) => {
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message);
      setError(err.message);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [config.autoConnect, config.reconnection, config.reconnectionAttempts, config.reconnectionDelay]);

  const subscribeToCampaign = useCallback((campaignId: number) => {
    if (socket && connected) {
      socket.emit('subscribe:campaign', { campaignId });
    }
  }, [socket, connected]);

  const unsubscribeFromCampaign = useCallback((campaignId: number) => {
    if (socket && connected) {
      socket.emit('unsubscribe:campaign', { campaignId });
    }
  }, [socket, connected]);

  return {
    socket,
    connected,
    error,
    subscribeToCampaign,
    unsubscribeFromCampaign,
  };
};

// Hook for campaign-specific updates
export const useCampaignUpdates = (campaignId: number | null) => {
  const { socket, connected, subscribeToCampaign, unsubscribeFromCampaign } = useRealtimeUpdates();
  const [campaignData, setCampaignData] = useState<CampaignUpdate | null>(null);
  const [newLeads, setNewLeads] = useState<NewLeadNotification[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);

  useEffect(() => {
    if (!socket || !connected || !campaignId) return;

    // Subscribe to campaign
    subscribeToCampaign(campaignId);

    // Listen for campaign updates
    const handleCampaignUpdate = (data: CampaignUpdate) => {
      if (data.campaignId === campaignId) {
        setCampaignData(data);
      }
    };

    // Listen for new leads
    const handleNewLead = (notification: NewLeadNotification) => {
      if (notification.campaignId === campaignId) {
        setNewLeads(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      }
    };

    // Listen for analytics updates
    const handleAnalytics = (update: CampaignAnalytics) => {
      if (update.campaignId === campaignId) {
        setAnalytics(update);
      }
    };

    // Listen for budget alerts
    const handleBudgetAlert = (alert: BudgetAlert) => {
      if (alert.campaignId === campaignId) {
        setBudgetAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10
      }
    };

    socket.on('campaign:updated', handleCampaignUpdate);
    socket.on('lead:new', handleNewLead);
    socket.on('campaign:analytics', handleAnalytics);
    socket.on('campaign:budget_alert', handleBudgetAlert);

    return () => {
      socket.off('campaign:updated', handleCampaignUpdate);
      socket.off('lead:new', handleNewLead);
      socket.off('campaign:analytics', handleAnalytics);
      socket.off('campaign:budget_alert', handleBudgetAlert);
      unsubscribeFromCampaign(campaignId);
    };
  }, [socket, connected, campaignId, subscribeToCampaign, unsubscribeFromCampaign]);

  const clearNewLeads = useCallback(() => {
    setNewLeads([]);
  }, []);

  const clearBudgetAlerts = useCallback(() => {
    setBudgetAlerts([]);
  }, []);

  return {
    connected,
    campaignData,
    newLeads,
    analytics,
    budgetAlerts,
    clearNewLeads,
    clearBudgetAlerts,
  };
};

// Hook for all campaigns updates (for dashboards)
export const useAllCampaignsUpdates = () => {
  const { socket, connected } = useRealtimeUpdates();
  const [allCampaignUpdates, setAllCampaignUpdates] = useState<CampaignUpdate[]>([]);
  const [allNewLeads, setAllNewLeads] = useState<NewLeadNotification[]>([]);
  const [allAnalytics, setAllAnalytics] = useState<Map<number, CampaignAnalytics>>(new Map());
  const [allBudgetAlerts, setAllBudgetAlerts] = useState<BudgetAlert[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    // Listen for all campaign updates
    const handleCampaignUpdate = (data: CampaignUpdate) => {
      setAllCampaignUpdates(prev => [data, ...prev].slice(0, 100));
    };

    const handleNewLead = (notification: NewLeadNotification) => {
      setAllNewLeads(prev => [notification, ...prev].slice(0, 100));
    };

    const handleAnalytics = (update: CampaignAnalytics) => {
      setAllAnalytics(prev => {
        const newMap = new Map(prev);
        newMap.set(update.campaignId, update);
        return newMap;
      });
    };

    const handleBudgetAlert = (alert: BudgetAlert) => {
      setAllBudgetAlerts(prev => [alert, ...prev].slice(0, 50));
    };

    socket.on('campaign:updated', handleCampaignUpdate);
    socket.on('lead:new', handleNewLead);
    socket.on('campaign:analytics', handleAnalytics);
    socket.on('campaign:budget_alert', handleBudgetAlert);

    return () => {
      socket.off('campaign:updated', handleCampaignUpdate);
      socket.off('lead:new', handleNewLead);
      socket.off('campaign:analytics', handleAnalytics);
      socket.off('campaign:budget_alert', handleBudgetAlert);
    };
  }, [socket, connected]);

  return {
    connected,
    allCampaignUpdates,
    allNewLeads,
    allAnalytics,
    allBudgetAlerts,
  };
};
