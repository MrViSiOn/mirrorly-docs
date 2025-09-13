import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from './config';
import { initializeModels } from './models';
import apiRoutes from './routes';
import {
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  slowRequestMiddleware,
  usageTrackingMiddleware
} from './middleware/LoggingMiddleware';
import { performanceMiddlewareStack } from './middleware/PerformanceMiddleware';
import { loggingService } from './services/LoggingService';
import { imageCleanupService } from './services/ImageCleanupService';
import DatabaseOptimizationService from './services/DatabaseOptimizationService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance and logging middleware
app.use(...performanceMiddlewareStack);
app.use(requestLoggingMiddleware);
app.use(slowRequestMiddleware(5000)); // Alert on requests > 5 seconds
app.use(usageTrackingMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/v1', apiRoutes);

// Basic route (redirect to API info)
app.get('/', (req, res) => {
  res.redirect('/v1');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error logging middleware
app.use(errorLoggingMiddleware);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  loggingService.error('Unhandled application error', err, {
    requestId: req.id,
    method: req.method,
    endpoint: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Initialize models and associations
    await initializeModels();

    // Initialize database optimizations
    const dbOptimizer = new DatabaseOptimizationService(require('./config').sequelize);
    await dbOptimizer.createOptimizedIndexes();
    await dbOptimizer.optimizeConfiguration();
    dbOptimizer.scheduleMaintenanceTasks();

    // Start server
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        loggingService.info('Mirrorly API Server started', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          pid: process.pid
        });

        // eslint-disable-next-line no-console
        console.log(`🚀 Mirrorly API Server running on port ${PORT}`);
        // eslint-disable-next-line no-console
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        // eslint-disable-next-line no-console
        console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        // eslint-disable-next-line no-console
        console.log(`📈 Dashboard: http://localhost:${PORT}/v1/dashboard`);
        // eslint-disable-next-line no-console
        console.log(`💾 Database: Connected and ready`);
      });
    }
  } catch (error) {
    loggingService.error('Failed to start server', error as Error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  loggingService.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Shutdown services in order
    imageCleanupService.shutdown();
    await loggingService.shutdown();
    loggingService.info('All services closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  loggingService.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  loggingService.error('Unhandled rejection', new Error(String(reason)), {
    promise: String(promise)
  });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;