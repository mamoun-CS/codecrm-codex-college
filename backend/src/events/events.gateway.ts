import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface ClientState {
  authenticated: boolean;
  userId?: number;
  role?: string;
  country?: string;
  email?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly connectedClients = new Map<string, ClientState>();
  private readonly throttleMap = new Map<string, number>();
  private static readonly EVENT_WINDOW_MS = 750;

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('Events gateway ready');
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token`);
      this.connectedClients.set(client.id, { authenticated: false });
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const state: ClientState = {
        authenticated: true,
        userId: payload.sub,
        role: payload.role,
        country: payload.country,
        email: payload.email,
      };
      this.connectedClients.set(client.id, state);

      client.join(`user:${payload.sub}`);
      client.join(`role:${payload.role}`);
      if (payload.country) {
        client.join(`country:${payload.country}`);
      }

      client.emit('connected', {
        message: 'Events stream connected',
        userId: payload.sub,
        role: payload.role,
        country: payload.country,
      });

      this.logger.log(
        `Client connected: ${client.id} | ${payload.email ?? payload.sub} (${payload.role})`,
      );
    } catch (error) {
      this.logger.error(`Token verification failed for ${client.id}: ${error.message}`);
      this.connectedClients.set(client.id, { authenticated: false });
    }
  }

  handleDisconnect(client: Socket) {
    const state = this.connectedClients.get(client.id);
    if (state?.authenticated) {
      this.logger.log(`Client disconnected: ${client.id} | ${state.email ?? state.userId}`);
    }
    this.connectedClients.delete(client.id);
  }

  broadcastLeadCreated(lead: any) {
    if (this.shouldThrottle(`lead:create:${lead.id}`)) {
      return;
    }

    const payload = {
      type: 'leadCreated',
      data: lead,
      timestamp: new Date(),
    };

    this.emitToCountry(lead.country, 'leadCreated:country', payload);
    this.emitToRoles(['sales', 'marketing', 'manager', 'admin'], 'leadCreated', payload);

    const notification = {
      type: 'new_lead',
      campaignId: lead.campaign_id ?? lead.campaign?.id ?? null,
      country: lead.country,
      lead,
      source: lead.source,
      timestamp: new Date(),
    };
    this.emitToRoles(['sales', 'marketing', 'manager', 'admin'], 'lead:new', notification);
  }

  broadcastLeadUpdated(lead: any) {
    if (this.shouldThrottle(`lead:update:${lead.id}`)) {
      return;
    }

    const payload = {
      type: 'leadUpdated',
      data: lead,
      timestamp: new Date(),
    };

    this.emitToCountry(lead.country, 'leadUpdated:country', payload);
    this.emitToRoles(['sales', 'manager', 'admin'], 'leadUpdated', payload);
  }

  broadcastLeadDeleted(leadId: number, country?: string) {
    const payload = {
      type: 'leadDeleted',
      data: { id: leadId },
      timestamp: new Date(),
    };

    this.emitToCountry(country, 'leadDeleted:country', payload);
    this.emitToRoles(['sales', 'manager', 'admin'], 'leadDeleted', payload);
  }

  broadcastCampaignCreated(campaign: any) {
    const payload = {
      type: 'campaignCreated',
      data: campaign,
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'campaignCreated', payload);
    this.emitToCountry(campaign.country, 'campaignCreated:country', payload);
  }

  broadcastCampaignUpdated(campaign: any) {
    const payload = {
      type: 'campaignUpdated',
      data: campaign,
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'campaignUpdated', payload);
    this.emitToCountry(campaign.country, 'campaignUpdated:country', payload);
  }

  broadcastCampaignDeleted(campaignId: number, country?: string) {
    const payload = {
      type: 'campaignDeleted',
      data: { id: campaignId },
      timestamp: new Date(),
    };

    this.emitToCountry(country, 'campaignDeleted:country', payload);
    this.emitToRoles(['marketing', 'manager', 'admin'], 'campaignDeleted', payload);
  }

  broadcastLandingPageCreated(landingPage: any) {
    const payload = {
      type: 'landingPageCreated',
      data: landingPage,
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'landingPageCreated', payload);
  }

  broadcastLandingPageUpdated(landingPage: any) {
    const payload = {
      type: 'landingPageUpdated',
      data: landingPage,
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'landingPageUpdated', payload);
  }

  broadcastLandingPageDeleted(landingPageId: number) {
    const payload = {
      type: 'landingPageDeleted',
      data: { id: landingPageId },
      timestamp: new Date(),
    };

    this.emitToRoles(['marketing', 'manager', 'admin'], 'landingPageDeleted', payload);
  }

  broadcastAnalyticsUpdated(analytics: any) {
    if (this.shouldThrottle('analytics:update')) {
      return;
    }

    const payload = {
      type: 'analyticsUpdated',
      data: analytics,
      timestamp: new Date(),
    };

    this.emitToRoles(['manager', 'marketing', 'admin'], 'analyticsUpdated', payload);
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  getAuthenticatedClientsCount() {
    return Array.from(this.connectedClients.values()).filter(client => client.authenticated).length;
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

  private emitToRoles(roles: string[], event: string, payload: any) {
    roles.forEach(role => this.server.to(`role:${role}`).emit(event, payload));
  }

  private emitToCountry(country: string | undefined, event: string, payload: any) {
    if (country) {
      this.server.to(`country:${country}`).emit(event, payload);
    }
  }

  private shouldThrottle(key: string) {
    const now = Date.now();
    const last = this.throttleMap.get(key) ?? 0;
    if (now - last < EventsGateway.EVENT_WINDOW_MS) {
      return true;
    }
    this.throttleMap.set(key, now);
    return false;
  }

  private extractToken(client: Socket) {
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.split(' ')[1];
    }
    return client.handshake.auth?.token;
  }
}
