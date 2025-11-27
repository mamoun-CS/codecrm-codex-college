import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * PERFORMANCE MONITORING INTERCEPTOR
 * 
 * Tracks request performance metrics and logs slow requests
 * 
 * FEATURES:
 * - Request duration tracking
 * - Slow request detection (>100ms warning, >500ms error)
 * - Memory usage monitoring
 * - Request/response size tracking
 * 
 * USAGE:
 * Apply globally in main.ts or per-controller
 */
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceMonitor');
  private readonly SLOW_REQUEST_THRESHOLD = 100; // ms
  private readonly VERY_SLOW_REQUEST_THRESHOLD = 500; // ms

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const endMemory = process.memoryUsage().heapUsed;
          const memoryDelta = endMemory - startMemory;

          // Log slow requests
          if (duration > this.VERY_SLOW_REQUEST_THRESHOLD) {
            this.logger.error(
              `🐌 VERY SLOW REQUEST: ${method} ${url} - ${duration}ms - Memory: ${this.formatBytes(memoryDelta)}`,
            );
          } else if (duration > this.SLOW_REQUEST_THRESHOLD) {
            this.logger.warn(
              `⚠️  SLOW REQUEST: ${method} ${url} - ${duration}ms - Memory: ${this.formatBytes(memoryDelta)}`,
            );
          }

          // Log all requests in debug mode
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(
              `${method} ${url} - ${duration}ms - Memory: ${this.formatBytes(memoryDelta)}`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `❌ REQUEST ERROR: ${method} ${url} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

