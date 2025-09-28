import { RateLimitService } from '../services/RateLimitService';
import { License } from '../models/License';
import { RateLimit } from '../models/RateLimit';
import sequelize from '../config/database';
import { Op } from 'sequelize';

async function testRateLimiting() {
  try {
    console.log('🚀 Testing Rate Limiting System...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models
    await sequelize.sync();
    console.log('✅ Models synced');

    // Clean up any existing test data
    await RateLimit.destroy({ where: { license_id: { [Op.gt]: 0 } } });
    await License.destroy({ where: { domain: 'test-rate-limit.com' } });

    // Create test license
    const testLicense = await License.create({
      license_key: 'TEST-RATE-LIMIT-' + Date.now(),
      domain: 'test-rate-limit.com',
      type: 'free',
      status: 'active',
      monthly_limit: 10,
      current_usage: 0,
      last_reset: new Date(),
    });

    console.log(`✅ Created test license: ${testLicense.license_key}`);

    // Test 1: Check initial limits
    console.log('\n📊 Test 1: Initial Rate Limit Check');
    const initialCheck = await RateLimitService.checkLimits(testLicense.id);
    console.log('Initial check result:', {
      allowed: initialCheck.allowed,
      remainingGenerations: initialCheck.remainingGenerations,
      currentUsage: initialCheck.currentUsage,
      monthlyLimit: initialCheck.monthlyLimit,
    });

    // Test 2: Get usage stats
    console.log('\n📊 Test 2: Usage Statistics');
    const usageStats = await RateLimitService.getUsageStats(testLicense.id);
    console.log('Usage stats:', {
      currentUsage: usageStats?.currentUsage,
      monthlyLimit: usageStats?.monthlyLimit,
      remainingGenerations: usageStats?.remainingGenerations,
      rateLimitSeconds: usageStats?.rateLimitSeconds,
    });

    // Test 3: Simulate multiple generations
    console.log('\n📊 Test 3: Simulating Multiple Generations');
    for (let i = 1; i <= 3; i++) {
      console.log(`\nGeneration ${i}:`);

      // Check if allowed
      const checkResult = await RateLimitService.checkLimits(testLicense.id);
      console.log(`  - Allowed: ${checkResult.allowed}`);

      if (checkResult.allowed) {
        // Increment usage
        await RateLimitService.incrementUsage(testLicense.id);
        console.log(`  - Usage incremented`);

        // Get updated stats
        const updatedStats = await RateLimitService.getUsageStats(testLicense.id);
        console.log(`  - Current usage: ${updatedStats?.currentUsage}`);
        console.log(`  - Remaining: ${updatedStats?.remainingGenerations}`);
      } else {
        console.log(`  - Reason: ${checkResult.reason}`);
        console.log(`  - Remaining time: ${checkResult.remainingTimeMs}ms`);
      }
    }

    // Test 4: Test rate limiting (time-based)
    console.log('\n📊 Test 4: Rate Limiting (Time-based)');

    // Make first request
    const firstCheck = await RateLimitService.checkLimits(testLicense.id);
    console.log('First request allowed:', firstCheck.allowed);

    if (firstCheck.allowed) {
      await RateLimitService.incrementUsage(testLicense.id);
      console.log('First request processed');
    }

    // Immediately try second request (should be rate limited)
    const secondCheck = await RateLimitService.checkLimits(testLicense.id);
    console.log('Immediate second request allowed:', secondCheck.allowed);
    if (!secondCheck.allowed) {
      console.log('Rate limit reason:', secondCheck.reason);
      console.log('Retry after (ms):', secondCheck.remainingTimeMs);
    }

    // Test 5: Test different license types
    console.log('\n📊 Test 5: Different License Type Configurations');

    const licenseTypes = ['free', 'pro_basic', 'pro_premium'];
    for (const type of licenseTypes) {
      const config = RateLimitService.getLimitConfig(type);
      console.log(`${type.toUpperCase()}:`, {
        monthlyGenerations: config.monthlyGenerations,
        rateLimitSeconds: config.rateLimitSeconds,
        maxProducts: config.maxProducts,
        imageMaxSizeKB: config.imageMaxSizeKB,
      });
    }

    // Test 6: Test product and image size limits
    console.log('\n📊 Test 6: Product and Image Size Limits');

    console.log('Product limits:');
    console.log('  FREE can use 2 products:', RateLimitService.canUseProducts('free', 2));
    console.log('  FREE can use 5 products:', RateLimitService.canUseProducts('free', 5));
    console.log('  PRO can use 100 products:', RateLimitService.canUseProducts('pro_basic', 100));

    console.log('Image size limits:');
    console.log('  FREE 1MB image:', RateLimitService.isImageSizeAllowed('free', 1024));
    console.log('  FREE 3MB image:', RateLimitService.isImageSizeAllowed('free', 3072));
    console.log('  PRO Basic 4MB image:', RateLimitService.isImageSizeAllowed('pro_basic', 4096));

    // Test 7: License validation
    console.log('\n📊 Test 7: License Validation');
    const validation = await RateLimitService.validateLicenseForGeneration(testLicense.id);
    console.log('License validation:', {
      valid: validation.valid,
      canGenerate: validation.canGenerate,
      reason: validation.reason,
    });

    // Test 8: System statistics
    console.log('\n📊 Test 8: System Statistics');
    const systemStats = await RateLimitService.getSystemStats();
    console.log('System stats:', systemStats);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await RateLimit.destroy({ where: { license_id: testLicense.id } });
    await testLicense.destroy();

    console.log('\n✅ Rate limiting tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing rate limiting:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testRateLimiting();
}

export { testRateLimiting };