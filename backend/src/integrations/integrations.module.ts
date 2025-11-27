import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { FacebookIntegrationService } from './facebook-integration.service';
import { Lead } from '../entities/leads.entity';
import { Campaign } from '../entities/campaigns.entity';
import { AdSource } from '../entities/ad-sources.entity';
import { Integration, TikTokIntegration } from '../entities/integrations.entity';
import { User } from '../entities/user.entity';
import { File } from '../entities/files.entity';
import { PriceOffer } from '../entities/price-offers.entity';
import { Meeting } from '../entities/meetings.entity';
import { Message } from '../entities/messages.entity';
import { LeadNote } from '../entities/lead-notes.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { EventsModule } from '../events/events.module';
import { Website } from '../entities/integrations.entity';
import { LeadsModule } from '../leads/leads.module';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Campaign,
      AdSource,
      Integration,
      TikTokIntegration,
      User,
      File,
      PriceOffer,
      Meeting,
      Message,
      LeadNote,
      Website,
    ]),
    RealtimeModule,
    EventsModule,
    LeadsModule,
  ],
  controllers: [IntegrationsController, SyncController],
  providers: [
    IntegrationsService,
    FacebookIntegrationService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
