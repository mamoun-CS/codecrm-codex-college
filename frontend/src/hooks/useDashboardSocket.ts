import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../components/SocketProvider';
import toast from 'react-hot-toast';

interface DashboardSocketConfig {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: Date;
  eventName: string;
}

export const useDashboardSocket = (config: DashboardSocketConfig = {}) => {
  const { socket: globalSocket, isConnected } = useSocket();
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    if (!globalSocket) {
      setError('Global socket not available');
      return;
    }


    // Set up event listeners on the global socket
    const handleLandingPageUpdated = (data: any) => {
      setLastEvent({
        type: 'landing_page',
        data,
        timestamp: new Date(),
        eventName: 'landing_page:updated'
      });

      const action = data.page?.deleted ? 'deleted' : data.page?.created ? 'created' : 'updated';
      toast(`Landing page ${action}: ${data.page?.title || 'Unknown'}`, {
        duration: 4000,
        icon: '📄',
      });
    };

    const handleLeadUpdated = (data: any) => {
      setLastEvent({
        type: 'lead',
        data,
        timestamp: new Date(),
        eventName: 'lead:updated'
      });

      const lead = data.lead;
      const statusChange = lead?.status ? ` → ${lead.status}` : '';
      toast.success(`Lead updated: ${lead?.name || 'Unknown'}${statusChange}`, {
        duration: 4000,
        icon: '👤',
      });
    };

    const handleCampaignUpdated = (data: any) => {
      setLastEvent({
        type: 'campaign',
        data,
        timestamp: new Date(),
        eventName: 'campaign:updated'
      });

      const campaign = data.data || data;
      const action = campaign?.deleted ? 'deleted' : campaign?.created ? 'created' : 'updated';
      toast(`Campaign ${action}: ${campaign?.name || 'Unknown'}`, {
        duration: 4000,
        icon: '📊',
      });
    };

    const handleNewLead = (data: any) => {
      setLastEvent({
        type: 'new_lead',
        data,
        timestamp: new Date(),
        eventName: 'lead:new'
      });

      toast.success(`New lead: ${data.lead?.name || 'Unknown'}`, {
        duration: 5000,
        icon: '🎯',
      });
    };

    const handleUserActivity = (data: any) => {
      setLastEvent({
        type: 'user_activity',
        data,
        timestamp: new Date(),
        eventName: 'user:activity'
      });

      const activity = data.activity;
      toast(`User activity: ${activity?.description || 'Unknown action'}`, {
        duration: 3000,
        icon: '👤',
      });
    };

    const handleTaskUpdated = (data: any) => {
      setLastEvent({
        type: 'task',
        data,
        timestamp: new Date(),
        eventName: 'task:updated'
      });

      const task = data.task;
      toast(`Task updated: ${task?.title || 'Unknown'}`, {
        duration: 3000,
        icon: '📋',
      });
    };

    const handleMeetingUpdated = (data: any) => {
      setLastEvent({
        type: 'meeting',
        data,
        timestamp: new Date(),
        eventName: 'meeting:updated'
      });

      const meeting = data.meeting;
      toast(`Meeting updated: ${meeting?.title || 'Unknown'}`, {
        duration: 3000,
        icon: '📅',
      });
    };

    const handlePriceOfferUpdated = (data: any) => {
      setLastEvent({
        type: 'price_offer',
        data,
        timestamp: new Date(),
        eventName: 'price_offer:updated'
      });

      toast(`Price offer updated`, {
        duration: 3000,
        icon: '💰',
      });
    };

    const handleBudgetAlert = (data: any) => {
      setLastEvent({
        type: 'budget_alert',
        data,
        timestamp: new Date(),
        eventName: 'campaign:budget_alert'
      });

      const alert = data;
      const alertType = alert.threshold === 'exceeded' ? 'error' : 'warning';
      const toastFn = alertType === 'error' ? toast.error : toast;

      toastFn(`Budget alert: ${alert.budget ? `$${alert.spent}/${alert.budget}` : 'Check campaign budget'}`, {
        duration: 6000,
        icon: '⚠️',
      });
    };

    const handleLandingPageSubmit = (data: any) => {
      setLastEvent({
        type: 'landing_page_submit',
        data,
        timestamp: new Date(),
        eventName: 'landing_page_submit'
      });

      const leadData = data.leadData || data.data?.leadData;
      toast.success(`New lead from landing page: ${leadData?.full_name || 'Unknown'}`, {
        duration: 5000,
        icon: '📝',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    // Events Gateway listeners
    const handleLeadCreated = (event: any) => {
      setLastEvent({
        type: 'lead_created',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'leadCreated'
      });

      toast.success(`New lead: ${event.data.full_name || 'Unknown'}`, {
        duration: 4000,
        icon: '👤',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleLeadUpdatedEG = (event: any) => {
      setLastEvent({
        type: 'lead_updated',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'leadUpdated'
      });

      toast(`Lead updated: ${event.data.full_name || 'Unknown'}`, {
        duration: 3000,
        icon: '✏️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleLeadDeleted = (event: any) => {
      setLastEvent({
        type: 'lead_deleted',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'leadDeleted'
      });

      toast.error(`Lead deleted (ID: ${event.data.id})`, {
        duration: 3000,
        icon: '🗑️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleCampaignCreated = (event: any) => {
      setLastEvent({
        type: 'campaign_created',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'campaignCreated'
      });

      toast.success(`New campaign: ${event.data.name || 'Unknown'}`, {
        duration: 4000,
        icon: '📊',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleCampaignUpdatedEG = (event: any) => {
      setLastEvent({
        type: 'campaign_updated',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'campaignUpdated'
      });

      toast(`Campaign updated: ${event.data.name || 'Unknown'}`, {
        duration: 3000,
        icon: '✏️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleCampaignDeleted = (event: any) => {
      setLastEvent({
        type: 'campaign_deleted',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'campaignDeleted'
      });

      toast.error(`Campaign deleted (ID: ${event.data.id})`, {
        duration: 3000,
        icon: '🗑️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleLandingPageCreated = (event: any) => {
      setLastEvent({
        type: 'landing_page_created',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'landingPageCreated'
      });

      toast.success(`New landing page created`, {
        duration: 4000,
        icon: '🌐',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleLandingPageUpdatedEG = (event: any) => {
      setLastEvent({
        type: 'landing_page_updated',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'landingPageUpdated'
      });

      toast(`Landing page updated`, {
        duration: 3000,
        icon: '✏️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleLandingPageDeleted = (event: any) => {
      setLastEvent({
        type: 'landing_page_deleted',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'landingPageDeleted'
      });

      toast.error(`Landing page deleted (ID: ${event.data.id})`, {
        duration: 3000,
        icon: '🗑️',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    const handleAnalyticsUpdated = (event: any) => {
      setLastEvent({
        type: 'analytics_updated',
        data: event.data,
        timestamp: new Date(event.timestamp),
        eventName: 'analyticsUpdated'
      });

      toast.success('Analytics refreshed', {
        duration: 2000,
        icon: '📈',
      });

      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    };

    // Attach all event listeners to the global socket
    globalSocket.on('landing_page:updated', handleLandingPageUpdated);
    globalSocket.on('lead:updated', handleLeadUpdated);
    globalSocket.on('campaign:updated', handleCampaignUpdated);
    globalSocket.on('lead:new', handleNewLead);
    globalSocket.on('user:activity', handleUserActivity);
    globalSocket.on('task:updated', handleTaskUpdated);
    globalSocket.on('meeting:updated', handleMeetingUpdated);
    globalSocket.on('price_offer:updated', handlePriceOfferUpdated);
    globalSocket.on('campaign:budget_alert', handleBudgetAlert);

    // Landing page submit events
    globalSocket.on('landing_page_submit', handleLandingPageSubmit);
    globalSocket.on('landing_page_submit:sales', handleLandingPageSubmit);
    globalSocket.on('landing_page_submit:marketing', handleLandingPageSubmit);
    globalSocket.on('landing_page_submit:manager', handleLandingPageSubmit);
    globalSocket.on('landing_page_submit:admin', handleLandingPageSubmit);

    globalSocket.on('leadCreated', handleLeadCreated);
    globalSocket.on('leadUpdated', handleLeadUpdatedEG);
    globalSocket.on('leadDeleted', handleLeadDeleted);
    globalSocket.on('campaignCreated', handleCampaignCreated);
    globalSocket.on('campaignUpdated', handleCampaignUpdatedEG);
    globalSocket.on('campaignDeleted', handleCampaignDeleted);
    globalSocket.on('landingPageCreated', handleLandingPageCreated);
    globalSocket.on('landingPageUpdated', handleLandingPageUpdatedEG);
    globalSocket.on('landingPageDeleted', handleLandingPageDeleted);
    globalSocket.on('analyticsUpdated', handleAnalyticsUpdated);

    // Cleanup function
    return () => {
      globalSocket.off('landing_page:updated', handleLandingPageUpdated);
      globalSocket.off('lead:updated', handleLeadUpdated);
      globalSocket.off('campaign:updated', handleCampaignUpdated);
      globalSocket.off('lead:new', handleNewLead);
      globalSocket.off('user:activity', handleUserActivity);
      globalSocket.off('task:updated', handleTaskUpdated);
      globalSocket.off('meeting:updated', handleMeetingUpdated);
      globalSocket.off('price_offer:updated', handlePriceOfferUpdated);
      globalSocket.off('campaign:budget_alert', handleBudgetAlert);

      // Landing page submit events cleanup
      globalSocket.off('landing_page_submit', handleLandingPageSubmit);
      globalSocket.off('landing_page_submit:sales', handleLandingPageSubmit);
      globalSocket.off('landing_page_submit:marketing', handleLandingPageSubmit);
      globalSocket.off('landing_page_submit:manager', handleLandingPageSubmit);
      globalSocket.off('landing_page_submit:admin', handleLandingPageSubmit);

      globalSocket.off('leadCreated', handleLeadCreated);
      globalSocket.off('leadUpdated', handleLeadUpdatedEG);
      globalSocket.off('leadDeleted', handleLeadDeleted);
      globalSocket.off('campaignCreated', handleCampaignCreated);
      globalSocket.off('campaignUpdated', handleCampaignUpdatedEG);
      globalSocket.off('campaignDeleted', handleCampaignDeleted);
      globalSocket.off('landingPageCreated', handleLandingPageCreated);
      globalSocket.off('landingPageUpdated', handleLandingPageUpdatedEG);
      globalSocket.off('landingPageDeleted', handleLandingPageDeleted);
      globalSocket.off('analyticsUpdated', handleAnalyticsUpdated);
    };
  }, [globalSocket]);

  const refreshDashboardData = useCallback(() => {
    // Trigger a custom event that dashboard components can listen to
    window.dispatchEvent(new CustomEvent('dashboard:refresh'));
  }, []);

  // Auto-refresh dashboard data when events occur
  useEffect(() => {
    if (lastEvent) {
      refreshDashboardData();
    }
  }, [lastEvent, refreshDashboardData]);

  return {
    socket: globalSocket,
    connected: isConnected,
    error,
    lastEvent,
    refreshDashboardData,
  };
};