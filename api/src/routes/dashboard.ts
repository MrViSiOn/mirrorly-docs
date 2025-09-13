import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();
const dashboardController = new DashboardController();

// Dashboard routes
router.get('/data', dashboardController.getDashboardData.bind(dashboardController));
router.get('/', dashboardController.getHTMLDashboard.bind(dashboardController));
router.get('/health', dashboardController.getSystemHealth.bind(dashboardController));
router.get('/metrics', dashboardController.getMetrics.bind(dashboardController));

// Admin routes (would typically require authentication)
router.delete('/metrics', dashboardController.clearMetrics.bind(dashboardController));

export default router;