'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { LeadListItem } from '@/types/leads';
import { useRealtimeUpdates } from './useRealtimeUpdates';

interface LeadStreamOptions {
  debounceMs?: number;
  onInsert?: (leads: LeadListItem[]) => void;
  onUpdate?: (lead: LeadListItem) => void;
}

export const useLeadStream = ({
  debounceMs = 350,
  onInsert,
  onUpdate,
}: LeadStreamOptions) => {
  const { socket, connected } = useRealtimeUpdates();
  const bufferRef = useRef<LeadListItem[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (!bufferRef.current.length) {
      return;
    }
    onInsert?.(bufferRef.current);
    bufferRef.current = [];
    timerRef.current = null;
  }, [onInsert]);

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    const normalizeLead = (payload: any): LeadListItem | null => {
      if (!payload) {
        return null;
      }
      const raw = payload.lead ?? payload.data ?? payload;
      if (!raw?.id) {
        return null;
      }

      return {
        id: raw.id,
        name: raw.name ?? raw.full_name ?? 'بدون اسم',
        phone: raw.phone ?? null,
        status: raw.status ?? 'new',
        created_at: raw.created_at ?? new Date().toISOString(),
        team_id: raw.team_id ?? raw.teamId ?? raw.team?.id ?? null,
      };
    };

    const scheduleFlush = () => {
      if (timerRef.current) {
        return;
      }
      timerRef.current = setTimeout(flush, debounceMs);
    };

    const handleLeadNew = (message: any) => {
      const lead = normalizeLead(message);
      if (!lead) {
        return;
      }
      bufferRef.current = [lead, ...bufferRef.current.filter((item) => item.id !== lead.id)];
      scheduleFlush();
    };

    const handleLeadUpdated = (message: any) => {
      const lead = normalizeLead(message);
      if (!lead) {
        return;
      }
      onUpdate?.(lead);
    };

    const handleDisconnect = () => {
      bufferRef.current = [];
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    socket.on('lead:new', handleLeadNew);
    socket.on('lead:updated', handleLeadUpdated);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('lead:new', handleLeadNew);
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, connected, debounceMs, onUpdate, flush]);

  return { connected };
};
