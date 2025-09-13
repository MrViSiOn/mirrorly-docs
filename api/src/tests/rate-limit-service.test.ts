import { RateLimitService } from '../services/RateLimitService';
import { License, RateLimit, sequelize, initializeAssociations } from '../models';

describe('RateLimitService', () => {
  let testLicense: License;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Initialize associations
    initializeAssociations();

    // Ensure database connection
    await sequelize.authenticate();

    // Sync models for testing
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Create a test license
    testLicense = await License.create({
      license_key: 'TEST-KEY-' + Date.now(),
      domain: 'test.example.com',
      type: 'free',
      status: 'active',
      monthly_limit: 10,
      current_usage: 0,
      last_reset: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up test data
    await RateLimit.destroy({ where: {} });
    await License.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('checkLimits', () => {
    it('should allow generation for valid license within limits', async () => {
      const result = await RateLimitService.checkLimits(testLicense.id);

      expect(result.allowed).toBe(true);
      expect(result.remainingGenerations).toBe(10);
      expect(result.currentUsage).toBe(0);
      expect(result.monthlyLimit).toBe(10);
    });

    it('should deny generation when monthly limit is exceeded', async () => {
      // Set usage to limit
      testLicense.current_usage = 10;
      await testLicense.save();

      const result = await RateLimitService.checkLimits(testLicense.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Monthly limit exceeded');
      expect(result.remainingGenerations).toBe(0);
    });

    it('should deny generation for expired license', async () => {
      // Set license as expired
      testLicense.expires_at = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await testLicense.save();

      const result = await RateLimitService.checkLimits(testLicense.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('License expired');
    });

    it('should deny generation for inactive license', async () => {
      // Set license as suspended
      testLicense.status = 'suspended';
      await testLicense.save();

      const result = await RateLimitService.checkLimits(testLicense.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('License not active');
    });

    it('should handle rate limiting correctly', async () => {
      // Create a rate limit record that blocks requests
      await RateLimit.create({
        license_id: testLicense.id,
        last_request: new Date(),
        request_count: 1,
        window_start: new Date(),
        window_duration_ms: 60000, // 1 minute
        max_requests: 1,
      });

      const result = await RateLimitService.checkLimits(testLicense.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded');
      expect(result.remainingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage counter', async () => {
      await RateLimitService.incrementUsage(testLicense.id);

      await testLicense.reload();
      expect(testLicense.current_usage).toBe(1);
    });

    it('should reset usage if month has changed', async () => {
      // Set last reset to previous month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      testLicense.last_reset = lastMonth;
      testLicense.current_usage = 5;
      await testLicense.save();

      await RateLimitService.incrementUsage(testLicense.id);

      await testLicense.reload();
      expect(testLicense.current_usage).toBe(1); // Reset to 0, then incremented to 1
    });
  });

  describe('getUsageStats', () => {
    it('should return correct usage statistics', async () => {
      testLicense.current_usage = 3;
      await testLicense.save();

      const stats = await RateLimitService.getUsageStats(testLicense.id);

      expect(stats).toBeDefined();
      expect(stats!.currentUsage).toBe(3);
      expect(stats!.monthlyLimit).toBe(10);
      expect(stats!.remainingGenerations).toBe(7);
      expect(stats!.rateLimitSeconds).toBe(60); // FREE license
    });

    it('should return null for non-existent license', async () => {
      const stats = await RateLimitService.getUsageStats(99999);
      expect(stats).toBeNull();
    });
  });

  describe('getLimitConfig', () => {
    it('should return correct config for free license', () => {
      const config = RateLimitService.getLimitConfig('free');

      expect(config.monthlyGenerations).toBe(10);
      expect(config.rateLimitSeconds).toBe(60);
      expect(config.maxProducts).toBe(3);
      expect(config.imageMaxSizeKB).toBe(2048);
    });

    it('should return correct config for pro_basic license', () => {
      const config = RateLimitService.getLimitConfig('pro_basic');

      expect(config.monthlyGenerations).toBe(100);
      expect(config.rateLimitSeconds).toBe(30);
      expect(config.maxProducts).toBe(-1);
      expect(config.imageMaxSizeKB).toBe(5120);
    });

    it('should return correct config for pro_premium license', () => {
      const config = RateLimitService.getLimitConfig('pro_premium');

      expect(config.monthlyGenerations).toBe(500);
      expect(config.rateLimitSeconds).toBe(15);
      expect(config.maxProducts).toBe(-1);
      expect(config.imageMaxSizeKB).toBe(10240);
    });

    it('should return free config for unknown license type', () => {
      const config = RateLimitService.getLimitConfig('unknown');

      expect(config.monthlyGenerations).toBe(10);
      expect(config.rateLimitSeconds).toBe(60);
    });
  });

  describe('canUseProducts', () => {
    it('should allow unlimited products for PRO licenses', () => {
      expect(RateLimitService.canUseProducts('pro_basic', 100)).toBe(true);
      expect(RateLimitService.canUseProducts('pro_premium', 1000)).toBe(true);
    });

    it('should limit products for FREE license', () => {
      expect(RateLimitService.canUseProducts('free', 2)).toBe(true);
      expect(RateLimitService.canUseProducts('free', 3)).toBe(true);
      expect(RateLimitService.canUseProducts('free', 4)).toBe(false);
    });
  });

  describe('isImageSizeAllowed', () => {
    it('should enforce image size limits correctly', () => {
      // FREE license - 2MB limit
      expect(RateLimitService.isImageSizeAllowed('free', 1024)).toBe(true);
      expect(RateLimitService.isImageSizeAllowed('free', 2048)).toBe(true);
      expect(RateLimitService.isImageSizeAllowed('free', 3000)).toBe(false);

      // PRO Basic - 5MB limit
      expect(RateLimitService.isImageSizeAllowed('pro_basic', 5120)).toBe(true);
      expect(RateLimitService.isImageSizeAllowed('pro_basic', 6000)).toBe(false);

      // PRO Premium - 10MB limit
      expect(RateLimitService.isImageSizeAllowed('pro_premium', 10240)).toBe(true);
      expect(RateLimitService.isImageSizeAllowed('pro_premium', 11000)).toBe(false);
    });
  });

  describe('validateLicenseForGeneration', () => {
    it('should validate active license correctly', async () => {
      const result = await RateLimitService.validateLicenseForGeneration(testLicense.id);

      expect(result.valid).toBe(true);
      expect(result.canGenerate).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.usageStats).toBeDefined();
    });

    it('should reject expired license', async () => {
      testLicense.expires_at = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await testLicense.save();

      const result = await RateLimitService.validateLicenseForGeneration(testLicense.id);

      expect(result.valid).toBe(false);
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toBe('License status is expired');
    });

    it('should reject license at usage limit', async () => {
      testLicense.current_usage = 10;
      await testLicense.save();

      const result = await RateLimitService.validateLicenseForGeneration(testLicense.id);

      expect(result.valid).toBe(true); // License itself is valid
      expect(result.canGenerate).toBe(false); // But can't generate
      expect(result.reason).toBe('Monthly generation limit exceeded');
    });
  });

  describe('resetMonthlyUsageForAll', () => {
    it('should reset usage for licenses that need it', async () => {
      // Create license with old reset date
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1);

      const oldLicense = await License.create({
        license_key: 'OLD-LICENSE-' + Date.now(),
        domain: 'old.example.com',
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 8,
        last_reset: oldDate,
      });

      const resetCount = await RateLimitService.resetMonthlyUsageForAll();

      expect(resetCount).toBe(1);

      await oldLicense.reload();
      expect(oldLicense.current_usage).toBe(0);
    });
  });
});