import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from './config';
import { initializeModels } from './models';
import apiRoutes from './routes';

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

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Error:', err);
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

    // Start server
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 Mirrorly API Server running on port ${PORT}`);
        // eslint-disable-next-line no-console
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        // eslint-disable-next-line no-console
        console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        // eslint-disable-next-line no-console
        console.log(`💾 Database: Connected and ready`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;