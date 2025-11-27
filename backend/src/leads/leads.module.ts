import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PublicLeadsController } from './public-leads.controller';
import { Lead } from '../entities/leads.entity';
import { User } from '../entities/user.entity';
import { Campaign } from '../entities/campaigns.entity';
import { File } from '../entities/files.entity';
import { PriceOffer } from '../entities/price-offers.entity';
import { Meeting } from '../entities/meetings.entity';
import { Message } from '../entities/messages.entity';
import { LeadNote } from '../entities/lead-notes.entity';
import { Activity } from '../entities/activities.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { EventsModule } from '../events/events.module';
import { RecaptchaModule } from '../common/recaptcha/recaptcha.module';
import { LeadsQueryService } from './leads-query.service';
import { LeadStatusMapperService } from './lead-status-mapper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      User,
      Campaign,
      File,
      PriceOffer,
      Meeting,
      Message,
      LeadNote,
      Activity,
    ]),
    RealtimeModule,
    EventsModule,
    RecaptchaModule,
  ],
  controllers: [LeadsController, PublicLeadsController],
  providers: [LeadsService, LeadsQueryService, LeadStatusMapperService],
  exports: [LeadsService],
})
export class LeadsModule {}
