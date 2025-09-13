import { License } from '../models/License';
import { RateLimit } from '../models/RateLimit';
import { Op } from 'sequelize';

export interface RateLimitConfig {
  monthlyGenerations: number;
  rateLimitSeconds: number;
  maxProducts: number;
  imageMaxSizeKB: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remainingGenerations: number;
  remainingTimeMs: number;
  resetDate: Date;
  currentUsage: number;
  monthlyLimit: number;
}

export interface UsageStats {
  currentUsage: number;
  monthlyLimit: number;
  remainingGenerations: number;
  lastReset: Date;
  nextReset: Date;
  rateLimitSeconds: number;
  lastRequest?: Date;
  timeUntilNextRequest: number;
}

export class RateLimitService {
  private static readonly LIMITS_CONFIG: Record<string, RateLimitConfig> = {
    free: {
      monthlyGenerations: 10,
      rateLimitSeconds: 60,
      maxProducts: 3,
      imageMaxSizeKB: 2048,
    },
    pro_basic: {
      monthlyGenerations: 100,
      rateLimitSeconds: 30,
      maxProducts: -1, // unlimited
      imageMaxSizeKB: 5120,
    },
    pro_premium: {
      monthlyGenerations: 500,
      rateLimitSeconds: 15,
      maxProducts: -1, // unlimited
      imageMaxSizeKB: 10240,
    },
  };

  /**
   * Check if a license can make a generation request
   */
  public static async checkLimits(licenseId: number): Promise<RateLimitResult> {
    try {
      const license = await License.findByPk(licenseId);
      if (!license) {
        return {
          allowed: false,
          reason: 'License not found',
          remainingGenerations: 0,
          remainingTimeMs: 0,
          resetDate: new Date(),
          currentUsage: 0,
          monthlyLimit: 0,
        };
      }

      // Check if license is active and not expired
      if (license.status !== 'active' || license.isExpired()) {
        return {
          allowed: false,
          reason: license.isExpired() ? 'License expired' : 'License not active',
          remainingGenerations: 0,
          remainingTimeMs: 0,
          resetDate: new Date(),
          currentUsage: license.current_usage,
          monthlyLimit: license.monthly_limit,
        };
      }

      // Check if monthly usage needs reset
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      // Check monthly limit
      if (license.current_usage >= license.monthly_limit) {
        const nextReset = this.getNextResetDate(license.last_reset);
        return {
          allowed: false,
          reason: 'Monthly limit exceeded',
          remainingGenerations: 0,
          remainingTimeMs: 0,
          resetDate: nextReset,
          currentUsage: license.current_usage,
          monthlyLimit: license.monthly_limit,
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(licenseId, license.type);
      if (!rateLimitCheck.allowed) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          remainingGenerations: license.getRemainingGenerations(),
          remainingTimeMs: rateLimitCheck.resetTime,
          resetDate: this.getNextResetDate(license.last_reset),
          currentUsage: license.current_usage,
          monthlyLimit: license.monthly_limit,
        };
      }

      // All checks passed
      return {
        allowed: true,
        remainingGenerations: license.getRemainingGenerations(),
        remainingTimeMs: 0,
        resetDate: this.getNextResetDate(license.last_reset),
        currentUsage: license.current_usage,
        monthlyLimit: license.monthly_limit,
      };

    } catch (error) {
      console.error('Error checking rate limits:', error);
      return {
        allowed: false,
        reason: 'Internal error checking limits',
        remainingGenerations: 0,
        remainingTimeMs: 0,
        resetDate: new Date(),
        currentUsage: 0,
        monthlyLimit: 0,
      };
    }
  }

  /**
   * Check rate limiting (time-based restrictions)
   */
  private static async checkRateLimit(licenseId: number, licenseType: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const config = this.LIMITS_CONFIG[licenseType] || this.LIMITS_CONFIG.free;
    const windowDurationMs = config.rateLimitSeconds * 1000;

    let rateLimit = await RateLimit.findByLicenseId(licenseId);

    if (!rateLimit) {
      // Create new rate limit record
      rateLimit = await RateLimit.createForLicense(
        licenseId,
        1, // Max 1 request per window for time-based limiting
        windowDurationMs
      );
    }

    // Update rate limit configuration if license type changed
    if (rateLimit.window_duration_ms !== windowDurationMs) {
      rateLimit.window_duration_ms = windowDurationMs;
      await rateLimit.save();
    }

    const allowed = rateLimit.canMakeRequest();
    const remaining = rateLimit.getRemainingRequests();
    const resetTime = rateLimit.getTimeUntilReset();

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  /**
   * Record a successful generation and increment usage counters
   */
  public static async incrementUsage(licenseId: number): Promise<void> {
    try {
      const license = await License.findByPk(licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      // Check if monthly usage needs reset before incrementing
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      // Increment monthly usage
      await license.incrementUsage();

      // Record rate limit request
      const rateLimit = await RateLimit.findByLicenseId(licenseId);
      if (rateLimit) {
        await rateLimit.recordRequest();
      }

    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  /**
   * Get current usage statistics for a license
   */
  public static async getUsageStats(licenseId: number): Promise<UsageStats | null> {
    try {
      const license = await License.findByPk(licenseId);
      if (!license) {
        return null;
      }

      // Check if monthly usage needs reset
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      const config = this.LIMITS_CONFIG[license.type] || this.LIMITS_CONFIG.free;
      const rateLimit = await RateLimit.findByLicenseId(licenseId);

      let timeUntilNextRequest = 0;
      if (rateLimit && !rateLimit.canMakeRequest()) {
        timeUntilNextRequest = rateLimit.getTimeUntilReset();
      }

      return {
        currentUsage: license.current_usage,
        monthlyLimit: license.monthly_limit,
        remainingGenerations: license.getRemainingGenerations(),
        lastReset: license.last_reset,
        nextReset: this.getNextResetDate(license.last_reset),
        rateLimitSeconds: config.rateLimitSeconds,
        lastRequest: rateLimit?.last_request,
        timeUntilNextRequest,
      };

    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Get rate limit configuration for a license type
   */
  public static getLimitConfig(licenseType: string): RateLimitConfig {
    return this.LIMITS_CONFIG[licenseType] || this.LIMITS_CONFIG.free;
  }

  /**
   * Reset monthly usage for all licenses (scheduled task)
   */
  public static async resetMonthlyUsageForAll(): Promise<number> {
    try {
      const licensesToReset = await License.findAll({
        where: {
          status: 'active',
          last_reset: {
            [Op.lt]: this.getMonthStart(),
          },
        },
      });

      let resetCount = 0;
      for (const license of licensesToReset) {
        if (license.shouldResetUsage()) {
          await license.resetMonthlyUsage();
          resetCount++;
        }
      }

      console.log(`Reset monthly usage for ${resetCount} licenses`);
      return resetCount;

    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Clean up old rate limit records
   */
  public static async cleanupOldRateLimits(daysOld: number = 30): Promise<number> {
    try {
      return await RateLimit.cleanupOldRateLimits(daysOld);
    } catch (error) {
      console.error('Error cleaning up old rate limits:', error);
      throw error;
    }
  }

  /**
   * Get statistics for monitoring and analytics
   */
  public static async getSystemStats(): Promise<{
    totalActiveLicenses: number;
    totalUsageThisMonth: number;
    averageUsagePerLicense: number;
    licensesNearLimit: number;
    rateLimitedRequests: number;
  }> {
    try {
      const monthStart = this.getMonthStart();

      const activeLicenses = await License.findAll({
        where: {
          status: 'active',
        },
      });

      const totalActiveLicenses = activeLicenses.length;
      const totalUsageThisMonth = activeLicenses.reduce(
        (sum, license) => sum + license.current_usage,
        0
      );
      const averageUsagePerLicense = totalActiveLicenses > 0
        ? totalUsageThisMonth / totalActiveLicenses
        : 0;

      const licensesNearLimit = activeLicenses.filter(
        license => license.current_usage >= license.monthly_limit * 0.8
      ).length;

      // Count rate limited requests (requests that hit the rate limit window)
      const rateLimitedRequests = await RateLimit.count({
        where: {
          request_count: {
            [Op.gte]: 1,
          },
          window_start: {
            [Op.gte]: monthStart,
          },
        },
      });

      return {
        totalActiveLicenses,
        totalUsageThisMonth,
        averageUsagePerLicense: Math.round(averageUsagePerLicense * 100) / 100,
        licensesNearLimit,
        rateLimitedRequests,
      };

    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Check if a license can use a specific number of products
   */
  public static canUseProducts(licenseType: string, productCount: number): boolean {
    const config = this.LIMITS_CONFIG[licenseType] || this.LIMITS_CONFIG.free;
    return config.maxProducts === -1 || productCount <= config.maxProducts;
  }

  /**
   * Check if an image size is within limits for a license type
   */
  public static isImageSizeAllowed(licenseType: string, imageSizeKB: number): boolean {
    const config = this.LIMITS_CONFIG[licenseType] || this.LIMITS_CONFIG.free;
    return imageSizeKB <= config.imageMaxSizeKB;
  }

  /**
   * Get the start of the current month
   */
  private static getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get the next reset date (start of next month)
   */
  private static getNextResetDate(lastReset: Date): Date {
    const resetDate = new Date(lastReset);
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);
    return resetDate;
  }

  /**
   * Validate license and get detailed status
   */
  public static async validateLicenseForGeneration(licenseId: number): Promise<{
    valid: boolean;
    license?: License;
    reason?: string;
    canGenerate: boolean;
    usageStats?: UsageStats;
  }> {
    try {
      const license = await License.findByPk(licenseId);
      if (!license) {
        return {
          valid: false,
          reason: 'License not found',
          canGenerate: false,
        };
      }

      // Check if monthly usage needs reset
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      const usageStats = await this.getUsageStats(licenseId);
      const canGenerate = license.canGenerate();

      let reason: string | undefined;
      if (!canGenerate) {
        if (license.status !== 'active') {
          reason = `License status is ${license.status}`;
        } else if (license.isExpired()) {
          reason = 'License has expired';
        } else if (license.current_usage >= license.monthly_limit) {
          reason = 'Monthly generation limit exceeded';
        }
      }

      return {
        valid: license.status === 'active' && !license.isExpired(),
        license,
        reason,
        canGenerate,
        usageStats: usageStats || undefined,
      };

    } catch (error) {
      console.error('Error validating license:', error);
      return {
        valid: false,
        reason: 'Error validating license',
        canGenerate: false,
      };
    }
  }
}

export default RateLimitService;