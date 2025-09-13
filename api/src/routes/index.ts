import { Router } from 'express';
import authRoutes from './auth';
import licenseRoutes from './license';
import generationRoutes from './generation';
import dashboardRoutes from './dashboard';

const router = Router();

/**
 * API Routes Configuration
 */

// Authentication routes
router.use('/auth', authRoutes);

// License management routes
router.use('/license', licenseRoutes);

// Generation routes
router.use('/generate', generationRoutes);

// Limits routes (alias for generation limits)
router.use('/limits', generationRoutes);

// Dashboard and monitoring routes
router.use('/dashboard', dashboardRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Mirrorly API v1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        'POST /auth/register-free': 'Register a new FREE license',
        'POST /auth/register-pro': 'Register a new PRO license',
        'POST /auth/validate-license': 'Validate an existing license',
        'GET /auth/status': 'Get authentication status (requires API key)',
        'POST /auth/refresh-token': 'Refresh JWT token (requires API key)'
      },
      license: {
        'GET /license/info': 'Get license information (requires API key)',
        'GET /license/validate-pro': 'Validate PRO license status (requires API key)',
        'GET /license/expiration-status': 'Check expiration status (requires API key)',
        'POST /license/upgrade': 'Upgrade license from FREE to PRO (requires API key)',
        'POST /license/suspend': 'Suspend a license (admin only)',
        'POST /license/reactivate': 'Reactivate a license (admin only)',
        'GET /license/expiring-soon': 'Get licenses expiring soon (admin only)'
      },
      generation: {
        'POST /generate/image': 'Generate image with AI (requires API key + images)',
        'GET /generate/status/{id}': 'Get generation status by ID (requires API key)',
        'GET /limits/current': 'Get current usage limits (requires API key)'
      },
      dashboard: {
        'GET /dashboard': 'View HTML dashboard (monitoring)',
        'GET /dashboard/data': 'Get dashboard data as JSON',
        'GET /dashboard/health': 'Get system health status',
        'GET /dashboard/metrics': 'Get metrics for external monitoring',
        'DELETE /dashboard/metrics': 'Clear metrics (admin only)'
      }
    },
    authentication: {
      api_key: 'Include X-API-Key header with your license key',
      domain: 'Include X-Domain header with your domain (optional for validation)',
      admin: 'Include X-Admin-Key header for admin endpoints'
    }
  });
});

export default router;