import { Logger, ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const port = parseInt(configService.get<string>('PORT', '3001'), 10);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : [/localhost:\d+$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.GET },
    ],
  });
  app.enableShutdownHooks();

  const startServer = async (startPort: number, attempt = 0): Promise<void> => {
    try {
      await app.listen(startPort, '0.0.0.0');
      logger.log(`✅ Backend ready on port ${startPort}`);
    } catch (error: any) {
      if (error?.code === 'EADDRINUSE' && attempt < 5) {
        const nextPort = startPort + 1;
        logger.warn(`Port ${startPort} in use, retrying on ${nextPort}`);
        await startServer(nextPort, attempt + 1);
        return;
      }
      throw error;
    }
  };

  await startServer(port);
}

bootstrap();
