import { loggingService, PerformanceMetrics, UsageMetrics } from './LoggingService';
import fs from 'fs';
import path from 'path';

export interface DashboardData {
  overview: {
    totalRequests: number;
    totalGenerations: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  performance: {
    slowestEndpoints: Array<{
      endpoint: string;
      averageTime: number;
      requestCount: number;
    }>;
    errorsByEndpoint: Array<{
      endpoint: string;
      errorCount: number;
      errorRate: number;
    }>;
    responseTimeDistribution: {
      fast: number; // < 100ms
      medium: number; // 100ms - 1s
      slow: number; // 1s - 5s
      verySlow: number; // > 5s
    };
  };
  usage: {
    topLicenses: Array<{
      licenseId: string;
      licenseType: string;
      generationsCount: number;
      successRate: number;
    }>;
    generationsByType: {
      free: number;
      pro_basic: number;
      pro_premium: number;
    };
    hourlyDistribution: Array<{
      hour: number;
      requests: number;
      generations: number;
    }>;
  };
  alerts: Array<{
    type: 'error' | 'performance' | 'usage';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    count?: number;
  }>;
}

class DashboardService {
  private metricsCache: DashboardData | null = null;
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public async getDashboardData(): Promise<DashboardData> {
    // Return cached data if still valid
    if (this.metricsCache && this.lastCacheUpdate &&
      Date.now() - this.lastCacheUpdate.getTime() < this.CACHE_DURATION) {
      return this.metricsCache;
    }

    // Generate fresh dashboard data
    const dashboardData = await this.generateDashboardData();

    // Cache the results
    this.metricsCache = dashboardData;
    this.lastCacheUpdate = new Date();

    return dashboardData;
  }

  private async generateDashboardData(): Promise<DashboardData> {
    const performanceMetrics = loggingService.getPerformanceMetrics();
    const usageMetrics = loggingService.getUsageMetrics();
    const logAnalysis = await this.analyzeLogFiles();

    return {
      overview: this.generateOverview(performanceMetrics, usageMetrics, logAnalysis),
      performance: this.generatePerformanceMetrics(performanceMetrics),
      usage: this.generateUsageMetrics(usageMetrics, logAnalysis),
      alerts: this.generateAlerts(performanceMetrics, logAnalysis)
    };
  }

  private generateOverview(
    performanceMetrics: PerformanceMetrics[],
    usageMetrics: Map<string, UsageMetrics>,
    logAnalysis: any
  ) {
    const totalRequests = performanceMetrics.length;
    const totalGenerations = Array.from(usageMetrics.values())
      .reduce((sum, metric) => sum + metric.generationsCount, 0);

    const averageResponseTime = totalRequests > 0
      ? performanceMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / totalRequests
      : 0;

    const errorCount = performanceMetrics.filter(metric => metric.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      totalRequests,
      totalGenerations,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage()
    };
  }

  private generatePerformanceMetrics(performanceMetrics: PerformanceMetrics[]) {
    // Group by endpoint
    const endpointStats = new Map<string, {
      totalTime: number;
      requestCount: number;
      errorCount: number;
    }>();

    performanceMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key);

      if (existing) {
        existing.totalTime += metric.responseTime;
        existing.requestCount++;
        if (metric.statusCode >= 400) existing.errorCount++;
      } else {
        endpointStats.set(key, {
          totalTime: metric.responseTime,
          requestCount: 1,
          errorCount: metric.statusCode >= 400 ? 1 : 0
        });
      }
    });

    // Calculate slowest endpoints
    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: Math.round(stats.totalTime / stats.requestCount),
        requestCount: stats.requestCount
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    // Calculate errors by endpoint
    const errorsByEndpoint = Array.from(endpointStats.entries())
      .filter(([, stats]) => stats.errorCount > 0)
      .map(([endpoint, stats]) => ({
        endpoint,
        errorCount: stats.errorCount,
        errorRate: Math.round((stats.errorCount / stats.requestCount) * 100 * 100) / 100
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);

    // Response time distribution
    const responseTimeDistribution = {
      fast: 0,
      medium: 0,
      slow: 0,
      verySlow: 0
    };

    performanceMetrics.forEach(metric => {
      if (metric.responseTime < 100) {
        responseTimeDistribution.fast++;
      } else if (metric.responseTime < 1000) {
        responseTimeDistribution.medium++;
      } else if (metric.responseTime < 5000) {
        responseTimeDistribution.slow++;
      } else {
        responseTimeDistribution.verySlow++;
      }
    });

    return {
      slowestEndpoints,
      errorsByEndpoint,
      responseTimeDistribution
    };
  }

  private generateUsageMetrics(usageMetrics: Map<string, UsageMetrics>, logAnalysis: any) {
    // Top licenses by usage
    const topLicenses = Array.from(usageMetrics.values())
      .sort((a, b) => b.generationsCount - a.generationsCount)
      .slice(0, 10)
      .map(metric => ({
        licenseId: metric.licenseId,
        licenseType: metric.licenseType,
        generationsCount: metric.generationsCount,
        successRate: Math.round(metric.successRate * 100 * 100) / 100
      }));

    // Generations by license type
    const generationsByType = {
      free: 0,
      pro_basic: 0,
      pro_premium: 0
    };

    usageMetrics.forEach(metric => {
      if (metric.licenseType === 'free') {
        generationsByType.free += metric.generationsCount;
      } else if (metric.licenseType === 'pro_basic') {
        generationsByType.pro_basic += metric.generationsCount;
      } else if (metric.licenseType === 'pro_premium') {
        generationsByType.pro_premium += metric.generationsCount;
      }
    });

    // Hourly distribution (mock data for now - would need time-series analysis)
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      requests: Math.floor(Math.random() * 100), // TODO: Implement real hourly analysis
      generations: Math.floor(Math.random() * 50)
    }));

    return {
      topLicenses,
      generationsByType,
      hourlyDistribution
    };
  }

  private generateAlerts(performanceMetrics: PerformanceMetrics[], logAnalysis: any) {
    const alerts: DashboardData['alerts'] = [];

    // High error rate alert
    const errorRate = performanceMetrics.length > 0
      ? (performanceMetrics.filter(m => m.statusCode >= 400).length / performanceMetrics.length) * 100
      : 0;

    if (errorRate > 10) {
      alerts.push({
        type: 'error',
        severity: errorRate > 25 ? 'critical' : 'high',
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        count: performanceMetrics.filter(m => m.statusCode >= 400).length
      });
    }

    // Slow response time alert
    const slowRequests = performanceMetrics.filter(m => m.responseTime > 5000).length;
    if (slowRequests > 0) {
      alerts.push({
        type: 'performance',
        severity: slowRequests > 10 ? 'high' : 'medium',
        message: `${slowRequests} slow requests detected (>5s response time)`,
        timestamp: new Date(),
        count: slowRequests
      });
    }

    // Memory usage alert
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (memoryUsagePercent > 80) {
      alerts.push({
        type: 'performance',
        severity: memoryUsagePercent > 95 ? 'critical' : 'high',
        message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async analyzeLogFiles(): Promise<any> {
    // Analyze recent log files for patterns
    // This is a simplified implementation - in production you'd want more sophisticated log analysis

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const errorLogPath = path.join(logsDir, 'error.log');

      if (!fs.existsSync(errorLogPath)) {
        return { errorCount: 0, criticalErrors: [] };
      }

      const errorLogContent = fs.readFileSync(errorLogPath, 'utf-8');
      const errorLines = errorLogContent.split('\n').filter(line => line.trim());

      // Count recent errors (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentErrors = errorLines.filter(line => {
        try {
          const logEntry = JSON.parse(line);
          return new Date(logEntry.timestamp) > oneHourAgo;
        } catch {
          return false;
        }
      });

      return {
        errorCount: recentErrors.length,
        criticalErrors: recentErrors.filter(line => line.includes('CRITICAL'))
      };
    } catch (error) {
      return { errorCount: 0, criticalErrors: [] };
    }
  }

  // Generate HTML dashboard
  public generateHTMLDashboard(data: DashboardData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirrorly API Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .metric-label { color: #7f8c8d; margin-top: 5px; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert.critical { background: #e74c3c; color: white; }
        .alert.high { background: #f39c12; color: white; }
        .alert.medium { background: #f1c40f; color: #2c3e50; }
        .alert.low { background: #95a5a6; color: white; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #ecf0f1; }
        .refresh-info { text-align: center; color: #7f8c8d; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Mirrorly API Dashboard</h1>
            <p>Real-time monitoring and analytics</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${data.overview.totalRequests}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.overview.totalGenerations}</div>
                <div class="metric-label">Total Generations</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.overview.averageResponseTime}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.overview.errorRate}%</div>
                <div class="metric-label">Error Rate</div>
            </div>
        </div>

        ${data.alerts.length > 0 ? `
        <div class="metric-card" style="margin-top: 20px;">
            <h3>🚨 Active Alerts</h3>
            ${data.alerts.map(alert => `
                <div class="alert ${alert.severity}">
                    <strong>${alert.type.toUpperCase()}:</strong> ${alert.message}
                    <small style="float: right;">${alert.timestamp.toLocaleString()}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="metrics-grid" style="margin-top: 20px;">
            <div class="metric-card">
                <h3>📊 Slowest Endpoints</h3>
                <table class="table">
                    <thead>
                        <tr><th>Endpoint</th><th>Avg Time</th><th>Requests</th></tr>
                    </thead>
                    <tbody>
                        ${data.performance.slowestEndpoints.slice(0, 5).map(endpoint => `
                            <tr>
                                <td>${endpoint.endpoint}</td>
                                <td>${endpoint.averageTime}ms</td>
                                <td>${endpoint.requestCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="metric-card">
                <h3>📈 Top Licenses</h3>
                <table class="table">
                    <thead>
                        <tr><th>License</th><th>Type</th><th>Generations</th><th>Success Rate</th></tr>
                    </thead>
                    <tbody>
                        ${data.usage.topLicenses.slice(0, 5).map(license => `
                            <tr>
                                <td>${license.licenseId.substring(0, 8)}...</td>
                                <td>${license.licenseType}</td>
                                <td>${license.generationsCount}</td>
                                <td>${license.successRate}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="refresh-info">
            <p>Dashboard auto-refreshes every 5 minutes | Last updated: ${new Date().toLocaleString()}</p>
            <p>Memory Usage: ${Math.round(data.overview.memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(data.overview.memoryUsage.heapTotal / 1024 / 1024)}MB</p>
        </div>
    </div>

    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => {
            window.location.reload();
        }, 5 * 60 * 1000);
    </script>
</body>
</html>`;
  }
}

export const dashboardService = new DashboardService();
export default DashboardService;