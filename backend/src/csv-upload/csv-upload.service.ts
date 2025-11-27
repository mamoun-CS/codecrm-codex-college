import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { readFile, unlink } from 'node:fs/promises';
import { CsvUploadProcessor } from './csv-upload.processor';

interface CsvJobPayload {
  file: string;
  filename: string;
  mimetype: string;
  userId: number;
}

@Injectable()
export class CsvUploadService {
  private readonly logger = new Logger(CsvUploadService.name);

  private queueEventsPromise: Promise<QueueEvents> | null = null;

  constructor(
    @Optional()
    @InjectQueue('csv-upload')
    private readonly csvQueue: Queue | undefined,
    private readonly csvUploadProcessor: CsvUploadProcessor,
  ) {}

  async processSpendDataCSV(file: Express.Multer.File, user: any) {
    return this.enqueueAndAwait('process-spend', file, user);
  }

  async processLeadsCSV(file: Express.Multer.File, user: any) {
    return this.enqueueAndAwait('process-leads', file, user);
  }

  private async enqueueAndAwait(jobName: string, file: Express.Multer.File, user: any) {
    const buffer = await this.resolveFileBuffer(file);
    const payload: CsvJobPayload = {
      file: buffer.toString('base64'),
      filename: file.originalname,
      mimetype: file.mimetype,
      userId: user?.id ?? 0,
    };

    if (!this.csvQueue) {
      this.logger.warn(`Queue unavailable, processing ${jobName} inline`);
      return this.csvUploadProcessor.processInline(jobName, payload);
    }

    this.logger.log(`Queueing ${jobName} for ${file.originalname}`);

    const job = await this.csvQueue.add(jobName, payload, {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    const queueEvents = await this.getQueueEvents();
    const result = await job.waitUntilFinished(queueEvents, 180_000);

    return {
      jobId: job.id,
      ...result,
    };
  }

  private async getQueueEvents(): Promise<QueueEvents> {
    if (!this.csvQueue) {
      throw new Error('Queue events requested without queue connection');
    }

    if (!this.queueEventsPromise) {
      this.queueEventsPromise = (async () => {
        const connection = (this.csvQueue as any).opts?.connection;
        const events = new QueueEvents('csv-upload', { connection });
        events.on('error', (error) => this.logger.error('QueueEvents error', error));
        await events.waitUntilReady();
        return events;
      })();
    }

    return this.queueEventsPromise;
  }

  private async resolveFileBuffer(file: Express.Multer.File): Promise<Buffer> {
    if (!file) {
      throw new Error('No file provided for CSV processing');
    }

    if (file.buffer) {
      return file.buffer;
    }

    if (file.path) {
      const contents = await readFile(file.path);
      // Clean up temp file if Multer stored it on disk
      try {
        await unlink(file.path);
      } catch (error) {
        this.logger.warn(`Failed to clean up uploaded file ${file.path}: ${error}`);
      }
      return contents;
    }

    throw new Error('Uploaded file is missing data buffer');
  }
}
