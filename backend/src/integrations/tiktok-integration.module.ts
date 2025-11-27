// src/integrations/tiktok-integration.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TikTokIntegrationController } from './tiktok-integration.controller';
import { TikTokIntegrationService } from './tiktok-integration.service';
import { TikTokIntegration } from '../entities/integrations.entity';
import { IntegrationsModule } from './integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TikTokIntegration]),
    IntegrationsModule,
  ],
  controllers: [TikTokIntegrationController],
  providers: [TikTokIntegrationService],
  exports: [TikTokIntegrationService],
})
export class TikTokIntegrationModule {}
