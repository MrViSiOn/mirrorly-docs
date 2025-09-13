import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * Authentication Routes
 */

// Register new FREE license
router.post('/register-free', AuthController.registerFree);

// Register new PRO license
router.post('/register-pro', AuthController.registerPro);

// Validate existing license
router.post('/validate-license', AuthController.validateLicense);

// Get authentication status (requires API key)
router.get('/status',
  AuthMiddleware.validateApiKey,
  AuthController.getStatus
);

// Refresh JWT token (requires API key)
router.post('/refresh-token',
  AuthMiddleware.validateApiKey,
  AuthController.refreshToken
);

export default router;