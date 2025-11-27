import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * PERFORMANCE METRICS SERVICE
 * 
 * Collects and tracks application performance metrics
 * 
 * METRICS TRACKED:
 * - Request count and duration
 * - Database query performance
 * - Cache hit/miss ratio
 * - Memory usage
 * - Error rates
 * 
 * USAGE:
 * Inject this service and call trackMetric() for custom metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricsSummary {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsageMB: number;
  uptime: number;
}

@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly MAX_METRICS_PER_TYPE = 1000;
  private readonly startTime = Date.now();

  // Counters
  private totalRequests = 0;
  private slowRequests = 0;
  private totalErrors = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalResponseTime = 0;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Track a custom metric
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only recent metrics to prevent memory bloat
    if (metricArray.length > this.MAX_METRICS_PER_TYPE) {
      metricArray.shift();
    }
  }

  /**
   * Track request performance
   */
  trackRequest(duration: number, isSlow: boolean = false): void {
    this.totalRequests++;
    this.totalResponseTime += duration;
    if (isSlow) {
      this.slowRequests++;
    }
    this.trackMetric('request_duration', duration);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    this.totalErrors++;
    this.trackMetric('error', 1, { message: error.message, context: context || 'unknown' });
  }

  /**
   * Track cache hit/miss
   */
  trackCacheHit(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(): MetricsSummary {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    return {
      totalRequests: this.totalRequests,
      averageResponseTime: this.totalRequests > 0 
        ? this.totalResponseTime / this.totalRequests 
        : 0,
      slowRequests: this.slowRequests,
      errorRate: this.totalRequests > 0 
        ? (this.totalErrors / this.totalRequests) * 100 
        : 0,
      cacheHitRate: (this.cacheHits + this.cacheMisses) > 0
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
        : 0,
      memoryUsageMB: memoryUsage.heapUsed / 1024 / 1024,
      uptime: uptime / 1000, // seconds
    };
  }

  /**
   * Get detailed metrics for a specific type
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.totalRequests = 0;
    this.slowRequests = 0;
    this.totalErrors = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalResponseTime = 0;
    this.logger.log('Performance metrics reset');
  }
}

