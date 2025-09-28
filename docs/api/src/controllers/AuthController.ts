import { Request, Response } from 'express';
import { License } from '../models/License';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { loggingService } from '../services/LoggingService';

/**
 * Controller for authentication and license management
 */
export class AuthController {
  /**
   * Register a new FREE license
   * POST /auth/register-free
   */
  static async registerFree(req: Request, res: Response): Promise<void> {
    try {
      const { domain } = req.body;

      // Validate required fields
      if (!domain) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Domain is required',
          code: 'MISSING_DOMAIN'
        });
        return;
      }

      // Normalize domain
      const normalizedDomain = domain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(normalizedDomain)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid domain format',
          code: 'INVALID_DOMAIN_FORMAT'
        });
        return;
      }

      // Check if domain already has a license
      const existingLicense = await License.findByDomain(normalizedDomain);
      if (existingLicense) {
        res.status(409).json({
          error: 'DOMAIN_EXISTS',
          message: 'Domain already has a license',
          code: 'DOMAIN_ALREADY_REGISTERED',
          existing_license: {
            type: existingLicense.type,
            status: existingLicense.status,
            created_at: existingLicense.created_at
          }
        });
        return;
      }

      // Create FREE license
      const license = await License.createFreeLicense(normalizedDomain);

      // Log successful registration
      loggingService.info('FREE license registered', {
        requestId: req.id,
        licenseId: String(license.id),
        domain: normalizedDomain,
        licenseType: 'free'
      });

      // Generate JWT token for immediate use
      const token = AuthMiddleware.generateJWT(license.id, license.domain);

      res.status(201).json({
        success: true,
        message: 'FREE license created successfully',
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          created_at: license.created_at
        },
        token,
        limits: {
          monthly_generations: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          rate_limit_seconds: 60 // FREE rate limit
        }
      });

    } catch (error) {
      loggingService.error('Failed to register FREE license', error as Error, {
        requestId: req.id,
        domain: req.body.domain
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to register FREE license',
        code: 'REGISTRATION_FAILED'
      });
    }
  }

  /**
   * Register a new PRO license
   * POST /auth/register-pro
   */
  static async registerPro(req: Request, res: Response): Promise<void> {
    try {
      const { domain, license_key, type = 'pro_basic', expires_at } = req.body;

      // Validate required fields
      if (!domain || !license_key) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Domain and license key are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // Validate license type
      if (!['pro_basic', 'pro_premium'].includes(type)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid license type',
          code: 'INVALID_LICENSE_TYPE'
        });
        return;
      }

      // Normalize domain
      const normalizedDomain = domain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(normalizedDomain)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid domain format',
          code: 'INVALID_DOMAIN_FORMAT'
        });
        return;
      }

      // Check if license key already exists
      const existingLicenseKey = await License.findByLicenseKey(license_key);
      if (existingLicenseKey) {
        res.status(409).json({
          error: 'LICENSE_EXISTS',
          message: 'License key already exists',
          code: 'LICENSE_KEY_ALREADY_EXISTS'
        });
        return;
      }

      // Check if domain already has a license
      const existingDomain = await License.findByDomain(normalizedDomain);
      if (existingDomain) {
        // If it's a FREE license, we can upgrade it
        if (existingDomain.type === 'free') {
          existingDomain.license_key = license_key;
          existingDomain.type = type;
          existingDomain.monthly_limit = type === 'pro_basic' ? 100 : 500;
          existingDomain.expires_at = expires_at ? new Date(expires_at) : undefined;
          existingDomain.status = 'active';
          await existingDomain.save();

          // Log license upgrade
          loggingService.info('License upgraded to PRO', {
            requestId: req.id,
            licenseId: String(existingDomain.id),
            domain: normalizedDomain,
            licenseType: type,
            previousType: 'free'
          });

          const token = AuthMiddleware.generateJWT(existingDomain.id, existingDomain.domain);

          res.status(200).json({
            success: true,
            message: 'License upgraded to PRO successfully',
            license: {
              license_key: existingDomain.license_key,
              domain: existingDomain.domain,
              type: existingDomain.type,
              status: existingDomain.status,
              monthly_limit: existingDomain.monthly_limit,
              current_usage: existingDomain.current_usage,
              expires_at: existingDomain.expires_at,
              created_at: existingDomain.created_at
            },
            token,
            limits: {
              monthly_generations: existingDomain.monthly_limit,
              remaining_generations: existingDomain.getRemainingGenerations(),
              rate_limit_seconds: type === 'pro_basic' ? 30 : 15
            }
          });
          return;
        } else {
          res.status(409).json({
            error: 'DOMAIN_EXISTS',
            message: 'Domain already has a PRO license',
            code: 'DOMAIN_ALREADY_HAS_PRO'
          });
          return;
        }
      }

      // Set monthly limit based on type
      const monthlyLimit = type === 'pro_basic' ? 100 : 500;

      // Create PRO license
      const license = await License.create({
        license_key,
        domain: normalizedDomain,
        type,
        status: 'active',
        monthly_limit: monthlyLimit,
        current_usage: 0,
        last_reset: new Date(),
        expires_at: expires_at ? new Date(expires_at) : undefined
      });

      // Log successful PRO registration
      loggingService.info('PRO license registered', {
        requestId: req.id,
        licenseId: String(license.id),
        domain: normalizedDomain,
        licenseType: type
      });

      // Generate JWT token
      const token = AuthMiddleware.generateJWT(license.id, license.domain);

      res.status(201).json({
        success: true,
        message: 'PRO license created successfully',
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          expires_at: license.expires_at,
          created_at: license.created_at
        },
        token,
        limits: {
          monthly_generations: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          rate_limit_seconds: type === 'pro_basic' ? 30 : 15
        }
      });

    } catch (error) {
      loggingService.error('Failed to register PRO license', error as Error, {
        requestId: req.id,
        domain: req.body.domain,
        licenseType: req.body.type
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to register PRO license',
        code: 'REGISTRATION_FAILED'
      });
    }
  }

  /**
   * Validate an existing license
   * POST /auth/validate-license
   */
  static async validateLicense(req: Request, res: Response): Promise<void> {
    try {
      const { license_key, domain } = req.body;

      if (!license_key) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'License key is required',
          code: 'MISSING_LICENSE_KEY'
        });
        return;
      }

      // Find license
      const license = await License.findByLicenseKey(license_key);
      if (!license) {
        res.status(404).json({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        });
        return;
      }

      // Validate domain if provided
      if (domain) {
        const normalizedDomain = domain.toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');

        if (license.domain !== normalizedDomain) {
          loggingService.logLicenseValidation(license.id, normalizedDomain, false, 'Domain not authorized');

          res.status(403).json({
            error: 'AUTH_003',
            message: 'Domain not authorized for this license',
            code: 'UNAUTHORIZED_DOMAIN',
            authorized_domain: license.domain
          });
          return;
        }
      }

      // Check if expired
      if (license.isExpired()) {
        license.status = 'expired';
        await license.save();

        res.status(401).json({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
          expires_at: license.expires_at
        });
        return;
      }

      // Reset usage if needed
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      // Log successful validation
      loggingService.logLicenseValidation(license.id, license.domain, true);

      // Generate new token
      const token = AuthMiddleware.generateJWT(license.id, license.domain);

      res.status(200).json({
        success: true,
        message: 'License is valid',
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          expires_at: license.expires_at,
          created_at: license.created_at
        },
        token,
        limits: {
          monthly_generations: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          rate_limit_seconds: license.type === 'free' ? 60 : (license.type === 'pro_basic' ? 30 : 15)
        }
      });

    } catch (error) {
      loggingService.error('License validation failed', error as Error, {
        requestId: req.id,
        licenseKey: req.body.license_key,
        domain: req.body.domain
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'License validation failed',
        code: 'VALIDATION_FAILED'
      });
    }
  }

  /**
   * Get current authentication status
   * GET /auth/status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // Check if expired
      if (license.isExpired()) {
        license.status = 'expired';
        await license.save();

        res.status(401).json({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
          expires_at: license.expires_at
        });
        return;
      }

      // Reset usage if needed
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      res.status(200).json({
        success: true,
        authenticated: true,
        license: {
          license_key: license.license_key,
          domain: license.domain,
          type: license.type,
          status: license.status,
          monthly_limit: license.monthly_limit,
          current_usage: license.current_usage,
          expires_at: license.expires_at,
          created_at: license.created_at
        },
        limits: {
          monthly_generations: license.monthly_limit,
          remaining_generations: license.getRemainingGenerations(),
          rate_limit_seconds: license.type === 'free' ? 60 : (license.type === 'pro_basic' ? 30 : 15),
          can_generate: license.canGenerate()
        }
      });

    } catch (error) {
      loggingService.error('Failed to get authentication status', error as Error, {
        requestId: req.id,
        licenseId: req.license?.id ? String(req.license.id) : undefined
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get authentication status',
        code: 'STATUS_CHECK_FAILED'
      });
    }
  }

  /**
   * Refresh JWT token
   * POST /auth/refresh-token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // Generate new token
      const token = AuthMiddleware.generateJWT(license.id, license.domain);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        token,
        expires_in: 24 * 60 * 60 // 24 hours in seconds
      });

    } catch (error) {
      loggingService.error('Failed to refresh token', error as Error, {
        requestId: req.id,
        licenseId: req.license?.id ? String(req.license.id) : undefined
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        code: 'TOKEN_REFRESH_FAILED'
      });
    }
  }
}

export default AuthController;