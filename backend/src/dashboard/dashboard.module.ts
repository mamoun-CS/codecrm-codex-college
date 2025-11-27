import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../entities/user.entity';
import { Deal } from '../entities/deals.entity';
import { Lead } from '../entities/leads.entity';
import { Campaign } from '../entities/campaigns.entity';
import { AdSpend } from '../entities/ad-spend.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Deal, Lead, Campaign, AdSpend])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
