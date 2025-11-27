// src/integrations/meta-integration.module.ts
import { Module } from '@nestjs/common';
import { MetaIntegrationController } from './meta-integration.controller';
import { MetaIntegrationService } from './meta-integration.service';

@Module({
  controllers: [MetaIntegrationController],
  providers: [MetaIntegrationService],
  exports: [MetaIntegrationService],
})
export class MetaIntegrationModule {}
