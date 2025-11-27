import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from '../entities/campaigns.entity';
import { AdSpend } from '../entities/ad-spend.entity';
import { AdSource } from '../entities/ad-sources.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, AdSpend, AdSource]),
    EventsModule, // Import EventsModule to access RealtimeGateway
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
