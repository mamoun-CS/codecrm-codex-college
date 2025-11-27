import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { redisStore } from 'cache-manager-redis-yet';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { LeadNotesModule } from './lead-notes/lead-notes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ActivityModule } from './activity/activity.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { MessagesModule } from './messages/messages.module';
import { LandingPagesModule } from './landing-pages/landing-pages.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { GoogleIntegrationModule } from './integrations/google-integration.module';
import { MetaIntegrationModule } from './integrations/meta-integration.module';
import { FacebookIntegrationModule } from './integrations/facebook-integration.module';
import { TikTokIntegrationModule } from './integrations/tiktok-integration.module';
import { DealsModule } from './deals/deals.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CsvUploadModule } from './csv-upload/csv-upload.module';
import { CallsModule } from './calls/calls.module';
import { TwilioSettingsModule } from './twilio-settings/twilio-settings.module';
import { EventsModule } from './events/events.module';
import { RealtimeModule } from './realtime/realtime.module';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const enabled = redisEnabled && !!config.get<string>('REDIS_HOST');
        if (!enabled) {
          return {
            ttl: 30,
            max: 1000,
          };
        }

        const host = config.get<string>('REDIS_HOST') as string;
        const port = parseInt(config.get<string>('REDIS_PORT', '6379'), 10);
        const password = config.get<string>('REDIS_PASSWORD') || undefined;

        return {
          store: await redisStore({
            socket: { host, port },
            password,
            ttl: 30,
          }),
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 120,
      },
    ]),
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
              connection: {
                host: config.get<string>('REDIS_HOST', '127.0.0.1'),
                port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
                password: config.get<string>('REDIS_PASSWORD') || undefined,
              },
            }),
          }),
        ]
      : []),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST');
        const redisPort = parseInt(config.get<string>('REDIS_PORT', '6379'), 10);
        const redisPassword = config.get<string>('REDIS_PASSWORD') || undefined;
        const cacheEnabled = redisEnabled && !!redisHost;

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'password'),
          database: config.get<string>('DB_NAME', 'crm_db'),
          entities: [__dirname + '/entities/**/*.entity.{ts,js}'],
          autoLoadEntities: true,
          synchronize: false,
          migrationsRun: true,
          logging: ['error', 'warn'],
          maxQueryExecutionTime: 500,

          // ============================================
          // PERFORMANCE OPTIMIZATION: Connection Pooling
          // ============================================
          // Optimized for 10,000+ concurrent users
          extra: {
            // Maximum number of clients in the pool
            max: 100,
            // Minimum number of clients in the pool
            min: 10,
            // Maximum time (ms) a client can be idle before being closed
            idleTimeoutMillis: 30000,
            // Maximum time (ms) to wait for a connection
            connectionTimeoutMillis: 5000,
            // Statement timeout (ms) - kills long-running queries
            statement_timeout: 10000,
            // Query timeout (ms)
            query_timeout: 10000,
            // Enable connection pooling metrics
            application_name: 'crm_backend',
          },

          // ============================================
          // PERFORMANCE OPTIMIZATION: Query Caching
          // ============================================
          cache: cacheEnabled
            ? {
                type: 'redis',
                options: {
                  host: redisHost,
                  port: redisPort,
                  password: redisPassword,
                },
                // Cache duration: 10 seconds for hot data
                duration: 10_000,
                // Ignore errors to prevent cache failures from breaking queries
                ignoreErrors: true,
              }
            : false,
        };
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '24h') },
      }),
    }),
    AuthModule,
    UsersModule,
    LeadsModule,
    LeadNotesModule,
    AnalyticsModule,
    ActivityModule,
    EventsModule,
    RealtimeModule,
    CampaignsModule,
    MessagesModule,
    LandingPagesModule,
    IntegrationsModule,
    GoogleIntegrationModule,
    MetaIntegrationModule,
    FacebookIntegrationModule,
    TikTokIntegrationModule,
    DealsModule,
    DashboardModule,
    CsvUploadModule,
    CallsModule,
    TwilioSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
