import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { Lead } from '../entities/leads.entity';
import { User } from '../entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { TwilioSettingsModule } from '../twilio-settings/twilio-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([Lead, User]),
    TwilioSettingsModule,
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
