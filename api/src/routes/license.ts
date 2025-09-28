import { Router } from 'express';
import { LicenseController } from '../controllers/LicenseController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * License Management Routes
 * All routes require authentication via API key
 */

// Get license information
router.get('/info',
  AuthMiddleware.validateApiKey,
  LicenseController.getLicenseInfo
);

// Validate PRO license status
router.get('/validate-pro',
  AuthMiddleware.validateApiKey,
  LicenseController.validateProLicense
);

// Check expiration status
router.get('/expiration-status',
  AuthMiddleware.validateApiKey,
  LicenseController.getExpirationStatus
);

// Upgrade license from FREE to PRO
router.post('/upgrade',
  AuthMiddleware.validateApiKey,
  LicenseController.upgradeLicense
);

// Save Google API Key
router.post('/save-google-api-key',
  AuthMiddleware.validateApiKey,
  LicenseController.saveGoogleApiKey
);


// Admin routes (would typically require admin authentication)
// For now, we'll use a simple admin key check

/**
 * Admin middleware - checks for admin API key
 */
const adminAuth = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedAdminKey = process.env.ADMIN_API_KEY || 'mirrorly-admin-key-change-in-production';

  if (!adminKey || adminKey !== expectedAdminKey) {
    return res.status(403).json({
      error: 'ADMIN_ACCESS_REQUIRED',
      message: 'Admin access required',
      code: 'ADMIN_AUTH_FAILED'
    });
  }

  next();
};

// Suspend a license (admin only)
router.post('/suspend',
  adminAuth,
  LicenseController.suspendLicense
);

// Reactivate a license (admin only)
router.post('/reactivate',
  adminAuth,
  LicenseController.reactivateLicense
);

// Get licenses expiring soon (admin only)
router.get('/expiring-soon',
  adminAuth,
  LicenseController.getExpiringSoon
);

export default router;