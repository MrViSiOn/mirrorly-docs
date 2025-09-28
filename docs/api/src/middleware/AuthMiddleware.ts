import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { License } from '../models/License';

// Extend Request interface to include license
declare global {
  namespace Express {
    interface Request {
      license?: License;
      licenseId?: number;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  license: License;
  licenseId: number;
}

/**
 * Middleware to validate API keys and authenticate requests
 */
export class AuthMiddleware {
  /**
   * Validate API key from request headers
   */
  static async validateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'API key is required',
          code: 'MISSING_API_KEY'
        });
        return;
      }

      // Find license by API key
      const license = await License.findByLicenseKey(apiKey);

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Invalid API key',
          code: 'INVALID_API_KEY'
        });
        return;
      }

      // Check if license is active
      if (license.status !== 'active') {
        res.status(401).json({
          error: 'AUTH_002',
          message: 'License is not active',
          code: 'INACTIVE_LICENSE',
          status: license.status
        });
        return;
      }

      // Check if license is expired
      if (license.isExpired()) {
        // Auto-expire the license
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

      // Reset monthly usage if needed
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      // Attach license to request
      req.license = license;
      req.licenseId = license.id;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authentication failed',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  }

  /**
   * Validate domain against license
   */
  static async validateDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = req.license;
      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found in request',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Get domain from request (can be from header or body)
      const requestDomain = (req.headers['x-domain'] as string) || req.body.domain;

      if (!requestDomain) {
        res.status(400).json({
          error: 'AUTH_003',
          message: 'Domain is required',
          code: 'MISSING_DOMAIN'
        });
        return;
      }

      // Normalize domain
      const normalizedDomain = requestDomain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

      // Check if domain matches license
      if (license.domain !== normalizedDomain) {
        res.status(403).json({
          error: 'AUTH_003',
          message: 'Domain not authorized for this license',
          code: 'UNAUTHORIZED_DOMAIN',
          authorized_domain: license.domain,
          requested_domain: normalizedDomain
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Domain validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Domain validation failed',
        code: 'DOMAIN_VALIDATION_ERROR'
      });
    }
  }

  /**
   * Validate PRO license requirements
   */
  static async requireProLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = req.license;
      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'License not found in request',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Check if license is PRO
      if (license.type === 'free') {
        res.status(403).json({
          error: 'LICENSE_001',
          message: 'PRO license required for this feature',
          code: 'PRO_LICENSE_REQUIRED',
          current_license: license.type
        });
        return;
      }

      next();
    } catch (error) {
      console.error('PRO license validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'License validation failed',
        code: 'LICENSE_VALIDATION_ERROR'
      });
    }
  }

  /**
   * Generate JWT token for internal sessions (if needed)
   */
  static generateJWT(licenseId: number, domain: string): string {
    const secret = process.env.JWT_SECRET || 'mirrorly-default-secret';
    const payload = {
      licenseId,
      domain,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, secret);
  }

  /**
   * Validate JWT token
   */
  static async validateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'JWT token is required',
          code: 'MISSING_JWT'
        });
        return;
      }

      const secret = process.env.JWT_SECRET || 'mirrorly-default-secret';
      const decoded = jwt.verify(token, secret) as any;

      // Find license by ID
      const license = await License.findByPk(decoded.licenseId);

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Invalid JWT token',
          code: 'INVALID_JWT'
        });
        return;
      }

      // Attach license to request
      req.license = license;
      req.licenseId = license.id;

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Invalid JWT token',
          code: 'INVALID_JWT'
        });
        return;
      }

      console.error('JWT validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'JWT validation failed',
        code: 'JWT_VALIDATION_ERROR'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no auth provided
   */
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (apiKey) {
        // Try to authenticate if API key is provided
        await AuthMiddleware.validateApiKey(req, res, next);
      } else {
        // Continue without authentication
        next();
      }
    } catch (error) {
      // Continue without authentication on error
      next();
    }
  }
}

export default AuthMiddleware;