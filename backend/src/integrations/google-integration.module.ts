// src/integrations/google-integration.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../entities/integrations.entity';
import { GoogleIntegrationController } from './google-integration.controller';
import { GoogleIntegrationService } from './google-integration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration]),
  ],
  controllers: [GoogleIntegrationController],
  providers: [GoogleIntegrationService],
  exports: [GoogleIntegrationService],
})
export class GoogleIntegrationModule {}
