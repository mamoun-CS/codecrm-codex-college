import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { CsvUploadController } from './csv-upload.controller';
import { CsvUploadService } from './csv-upload.service';
import { AdSpend } from '../entities/ad-spend.entity';
import { Campaign } from '../entities/campaigns.entity';
import { Lead } from '../entities/leads.entity';
import { BullModule } from '@nestjs/bullmq';
import { CsvUploadProcessor } from './csv-upload.processor';

const queueImports = process.env.REDIS_ENABLED === 'true'
  ? [
      BullModule.registerQueue({
        name: 'csv-upload',
      }),
    ]
  : [];

@Module({
  imports: [
    TypeOrmModule.forFeature([AdSpend, Campaign, Lead]),
    MulterModule.register({
      dest: './uploads',
    }),
    ...queueImports,
  ],
  controllers: [CsvUploadController],
  providers: [CsvUploadService, CsvUploadProcessor],
})
export class CsvUploadModule {}
