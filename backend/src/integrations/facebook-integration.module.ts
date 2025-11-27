import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../entities/integrations.entity';
import { Lead } from '../entities/leads.entity';
import { FacebookIntegrationController } from './facebook-integration.controller';
import { FacebookIntegrationService } from './facebook-integration.service';
import { IntegrationsModule } from './integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, Lead]),
    IntegrationsModule, // reuse core integration logic for lead creation/subscription helpers
  ],
  controllers: [FacebookIntegrationController],
  providers: [FacebookIntegrationService],
  exports: [FacebookIntegrationService],
})
export class FacebookIntegrationModule {}
