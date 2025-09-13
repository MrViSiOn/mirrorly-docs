import { Request, Response, NextFunction } from 'express';
import { RateLimitService, RateLimitResult, UsageStats } from '../services/RateLimitService';

// Extend Request interface to include rate limit info
declare global {
  namespace Express {
    interface Request {
      rateLimitResult?: RateLimitResult;
      usageStats?: UsageStats;
    }
  }
}

/**
 * Middleware for rate limiting and usage control
 */
export class RateLimitMiddleware {
  /**
   * Check rate limits before allowing generation requests
   */
  static async checkGenerationLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = req.license;
      const licenseId = req.licenseId;

      if (!license || !licenseId) {
        res.status(401).json({
          error: 'LIMIT_001',
          message: 'License authentication required for rate limiting',
          code: 'MISSING_LICENSE_FOR_RATE_LIMIT'
        });
        return;
      }

      // Check all rate limits
      const rateLimitResult = await RateLimitService.checkLimits(licenseId);

      // Attach result to request for logging
      req.rateLimitResult = rateLimitResult;

      if (!rateLimitResult.allowed) {
        const errorResponse: {
          error: string;
          message: string;
          code: string;
          details: {
            currentUsage: number;
            monthlyLimit: number;
            remainingGenerations: number;
            resetDate: Date;
            retryAfterMs?: number;
            retryAfterSeconds?: number;
          };
        } = {
          error: 'LIMIT_001',
          message: rateLimitResult.reason || 'Rate limit exceeded',
          code: RateLimitMiddleware.getErrorCode(rateLimitResult.reason),
          details: {
            currentUsage: rateLimitResult.currentUsage,
            monthlyLimit: rateLimitResult.monthlyLimit,
            remainingGenerations: rateLimitResult.remainingGenerations,
            resetDate: rateLimitResult.resetDate,
          }
        };

        // Add specific timing info for rate limit errors
        if (rateLimitResult.reason === 'Rate limit exceeded') {
          errorResponse.details.retryAfterMs = rateLimitResult.remainingTimeMs;
          errorResponse.details.retryAfterSeconds = Math.ceil(rateLimitResult.remainingTimeMs / 1000);

          // Set Retry-After header
          res.set('Retry-After', Math.ceil(rateLimitResult.remainingTimeMs / 1000).toString());
        }

        // Log rate limit violation
        console.log(`Rate limit exceeded for license ${licenseId}:`, {
          licenseType: license.type,
          reason: rateLimitResult.reason,
          currentUsage: rateLimitResult.currentUsage,
          monthlyLimit: rateLimitResult.monthlyLimit,
          remainingTimeMs: rateLimitResult.remainingTimeMs,
        });

        res.status(429).json(errorResponse);
        return;
      }

      // Add rate limit headers for successful requests
      res.set({
        'X-RateLimit-Limit': rateLimitResult.monthlyLimit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingGenerations.toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitResult.resetDate.getTime() / 1000).toString(),
      });

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Rate limiting check failed',
        code: 'RATE_LIMIT_CHECK_ERROR'
      });
    }
  }

  /**
   * Increment usage counters after successful generation
   */
  static async recordGeneration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const licenseId = req.licenseId;

      if (!licenseId) {
        console.warn('No license ID found for usage recording');
        next();
        return;
      }

      // Record the generation
      await RateLimitService.incrementUsage(licenseId);

      // Log successful generation
      console.log(`Generation recorded for license ${licenseId}`);

      next();
    } catch (error) {
      console.error('Error recording generation:', error);
      // Don't fail the request, just log the error
      next();
    }
  }

  /**
   * Check image size limits based on license type
   */
  static async checkImageSizeLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'LIMIT_001',
          message: 'License required for image size validation',
          code: 'MISSING_LICENSE_FOR_SIZE_CHECK'
        });
        return;
      }

      // Check uploaded files
      const files = req.files as { [fieldname: string]: any[] } | any[];

      if (!files) {
        next();
        return;
      }

      const filesToCheck: any[] = [];

      if (Array.isArray(files)) {
        filesToCheck.push(...files);
      } else {
        Object.values(files).forEach(fileArray => {
          filesToCheck.push(...fileArray);
        });
      }

      // Check each file size
      for (const file of filesToCheck) {
        const fileSizeKB = file.size / 1024;

        if (!RateLimitService.isImageSizeAllowed(license.type, fileSizeKB)) {
          const config = RateLimitService.getLimitConfig(license.type);

          res.status(413).json({
            error: 'IMG_002',
            message: 'Image size exceeds limit for license type',
            code: 'IMAGE_SIZE_EXCEEDED',
            details: {
              fileName: file.originalname,
              fileSizeKB: Math.round(fileSizeKB),
              maxSizeKB: config.imageMaxSizeKB,
              licenseType: license.type,
            }
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Image size check error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Image size validation failed',
        code: 'IMAGE_SIZE_CHECK_ERROR'
      });
    }
  }

  /**
   * Check product limits for PRO features
   */
  static async checkProductLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = req.license;

      if (!license) {
        res.status(401).json({
          error: 'LIMIT_001',
          message: 'License required for product limit validation',
          code: 'MISSING_LICENSE_FOR_PRODUCT_CHECK'
        });
        return;
      }

      // Get product count from request (this would be set by the calling controller)
      const productCount = req.body.productCount || 1;

      if (!RateLimitService.canUseProducts(license.type, productCount)) {
        const config = RateLimitService.getLimitConfig(license.type);

        res.status(403).json({
          error: 'LIMIT_003',
          message: 'Product limit exceeded for license type',
          code: 'PRODUCT_LIMIT_EXCEEDED',
          details: {
            requestedProducts: productCount,
            maxProducts: config.maxProducts,
            licenseType: license.type,
          }
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Product limit check error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Product limit validation failed',
        code: 'PRODUCT_LIMIT_CHECK_ERROR'
      });
    }
  }

  /**
   * Add usage statistics to response headers
   */
  static async addUsageHeaders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const licenseId = req.licenseId;

      if (licenseId) {
        const usageStats = await RateLimitService.getUsageStats(licenseId);

        if (usageStats) {
          res.set({
            'X-Usage-Current': usageStats.currentUsage.toString(),
            'X-Usage-Limit': usageStats.monthlyLimit.toString(),
            'X-Usage-Remaining': usageStats.remainingGenerations.toString(),
            'X-Usage-Reset': Math.floor(usageStats.nextReset.getTime() / 1000).toString(),
            'X-RateLimit-Seconds': usageStats.rateLimitSeconds.toString(),
          });

          if (usageStats.timeUntilNextRequest > 0) {
            res.set('X-RateLimit-Retry-After', Math.ceil(usageStats.timeUntilNextRequest / 1000).toString());
          }

          // Attach to request for potential use in controllers
          req.usageStats = usageStats;
        }
      }

      next();
    } catch (error) {
      console.error('Error adding usage headers:', error);
      // Don't fail the request, just continue without headers
      next();
    }
  }

  /**
   * Comprehensive rate limiting middleware that combines all checks
   */
  static async comprehensiveRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Chain all the middleware functions
      await RateLimitMiddleware.checkImageSizeLimits(req, res, async () => {
        await RateLimitMiddleware.checkProductLimits(req, res, async () => {
          await RateLimitMiddleware.checkGenerationLimits(req, res, async () => {
            await RateLimitMiddleware.addUsageHeaders(req, res, next);
          });
        });
      });
    } catch (error) {
      console.error('Comprehensive rate limit error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Rate limiting failed',
        code: 'COMPREHENSIVE_RATE_LIMIT_ERROR'
      });
    }
  }

  /**
   * Middleware for endpoints that only need usage stats (no limits)
   */
  static async addUsageStatsOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await RateLimitMiddleware.addUsageHeaders(req, res, next);
    } catch (error) {
      console.error('Error adding usage stats:', error);
      next();
    }
  }

  /**
   * Get appropriate error code based on reason
   */
  private static getErrorCode(reason?: string): string {
    switch (reason) {
      case 'License not found':
        return 'LICENSE_NOT_FOUND';
      case 'License expired':
        return 'LICENSE_EXPIRED';
      case 'License not active':
        return 'LICENSE_INACTIVE';
      case 'Monthly limit exceeded':
        return 'MONTHLY_LIMIT_EXCEEDED';
      case 'Rate limit exceeded':
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'RATE_LIMIT_ERROR';
    }
  }

  /**
   * Create a custom rate limit middleware with specific configuration
   */
  static createCustomRateLimit(options: {
    skipImageSizeCheck?: boolean;
    skipProductLimitCheck?: boolean;
    skipGenerationLimitCheck?: boolean;
    addUsageHeaders?: boolean;
  } = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const middlewares: Array<(req: Request, res: Response, next: NextFunction) => Promise<void>> = [];

        if (!options.skipImageSizeCheck) {
          middlewares.push(RateLimitMiddleware.checkImageSizeLimits);
        }

        if (!options.skipProductLimitCheck) {
          middlewares.push(RateLimitMiddleware.checkProductLimits);
        }

        if (!options.skipGenerationLimitCheck) {
          middlewares.push(RateLimitMiddleware.checkGenerationLimits);
        }

        if (options.addUsageHeaders !== false) {
          middlewares.push(RateLimitMiddleware.addUsageHeaders);
        }

        // Execute middlewares in sequence
        let index = 0;
        const executeNext = async (): Promise<void> => {
          if (index >= middlewares.length) {
            next();
            return;
          }

          const middleware = middlewares[index++];
          await middleware(req, res, executeNext);
        };

        await executeNext();
      } catch (error) {
        console.error('Custom rate limit middleware error:', error);
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Rate limiting failed',
          code: 'CUSTOM_RATE_LIMIT_ERROR'
        });
      }
    };
  }
}

export default RateLimitMiddleware;