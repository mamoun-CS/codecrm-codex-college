import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPagesController, PublicLandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';
import { LandingPage } from '../entities/landing-pages.entity';
import { Campaign } from '../entities/campaigns.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage, Campaign]), EventsModule],
  controllers: [LandingPagesController, PublicLandingPagesController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
