import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioSettingsController } from './twilio-settings.controller';
import { TwilioSettingsService } from './twilio-settings.service';
import { TwilioSetting } from '../entities/twilio-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TwilioSetting])],
  controllers: [TwilioSettingsController],
  providers: [TwilioSettingsService],
  exports: [TwilioSettingsService],
})
export class TwilioSettingsModule {}
