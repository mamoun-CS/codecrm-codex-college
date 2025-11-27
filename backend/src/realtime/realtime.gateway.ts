import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: number;
  role: string;
  country?: string;
  email?: string;
  team_id?: number;
}

interface ClientMetadata extends JwtPayload {
  authenticated: boolean;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedClients = new Map<string, ClientMetadata>();
  private readonly emissionGuards = new Map<string, number>();
  private static readonly EVENT_THROTTLE_MS = 750;
  private static readonly SUBSCRIPTION_THROTTLE_MS = 1_000;

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      const payload = (await this.jwtService.verifyAsync(token)) as JwtPayload;
      this.connectedClients.set(client.id, { ...payload, authenticated: true });
      this.joinRooms(client, payload);

      this.logger.log(
        `Client connected: ${client.id} | User ${payload.email ?? payload.sub} | Role ${payload.role}`,
      );

      client.emit('connected', {
        message: 'Realtime connection established',
        userId: payload.sub,
        role: payload.role,
        country: payload.country,
      });
    } catch (error) {
      this.logger.error(`Connection rejected for ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const meta = this.connectedClients.get(client.id);
    if (meta) {
      this.logger.log(`Client disconnected: ${client.id} | User ${meta.email ?? meta.sub}`);
    }
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe:campaign')
  handleSubscribeCampaign(
    @MessageBody() data: { campaignId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.campaignId) {
      return { error: 'campaignId is required' };
    }

    if (this.shouldThrottle(`sub:${client.id}:${data.campaignId}`, RealtimeGateway.SUBSCRIPTION_THROTTLE_MS)) {
      return { error: 'Subscription throttled' };
    }

    client.join(`campaign:${data.campaignId}`);
    return { success: true };
  }

  @SubscribeMessage('unsubscribe:campaign')
  handleUnsubscribeCampaign(
    @MessageBody() data: { campaignId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.campaignId) {
      return { error: 'campaignId is required' };
    }

    client.leave(`campaign:${data.campaignId}`);
    return { success: true };
  }

  emitLeadCreated(lead: any) {
    this.broadcastNewLead(
      lead.campaign_id ?? lead.campaign?.id ?? null,
      lead.country ?? 'unknown',
      lead,
    );
  }

  broadcastCampaignUpdate(campaignId: number, country: string, data: any) {
    const payload = { ...data, timestamp: new Date() };
    this.server.to(`campaign:${campaignId}`).emit('campaign:updated', payload);
    if (country) {
      this.server.to(`country:${country}`).emit('campaign:updated', payload);
    }
    this.emitToRoles(['manager', 'marketing', 'admin'], 'campaign:updated', payload);
  }

  broadcastNewLead(campaignId: number | null | undefined, country: string, leadData: any) {
    const throttleKey = `lead:new:${leadData.id}`;
    if (this.shouldThrottle(throttleKey)) {
      return;
    }

    const notification = {
      type: 'new_lead',
      campaignId: campaignId ?? null,
      country,
      lead: leadData,
      timestamp: new Date(),
    };

    if (campaignId) {
      this.server.to(`campaign:${campaignId}`).emit('lead:new', notification);
    }

    if (country) {
      this.server.to(`country:${country}`).emit('lead:new', notification);
    }

    const teamIds = this.extractLeadTeamIds(leadData);
    this.emitToTeams(teamIds, 'lead:new', notification);

    if (leadData.owner_user_id) {
      this.broadcastToUser(leadData.owner_user_id, 'lead:new', notification);
    }
    if (leadData.transfer_to_user_id) {
      this.broadcastToUser(leadData.transfer_to_user_id, 'lead:new', notification);
    }

    this.emitToRoles(['manager', 'admin', 'super_admin'], 'lead:new', notification);
  }

  broadcastCampaignAnalytics(campaignId: number, country: string, analytics: any) {
    const throttleKey = `campaign:analytics:${campaignId}`;
    if (this.shouldThrottle(throttleKey)) {
      return;
    }

    const payload = {
      campaignId,
      country,
      analytics,
      timestamp: new Date(),
    };

    this.server.to(`campaign:${campaignId}`).emit('campaign:analytics', payload);
    if (country) {
      this.server.to(`country:${country}`).emit('campaign:analytics', payload);
    }
    this.emitToRoles(['manager', 'marketing'], 'campaign:analytics', payload);
  }

  broadcastBudgetAlert(campaignId: number, country: string, alertData: any) {
    const payload = {
      type: 'budget_alert',
      campaignId,
      country,
      ...alertData,
      timestamp: new Date(),
    };

    this.server.to(`campaign:${campaignId}`).emit('campaign:budget_alert', payload);
    if (country) {
      this.server.to(`country:${country}`).emit('campaign:budget_alert', payload);
    }
    this.emitToRoles(['manager', 'admin'], 'campaign:budget_alert', payload);
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  getClientsByRole(role: string) {
    return Array.from(this.connectedClients.values()).filter(client => client.role === role).length;
  }

  broadcastToUser(userId: number, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  broadcastToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  broadcastToCountry(country: string, event: string, data: any) {
    if (country) {
      this.server.to(`country:${country}`).emit(event, data);
    }
  }

  broadcastLeadUpdate(leadId: number, country: string, leadData: any) {
    const throttleKey = `lead:update:${leadId}`;
    if (this.shouldThrottle(throttleKey)) {
      return;
    }

    const payload = {
      leadId,
      country,
      lead: leadData,
      timestamp: new Date(),
    };

    if (country) {
      this.server.to(`country:${country}`).emit('lead:updated', payload);
    }

    this.emitToTeams(this.extractLeadTeamIds(leadData), 'lead:updated', payload);

    if (leadData.owner_user_id) {
      this.broadcastToUser(leadData.owner_user_id, 'lead:updated', payload);
    }
    if (leadData.transfer_to_user_id) {
      this.broadcastToUser(leadData.transfer_to_user_id, 'lead:updated', payload);
    }

    this.emitToRoles(['manager', 'admin', 'super_admin'], 'lead:updated', payload);
  }

  broadcastUserActivity(userId: number, country: string, activityData: any) {
    const payload = {
      userId,
      country,
      activity: activityData,
      timestamp: new Date(),
    };

    this.emitToRoles(['manager', 'admin'], 'user:activity', payload);
    if (country) {
      this.server.to(`country:${country}`).emit('user:activity', payload);
    }
  }

  broadcastTaskUpdate(taskId: number, leadId: number, country: string, taskData: any) {
    const payload = {
      taskId,
      leadId,
      country,
      task: taskData,
      timestamp: new Date(),
    };

    if (country) {
      this.server.to(`country:${country}`).emit('task:updated', payload);
    }
    this.emitToRoles(['sales', 'manager'], 'task:updated', payload);
  }

  broadcastMeetingUpdate(meetingId: number, leadId: number, country: string, meetingData: any) {
    const throttleKey = `meeting:${meetingId}`;
    if (this.shouldThrottle(throttleKey)) {
      return;
    }

    const payload = {
      meetingId,
      leadId,
      country,
      meeting: meetingData,
      timestamp: new Date(),
    };

    if (country) {
      this.server.to(`country:${country}`).emit('meeting:updated', payload);
    }
    this.emitToRoles(['sales', 'manager'], 'meeting:updated', payload);
  }

  broadcastPriceOfferUpdate(offerId: number, leadId: number, country: string, offerData: any) {
    const payload = {
      offerId,
      leadId,
      country,
      offer: offerData,
      timestamp: new Date(),
    };

    if (country) {
      this.server.to(`country:${country}`).emit('price_offer:updated', payload);
    }
    this.emitToRoles(['sales', 'manager'], 'price_offer:updated', payload);
  }

  broadcastLandingPageUpdate(pageId: number, campaignId: number, country: string, pageData: any) {
    const payload = {
      pageId,
      campaignId,
      country,
      page: pageData,
      timestamp: new Date(),
    };

    this.server.to(`campaign:${campaignId}`).emit('landing_page:updated', payload);
    this.emitToRoles(['marketing', 'manager'], 'landing_page:updated', payload);
    if (country) {
      this.server.to(`country:${country}`).emit('landing_page:updated', payload);
    }
  }

  broadcastEntityUpdate(entityType: string, entityId: number, country: string, data: any) {
    const payload = {
      entityType,
      entityId,
      country,
      data,
      timestamp: new Date(),
    };

    const eventName = `${entityType}:updated`;
    if (country) {
      this.server.to(`country:${country}`).emit(eventName, payload);
    }
    this.emitToRoles(['manager', 'admin'], eventName, payload);

    switch (entityType) {
      case 'lead':
      case 'task':
      case 'meeting':
      case 'price_offer':
        this.emitToRoles(['sales'], eventName, payload);
        break;
      case 'campaign':
      case 'landing_page':
      case 'ad_spend':
        this.emitToRoles(['marketing'], eventName, payload);
        break;
    }
  }

  broadcastLandingPageVisit(campaign: string, data: any) {
    const payload = {
      type: 'landing_page_visit',
      campaign,
      data,
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'landing_page_visit', payload);
  }

  broadcastLandingPageSubmit(campaign: string, data: any) {
    const payload = {
      type: 'landing_page_submit',
      campaign,
      data,
      timestamp: new Date(),
    };

    this.emitToRoles(['sales', 'marketing', 'manager', 'admin'], 'landing_page_submit', payload);
  }

  private extractToken(client: Socket) {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return client.handshake.auth?.token;
  }

  private joinRooms(client: Socket, payload: JwtPayload) {
    client.join(`user:${payload.sub}`);
    client.join(`role:${payload.role}`);
    if (payload.country) {
      client.join(`country:${payload.country}`);
    }
    if (payload.team_id) {
      client.join(`team:${payload.team_id}`);
    }
  }

  private emitToRoles(roles: string[], event: string, payload: any) {
    roles.forEach(role => this.server.to(`role:${role}`).emit(event, payload));
  }

  private emitToTeams(teamIds: number[], event: string, payload: any) {
    teamIds.forEach((teamId) => {
      if (typeof teamId === 'number') {
        this.server.to(`team:${teamId}`).emit(event, payload);
      }
    });
  }

  private extractLeadTeamIds(leadData: any): number[] {
    if (!leadData) {
      return [];
    }
    const candidates = [
      leadData.team_id,
      leadData.teamId,
      leadData.team?.id,
      leadData.owner?.team_id,
      leadData.owner?.team?.id,
    ];
    return Array.from(
      new Set(
        candidates.filter((teamId): teamId is number => typeof teamId === 'number'),
      ),
    );
  }

  private shouldThrottle(key: string, windowMs = RealtimeGateway.EVENT_THROTTLE_MS) {
    const now = Date.now();
    const last = this.emissionGuards.get(key) ?? 0;
    if (now - last < windowMs) {
      return true;
    }
    this.emissionGuards.set(key, now);
    return false;
  }
}
