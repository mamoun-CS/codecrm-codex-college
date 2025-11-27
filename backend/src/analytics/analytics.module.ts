import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Lead } from '../entities/leads.entity';
import { Deal } from '../entities/deals.entity';
import { AdSpend } from '../entities/ad-spend.entity';
import { Campaign } from '../entities/campaigns.entity';
import { User } from '../entities/user.entity';
import { LeadTouchpoint } from '../entities/activities.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Deal, AdSpend, Campaign, User, LeadTouchpoint])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
