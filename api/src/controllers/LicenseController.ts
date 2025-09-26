import { Request, Response } from 'express';
import { License } from '../models/License';
import { Op } from 'sequelize';

/**
 * Controller for license management and validation
 */
export class LicenseController {
  /**
   * Get license information
   * GET /license/info
   */
  static async getLicenseInfo(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Check if expired and auto-expire
      if (license.isExpired()) {
        await LicenseController.handleExpiredLicense(license);

        res.status(401).json({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
          expires_at: license.expires_at,
          degraded_to: 'free'
        });
        return;
      }

      // Reset usage if needed
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      res.status(200).json({
        success: true,
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          remaining_generations: license.getRemainingGenerations(),
          last_reset: license.last_reset,
          expires_at: license.expires_at,
          created_at: license.created_at,
          updated_at: license.updated_at
        },
        limits: {
          monthly_generations: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          rate_limit_seconds: LicenseController.getRateLimitSeconds(license.type),
          can_generate: license.canGenerate(),
          days_until_expiry: license.expires_at ?
            Math.ceil((license.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        }
      });

    } catch (error) {
      console.error('Get license info error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get license information',
        code: 'LICENSE_INFO_FAILED'
      });
    }
  }

  /**
   * Validate PRO license status
   * GET /license/validate-pro
   */
  static async validateProLicense(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Check if it's a PRO license
      if (license.type === 'free') {
        res.status(403).json({
          error: 'LICENSE_001',
          message: 'PRO license required',
          code: 'PRO_LICENSE_REQUIRED',
          current_license: license.type,
          upgrade_required: true
        });
        return;
      }

      // Check if expired
      if (license.isExpired()) {
        await LicenseController.handleExpiredLicense(license);

        res.status(401).json({
          error: 'AUTH_002',
          message: 'PRO license has expired, degraded to FREE',
          code: 'PRO_LICENSE_EXPIRED',
          expires_at: license.expires_at,
          degraded_to: 'free'
        });
        return;
      }

      // Check if suspended
      if (license.status === 'suspended') {
        res.status(403).json({
          error: 'LICENSE_002',
          message: 'PRO license is suspended',
          code: 'PRO_LICENSE_SUSPENDED'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'PRO license is valid',
        license: {
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          expires_at: license.expires_at,
          days_until_expiry: license.expires_at ?
            Math.ceil((license.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        },
        pro_features: {
          unlimited_products: true,
          custom_styling: true,
          priority_support: true,
          advanced_analytics: license.type === 'pro_premium'
        }
      });

    } catch (error) {
      console.error('Validate PRO license error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to validate PRO license',
        code: 'PRO_VALIDATION_FAILED'
      });
    }
  }

  /**
   * Check license expiration status
   * GET /license/expiration-status
   */
  static async getExpirationStatus(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      const now = new Date();
      let expirationInfo: any = {
        has_expiration: !!license.expires_at,
        is_expired: license.isExpired(),
        expires_at: license.expires_at
      };

      if (license.expires_at) {
        const daysUntilExpiry = Math.ceil((license.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        expirationInfo = {
          ...expirationInfo,
          days_until_expiry: daysUntilExpiry,
          expires_soon: daysUntilExpiry <= 7 && daysUntilExpiry > 0,
          expires_today: daysUntilExpiry === 0,
          warning_level: daysUntilExpiry <= 3 ? 'critical' :
            daysUntilExpiry <= 7 ? 'warning' :
              daysUntilExpiry <= 30 ? 'notice' : 'none'
        };
      }

      // If expired, handle degradation
      if (license.isExpired()) {
        await LicenseController.handleExpiredLicense(license);
        expirationInfo.degraded_to = 'free';
      }

      res.status(200).json({
        success: true,
        license_key: license.license_key,
        current_type: license.type,
        current_status: license.status,
        expiration: expirationInfo
      });

    } catch (error) {
      console.error('Get expiration status error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get expiration status',
        code: 'EXPIRATION_STATUS_FAILED'
      });
    }
  }

  /**
   * Upgrade license from FREE to PRO
   * POST /license/upgrade
   */
  static async upgradeLicense(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;
      const { new_license_key, type, expires_at } = req.body;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Validate input
      if (!new_license_key || !type) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'New license key and type are required',
          code: 'MISSING_UPGRADE_DATA'
        });
        return;
      }

      if (!['pro_basic', 'pro_premium'].includes(type)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid license type for upgrade',
          code: 'INVALID_UPGRADE_TYPE'
        });
        return;
      }

      // Check if new license key already exists
      const existingKey = await License.findByLicenseKey(new_license_key);
      if (existingKey && existingKey.id !== license.id) {
        res.status(409).json({
          error: 'LICENSE_EXISTS',
          message: 'License key already exists',
          code: 'LICENSE_KEY_EXISTS'
        });
        return;
      }

      // Perform upgrade
      const oldType = license.type;
      license.license_key = new_license_key;
      license.type = type;
      license.status = 'active';
      license.monthly_limit = type === 'pro_basic' ? 100 : 500;
      license.expires_at = expires_at ? new Date(expires_at) : undefined;

      await license.save();

      res.status(200).json({
        success: true,
        message: `License upgraded from ${oldType} to ${type}`,
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          expires_at: license.expires_at,
          updated_at: license.updated_at
        },
        upgrade_info: {
          previous_type: oldType,
          new_type: type,
          new_monthly_limit: license.monthly_limit,
          rate_limit_seconds: LicenseController.getRateLimitSeconds(type)
        }
      });

    } catch (error) {
      console.error('Upgrade license error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to upgrade license',
        code: 'UPGRADE_FAILED'
      });
    }
  }

  /**
   * Suspend a license (admin only)
   * POST /license/suspend
   */
  static async suspendLicense(req: Request, res: Response): Promise<void> {
    try {
      const { license_key, reason } = req.body;

      if (!license_key) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'License key is required',
          code: 'MISSING_LICENSE_KEY'
        });
        return;
      }

      const license = await License.findByLicenseKey(license_key);
      if (!license) {
        res.status(404).json({
          error: 'LICENSE_NOT_FOUND',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      license.status = 'suspended';
      await license.save();

      res.status(200).json({
        success: true,
        message: 'License suspended successfully',
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          suspended_at: new Date()
        },
        reason: reason || 'No reason provided'
      });

    } catch (error) {
      console.error('Suspend license error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to suspend license',
        code: 'SUSPEND_FAILED'
      });
    }
  }

  /**
   * Reactivate a suspended license (admin only)
   * POST /license/reactivate
   */
  static async reactivateLicense(req: Request, res: Response): Promise<void> {
    try {
      const { license_key } = req.body;

      if (!license_key) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'License key is required',
          code: 'MISSING_LICENSE_KEY'
        });
        return;
      }

      const license = await License.findByLicenseKey(license_key);
      if (!license) {
        res.status(404).json({
          error: 'LICENSE_NOT_FOUND',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Check if it should be expired
      if (license.isExpired()) {
        res.status(400).json({
          error: 'LICENSE_EXPIRED',
          message: 'Cannot reactivate expired license',
          code: 'CANNOT_REACTIVATE_EXPIRED',
          expires_at: license.expires_at
        });
        return;
      }

      license.status = 'active';
      await license.save();

      res.status(200).json({
        success: true,
        message: 'License reactivated successfully',
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          reactivated_at: new Date()
        }
      });

    } catch (error) {
      console.error('Reactivate license error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to reactivate license',
        code: 'REACTIVATE_FAILED'
      });
    }
  }

  /**
   * Get licenses expiring soon (admin endpoint)
   * GET /license/expiring-soon
   */
  static async getExpiringSoon(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const now = new Date();
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

      const expiringLicenses = await License.findAll({
        where: {
          expires_at: {
            [Op.between]: [now, futureDate]
          },
          status: 'active',
          type: {
            [Op.ne]: 'free'
          }
        },
        order: [['expires_at', 'ASC']]
      });

      const licensesWithDays = expiringLicenses.map(license => ({
        license_key: license.license_key,
        domain: license.domain,
        type: license.type,
        expires_at: license.expires_at,
        days_until_expiry: Math.ceil((license.expires_at!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));

      res.status(200).json({
        success: true,
        message: `Found ${expiringLicenses.length} licenses expiring in the next ${days} days`,
        count: expiringLicenses.length,
        licenses: licensesWithDays
      });

    } catch (error) {
      console.error('Get expiring licenses error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get expiring licenses',
        code: 'EXPIRING_LICENSES_FAILED'
      });
    }
  }

  /**
   * Handle expired license - degrade to FREE
   */
  private static async handleExpiredLicense(license: License): Promise<void> {
    try {
      if (license.type !== 'free') {
        // Degrade to FREE
        license.type = 'free';
        license.monthly_limit = 10;
        license.status = 'active'; // Keep active but as FREE

        // Reset usage for new FREE limits
        if (license.current_usage > 10) {
          license.current_usage = 10; // Set to limit so no more generations until reset
        }

        await license.save();

        console.log(`License ${license.license_key} expired and degraded to FREE`);
      }
    } catch (error) {
      console.error('Error handling expired license:', error);
    }
  }

  /**
   * Save Google API Key for a license
   * POST /license/save-google-api-key
   */
  static async saveGoogleApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { googleApiKey, domain } = req.body;
      const license = req.license; // From auth middleware

      // Check if license exists
      if (!license) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'License not found or invalid',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Validate required fields
      if (!googleApiKey) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Google API key is required',
          code: 'MISSING_GOOGLE_API_KEY'
        });
        return;
      }

      // Basic API key format validation
      if (!googleApiKey.startsWith('AIza') || googleApiKey.length < 30) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid Google API key format',
          code: 'INVALID_API_KEY_FORMAT'
        });
        return;
      }

      // Validate domain matches license domain
      if (
        domain
        && license.domain.replace('http://', '').replace('https://', '') !== domain.replace('http://', '').replace('https://', '')
      ) {
        res.status(403).json({
          error: 'DOMAIN_MISMATCH',
          message: 'Domain does not match license domain',
          code: 'DOMAIN_MISMATCH'
        });
        return;
      }

      // Update the Google API key (encrypted)
      await license.updateGoogleApiKey(googleApiKey);

      // Return success with masked API key
      const maskedApiKey = googleApiKey.substring(0, 4) + '****' + googleApiKey.slice(-4);

      res.status(200).json({
        success: true,
        message: 'Google API key saved successfully',
        data: {
          license_key: license.license_key,
          domain: license.domain,
          google_api_key: maskedApiKey,
          updated_at: new Date()
        }
      });

    } catch (error) {
      console.error('Save Google API key error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to save Google API key',
        code: 'SAVE_API_KEY_FAILED'
      });
    }
  }

  /**
   * Get rate limit seconds based on license type
   */
  private static getRateLimitSeconds(type: string): number {
    switch (type) {
      case 'free':
        return 60;
      case 'pro_basic':
        return 30;
      case 'pro_premium':
        return 15;
      default:
        return 60;
    }
  }
}

export default LicenseController;