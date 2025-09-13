import winston from 'winston';
import path from 'path';
import fs from 'fs';

export interface LogMetrics {
  requestId?: string;
  userId?: string;
  licenseId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  error?: string;
  generationId?: string;
  imageSize?: number;
  processingTime?: number;
  googleAIModel?: string;
  promptLength?: number;
  success?: boolean;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  timestamp: Date;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface UsageMetrics {
  licenseId: string;
  licenseType: string;
  generationsCount: number;
  totalImageSize: number;
  averageProcessingTime: number;
  successRate: number;
  timestamp: Date;
}

class LoggingService {
  private logger: winston.Logger;
  private metricsLogger: winston.Logger;
  private errorLogger: winston.Logger;
  private performanceMetrics: PerformanceMetrics[] = [];
  private usageMetrics: Map<string, UsageMetrics> = new Map();

  constructor() {
    this.initializeLoggers();
    this.setupMetricsCollection();
  }

  private initializeLoggers(): void {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Main application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'mirrorly-api' },
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Metrics logger for analytics
    this.metricsLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'metrics.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 10
        })
      ]
    });

    // Error logger for critical alerts
    this.errorLogger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logsDir, 'critical-errors.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 3
        })
      ]
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      );

      this.logger.add(new winston.transports.Console({ format: consoleFormat }));
      this.metricsLogger.add(new winston.transports.Console({ format: consoleFormat }));
    }
  }

  private setupMetricsCollection(): void {
    // Collect performance metrics every 5 minutes
    setInterval(() => {
      this.flushPerformanceMetrics();
    }, 5 * 60 * 1000);

    // Collect usage metrics every hour
    setInterval(() => {
      this.flushUsageMetrics();
    }, 60 * 60 * 1000);
  }

  // Main logging methods
  public info(message: string, meta?: LogMetrics): void {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: LogMetrics): void {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: Error, meta?: LogMetrics): void {
    const errorMeta = {
      ...meta,
      error: error?.message,
      stack: error?.stack
    };

    this.logger.error(message, errorMeta);

    // Log critical errors separately for alerting
    if (this.isCriticalError(error, meta)) {
      this.logCriticalError(message, error, meta);
    }
  }

  public debug(message: string, meta?: LogMetrics): void {
    this.logger.debug(message, meta);
  }

  // Request logging
  public logRequest(req: any, res: any, responseTime: number): void {
    const meta: LogMetrics = {
      requestId: req.id,
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      licenseId: req.license?.id
    };

    this.info('HTTP Request', meta);
    this.collectPerformanceMetrics(req, res, responseTime);
  }

  // Generation-specific logging
  public logGeneration(data: {
    generationId: string;
    licenseId: string;
    licenseType: string;
    imageSize: number;
    processingTime: number;
    googleAIModel: string;
    promptLength: number;
    success: boolean;
    error?: string;
  }): void {
    const meta: LogMetrics = {
      generationId: data.generationId,
      licenseId: data.licenseId,
      imageSize: data.imageSize,
      processingTime: data.processingTime,
      googleAIModel: data.googleAIModel,
      promptLength: data.promptLength,
      success: data.success,
      error: data.error
    };

    if (data.success) {
      this.info('Image generation completed', meta);
    } else {
      this.error('Image generation failed', new Error(data.error || 'Unknown error'), meta);
    }

    this.collectUsageMetrics(data);
  }

  // Rate limiting logging
  public logRateLimit(licenseId: string, endpoint: string, exceeded: boolean): void {
    const meta: LogMetrics = {
      licenseId,
      endpoint,
      success: !exceeded
    };

    if (exceeded) {
      this.warn('Rate limit exceeded', meta);
    } else {
      this.debug('Rate limit check passed', meta);
    }
  }

  // License validation logging
  public logLicenseValidation(licenseId: string, domain: string, valid: boolean, reason?: string): void {
    const meta: LogMetrics = {
      licenseId,
      success: valid,
      error: reason
    };

    if (valid) {
      this.info(`License validation successful for domain: ${domain}`, meta);
    } else {
      this.warn(`License validation failed for domain: ${domain}`, meta);
    }
  }

  // Performance metrics collection
  private collectPerformanceMetrics(req: any, res: any, responseTime: number): void {
    const metric: PerformanceMetrics = {
      endpoint: req.originalUrl,
      method: req.method,
      responseTime,
      timestamp: new Date(),
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage()
    };

    this.performanceMetrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  // Usage metrics collection
  private collectUsageMetrics(data: {
    licenseId: string;
    licenseType: string;
    imageSize: number;
    processingTime: number;
    success: boolean;
  }): void {
    const existing = this.usageMetrics.get(data.licenseId);

    if (existing) {
      existing.generationsCount++;
      existing.totalImageSize += data.imageSize;
      existing.averageProcessingTime =
        (existing.averageProcessingTime * (existing.generationsCount - 1) + data.processingTime) / existing.generationsCount;
      existing.successRate =
        (existing.successRate * (existing.generationsCount - 1) + (data.success ? 1 : 0)) / existing.generationsCount;
    } else {
      this.usageMetrics.set(data.licenseId, {
        licenseId: data.licenseId,
        licenseType: data.licenseType,
        generationsCount: 1,
        totalImageSize: data.imageSize,
        averageProcessingTime: data.processingTime,
        successRate: data.success ? 1 : 0,
        timestamp: new Date()
      });
    }
  }

  // Flush metrics to logs
  private flushPerformanceMetrics(): void {
    if (this.performanceMetrics.length === 0) return;

    const summary = this.calculatePerformanceSummary();
    this.metricsLogger.info('Performance metrics summary', summary);

    // Clear metrics after logging
    this.performanceMetrics = [];
  }

  private flushUsageMetrics(): void {
    if (this.usageMetrics.size === 0) return;

    for (const [licenseId, metrics] of this.usageMetrics.entries()) {
      this.metricsLogger.info('Usage metrics', {
        type: 'usage',
        licenseId,
        ...metrics
      });
    }

    // Clear metrics after logging
    this.usageMetrics.clear();
  }

  // Calculate performance summary
  private calculatePerformanceSummary() {
    const endpointStats = new Map<string, {
      count: number;
      totalTime: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
      errorCount: number;
    }>();

    this.performanceMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key);

      if (existing) {
        existing.count++;
        existing.totalTime += metric.responseTime;
        existing.avgTime = existing.totalTime / existing.count;
        existing.minTime = Math.min(existing.minTime, metric.responseTime);
        existing.maxTime = Math.max(existing.maxTime, metric.responseTime);
        if (metric.statusCode >= 400) existing.errorCount++;
      } else {
        endpointStats.set(key, {
          count: 1,
          totalTime: metric.responseTime,
          avgTime: metric.responseTime,
          minTime: metric.responseTime,
          maxTime: metric.responseTime,
          errorCount: metric.statusCode >= 400 ? 1 : 0
        });
      }
    });

    return {
      type: 'performance',
      timestamp: new Date(),
      totalRequests: this.performanceMetrics.length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      endpointStats: Object.fromEntries(endpointStats)
    };
  }

  // Critical error detection
  private isCriticalError(error?: Error, meta?: LogMetrics): boolean {
    if (!error) return false;

    // Define critical error conditions
    const criticalPatterns = [
      /database.*connection/i,
      /google.*ai.*quota/i,
      /authentication.*failed/i,
      /out of memory/i,
      /econnrefused/i,
      /timeout/i
    ];

    const isCriticalPattern = criticalPatterns.some(pattern =>
      pattern.test(error.message) || pattern.test(error.stack || '')
    );

    const isCriticalStatus = meta?.statusCode && meta.statusCode >= 500;
    const isHighFrequency = meta?.endpoint && this.getErrorFrequency(meta.endpoint) > 10;

    return isCriticalPattern || isCriticalStatus || isHighFrequency;
  }

  private logCriticalError(message: string, error?: Error, meta?: LogMetrics): void {
    this.errorLogger.error('CRITICAL ERROR', {
      message,
      error: error?.message,
      stack: error?.stack,
      meta,
      timestamp: new Date(),
      severity: 'critical'
    });

    // In production, this could trigger alerts (email, Slack, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.triggerAlert(message, error, meta);
    }
  }

  private getErrorFrequency(endpoint: string): number {
    // Count errors for this endpoint in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.performanceMetrics.filter(metric =>
      metric.endpoint === endpoint &&
      metric.statusCode >= 400 &&
      metric.timestamp > fiveMinutesAgo
    ).length;
  }

  private triggerAlert(message: string, error?: Error, meta?: LogMetrics): void {
    // Placeholder for alert system integration
    // Could integrate with services like:
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Custom webhook endpoints

    console.error('🚨 CRITICAL ALERT:', {
      message,
      error: error?.message,
      meta,
      timestamp: new Date()
    });
  }

  // Public methods for metrics retrieval
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  public getUsageMetrics(): Map<string, UsageMetrics> {
    return new Map(this.usageMetrics);
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    this.flushPerformanceMetrics();
    this.flushUsageMetrics();

    // Close all transports
    this.logger.end();
    this.metricsLogger.end();
    this.errorLogger.end();
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
export default LoggingService;