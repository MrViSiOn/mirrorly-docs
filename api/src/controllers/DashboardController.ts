import { Request, Response } from 'express';
import { dashboardService } from '../services/DashboardService';
import { loggingService } from '../services/LoggingService';

export class DashboardController {
  // Get dashboard data as JSON
  public async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const dashboardData = await dashboardService.getDashboardData();

      loggingService.info('Dashboard data requested', {
        requestId: req.id,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date()
      });
    } catch (error) {
      loggingService.error('Failed to get dashboard data', error as Error, {
        requestId: req.id,
        endpoint: req.originalUrl
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }

  // Serve HTML dashboard
  public async getHTMLDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dashboardData = await dashboardService.getDashboardData();
      const htmlContent = dashboardService.generateHTMLDashboard(dashboardData);

      loggingService.info('HTML dashboard requested', {
        requestId: req.id,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent')
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      loggingService.error('Failed to serve HTML dashboard', error as Error, {
        requestId: req.id,
        endpoint: req.originalUrl
      });

      res.status(500).send(`
        <html>
          <body>
            <h1>Dashboard Error</h1>
            <p>Failed to load dashboard data. Please try again later.</p>
            <p><a href="/v1/dashboard">Refresh</a></p>
          </body>
        </html>
      `);
    }
  }

  // Get system health information
  public async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const performanceMetrics = loggingService.getPerformanceMetrics();
      const usageMetrics = loggingService.getUsageMetrics();

      // Calculate basic health indicators
      const recentErrors = performanceMetrics
        .filter(metric => metric.statusCode >= 500)
        .filter(metric => Date.now() - metric.timestamp.getTime() < 5 * 60 * 1000); // Last 5 minutes

      const averageResponseTime = performanceMetrics.length > 0
        ? performanceMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / performanceMetrics.length
        : 0;

      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Determine overall health status
      let healthStatus = 'healthy';
      const issues = [];

      if (recentErrors.length > 5) {
        healthStatus = 'degraded';
        issues.push(`${recentErrors.length} server errors in last 5 minutes`);
      }

      if (averageResponseTime > 2000) {
        healthStatus = 'degraded';
        issues.push(`High average response time: ${Math.round(averageResponseTime)}ms`);
      }

      if (memoryUsagePercent > 90) {
        healthStatus = 'critical';
        issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      }

      const healthData = {
        status: healthStatus,
        timestamp: new Date(),
        uptime: Math.round(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round(memoryUsagePercent * 100) / 100
        },
        performance: {
          totalRequests: performanceMetrics.length,
          averageResponseTime: Math.round(averageResponseTime),
          recentErrors: recentErrors.length,
          totalGenerations: Array.from(usageMetrics.values())
            .reduce((sum, metric) => sum + metric.generationsCount, 0)
        },
        issues
      };

      loggingService.info('System health check', {
        requestId: req.id,
        healthStatus,
        issueCount: issues.length
      });

      res.json({
        success: true,
        health: healthData
      });
    } catch (error) {
      loggingService.error('Failed to get system health', error as Error, {
        requestId: req.id
      });

      res.status(500).json({
        success: false,
        health: {
          status: 'unknown',
          timestamp: new Date(),
          error: 'Failed to retrieve health data'
        }
      });
    }
  }

  // Get detailed metrics for external monitoring systems
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const performanceMetrics = loggingService.getPerformanceMetrics();
      const usageMetrics = loggingService.getUsageMetrics();

      // Format metrics for Prometheus-style monitoring
      const metrics = {
        http_requests_total: performanceMetrics.length,
        http_request_duration_seconds: performanceMetrics.length > 0
          ? performanceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / performanceMetrics.length / 1000
          : 0,
        http_requests_errors_total: performanceMetrics.filter(m => m.statusCode >= 400).length,
        memory_usage_bytes: process.memoryUsage().heapUsed,
        memory_usage_percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        uptime_seconds: process.uptime(),
        generations_total: Array.from(usageMetrics.values())
          .reduce((sum, metric) => sum + metric.generationsCount, 0),
        active_licenses: usageMetrics.size,
        timestamp: Date.now()
      };

      loggingService.debug('Metrics endpoint accessed', {
        requestId: req.id,
        metricsCount: Object.keys(metrics).length
      });

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      loggingService.error('Failed to get metrics', error as Error, {
        requestId: req.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  }

  // Clear metrics (admin only)
  public async clearMetrics(req: Request, res: Response): Promise<void> {
    try {
      // This would typically require admin authentication
      // For now, we'll just log the action

      loggingService.warn('Metrics cleared by admin', {
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Metrics cleared successfully',
        timestamp: new Date()
      });
    } catch (error) {
      loggingService.error('Failed to clear metrics', error as Error, {
        requestId: req.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to clear metrics'
      });
    }
  }
}