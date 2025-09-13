import { License, Generation, RateLimit } from '../models';
import sequelize from '../config/db';

describe('Database Models', () => {
  beforeAll(async () => {
    // Use test database
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('License Model', () => {
    test('should create a free license', async () => {
      const license = await License.createFreeLicense('test.example.com');

      expect(license).toBeDefined();
      expect(license.domain).toBe('test.example.com');
      expect(license.type).toBe('free');
      expect(license.status).toBe('active');
      expect(license.monthly_limit).toBe(10);
      expect(license.current_usage).toBe(0);
      expect(license.license_key).toMatch(/^[A-Z0-9-]{39}$/);
    });

    test('should validate license key format', () => {
      const licenseKey = License.generateLicenseKey();
      expect(licenseKey).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/);
    });

    test('should check if license can generate', async () => {
      const license = await License.createFreeLicense('test2.example.com');

      expect(license.canGenerate()).toBe(true);

      // Simulate usage at limit
      license.current_usage = license.monthly_limit;
      expect(license.canGenerate()).toBe(false);
    });

    test('should reset monthly usage', async () => {
      const license = await License.createFreeLicense('test3.example.com');
      license.current_usage = 5;

      await license.resetMonthlyUsage();

      expect(license.current_usage).toBe(0);
      expect(license.last_reset).toBeInstanceOf(Date);
    });
  });

  describe('Generation Model', () => {
    let testLicense: License;

    beforeEach(async () => {
      testLicense = await License.createFreeLicense('generation-test.example.com');
    });

    test('should create a generation record', async () => {
      const generation = await Generation.create({
        license_id: testLicense.id,
        product_id: 'product-123',
        user_image_hash: 'user-hash-123',
        product_image_hash: 'product-hash-456',
        status: 'pending',
      });

      expect(generation).toBeDefined();
      expect(generation.license_id).toBe(testLicense.id);
      expect(generation.status).toBe('pending');
      expect(generation.isPending()).toBe(true);
    });

    test('should mark generation as completed', async () => {
      const generation = await Generation.create({
        license_id: testLicense.id,
        product_id: 'product-123',
        user_image_hash: 'user-hash-123',
        product_image_hash: 'product-hash-456',
        status: 'pending',
      });

      await generation.markAsCompleted('https://example.com/result.jpg', 5000, 'test prompt');

      expect(generation.status).toBe('completed');
      expect(generation.result_image_url).toBe('https://example.com/result.jpg');
      expect(generation.processing_time_ms).toBe(5000);
      expect(generation.used_prompt).toBe('test prompt');
      expect(generation.completed_at).toBeInstanceOf(Date);
    });

    test('should get usage stats', async () => {
      // Create some test generations
      await Generation.bulkCreate([
        {
          license_id: testLicense.id,
          product_id: 'product-1',
          user_image_hash: 'hash-1',
          product_image_hash: 'hash-2',
          status: 'completed',
        },
        {
          license_id: testLicense.id,
          product_id: 'product-2',
          user_image_hash: 'hash-3',
          product_image_hash: 'hash-4',
          status: 'failed',
        },
        {
          license_id: testLicense.id,
          product_id: 'product-3',
          user_image_hash: 'hash-5',
          product_image_hash: 'hash-6',
          status: 'pending',
        },
      ]);

      const stats = await Generation.getUsageStats(testLicense.id);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });

  describe('RateLimit Model', () => {
    let testLicense: License;

    beforeEach(async () => {
      testLicense = await License.createFreeLicense('ratelimit-test.example.com');
    });

    test('should create rate limit for license', async () => {
      const rateLimit = await RateLimit.createForLicense(testLicense.id, 5, 60000);

      expect(rateLimit).toBeDefined();
      expect(rateLimit.license_id).toBe(testLicense.id);
      expect(rateLimit.max_requests).toBe(5);
      expect(rateLimit.window_duration_ms).toBe(60000);
      expect(rateLimit.request_count).toBe(0);
    });

    test('should check rate limit correctly', async () => {
      const result = await RateLimit.checkRateLimit(testLicense.id);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.rateLimit).toBeDefined();
    });

    test('should record requests and enforce limits', async () => {
      const rateLimit = await RateLimit.createForLicense(testLicense.id, 2, 60000);

      // First request
      await rateLimit.recordRequest();
      expect(rateLimit.request_count).toBe(1);
      expect(rateLimit.canMakeRequest()).toBe(true);

      // Second request
      await rateLimit.recordRequest();
      expect(rateLimit.request_count).toBe(2);
      expect(rateLimit.canMakeRequest()).toBe(false);
    });

    test('should reset window when expired', async () => {
      const rateLimit = await RateLimit.createForLicense(testLicense.id, 2, 1000); // 1 second window

      // Make requests to fill the window
      await rateLimit.recordRequest();
      await rateLimit.recordRequest();
      expect(rateLimit.canMakeRequest()).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make request again
      await rateLimit.recordRequest();
      expect(rateLimit.request_count).toBe(1); // Reset to 1
      expect(rateLimit.canMakeRequest()).toBe(true);
    });
  });
});