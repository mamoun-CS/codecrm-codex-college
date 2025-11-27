import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface CampaignSubscription {
  campaignId: number;
  userId: number;
  role: string;
  country?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RealtimeGateway');
  private campaignSubscriptions: Map<string, CampaignSubscription> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up subscriptions for this client
    for (const [key, subscription] of this.campaignSubscriptions.entries()) {
      if (key.startsWith(`${client.id}:`)) {
        this.campaignSubscriptions.delete(key);
      }
    }
  }

  @SubscribeMessage('subscribe:campaign')
  handleSubscribeCampaign(
    @MessageBody() data: { campaignId: number; userId: number; role: string; country?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const subscriptionKey = `${client.id}:${data.campaignId}`;
    this.campaignSubscriptions.set(subscriptionKey, data);
    client.join(`campaign:${data.campaignId}`);
    this.logger.log(`Client ${client.id} subscribed to campaign ${data.campaignId}`);
    return { event: 'subscribed', campaignId: data.campaignId };
  }

  @SubscribeMessage('unsubscribe:campaign')
  handleUnsubscribeCampaign(
    @MessageBody() data: { campaignId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const subscriptionKey = `${client.id}:${data.campaignId}`;
    this.campaignSubscriptions.delete(subscriptionKey);
    client.leave(`campaign:${data.campaignId}`);
    this.logger.log(`Client ${client.id} unsubscribed from campaign ${data.campaignId}`);
    return { event: 'unsubscribed', campaignId: data.campaignId };
  }

  // Method to emit campaign updates to subscribed clients
  emitCampaignUpdate(campaignId: number, data: any) {
    this.server.to(`campaign:${campaignId}`).emit('campaign:update', {
      campaignId,
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted campaign update for campaign ${campaignId}`);
  }

  // Method to emit lead updates to campaign subscribers
  emitLeadUpdate(campaignId: number, leadData: any) {
    this.server.to(`campaign:${campaignId}`).emit('lead:new', {
      campaignId,
      lead: leadData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted new lead for campaign ${campaignId}`);
  }

  // Method to emit analytics updates
  emitAnalyticsUpdate(campaignId: number, analyticsData: any) {
    this.server.to(`campaign:${campaignId}`).emit('analytics:update', {
      campaignId,
      analytics: analyticsData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted analytics update for campaign ${campaignId}`);
  }
}
