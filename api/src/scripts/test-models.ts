#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { initializeDatabase } from '../config';
import { License, Generation, RateLimit, initializeModels } from '../models';

// Load environment variables
dotenv.config();

async function testModels() {
  try {
    console.log('🔄 Testing database models...');

    // Initialize database
    await initializeDatabase();
    await initializeModels();

    console.log('✅ Database connection established');

    // Test License model
    console.log('\n📝 Testing License model...');
    const testLicense = await License.createFreeLicense('test-models.example.com');
    console.log(`✅ Created license: ${testLicense.license_key}`);
    console.log(`   Domain: ${testLicense.domain}`);
    console.log(`   Type: ${testLicense.type}`);
    console.log(`   Monthly limit: ${testLicense.monthly_limit}`);
    console.log(`   Can generate: ${testLicense.canGenerate()}`);

    // Test Generation model
    console.log('\n📝 Testing Generation model...');
    const testGeneration = await Generation.create({
      license_id: testLicense.id,
      product_id: 'test-product-123',
      user_image_hash: 'user-hash-abc123',
      product_image_hash: 'product-hash-def456',
      status: 'pending',
    });
    console.log(`✅ Created generation: ${testGeneration.id}`);
    console.log(`   Status: ${testGeneration.status}`);
    console.log(`   Is pending: ${testGeneration.isPending()}`);

    // Mark as completed
    await testGeneration.markAsCompleted('https://example.com/result.jpg', 2500, 'Test prompt');
    console.log(`✅ Marked as completed: ${testGeneration.status}`);
    console.log(`   Result URL: ${testGeneration.result_image_url}`);

    // Test RateLimit model
    console.log('\n📝 Testing RateLimit model...');
    const rateLimitCheck = await RateLimit.checkRateLimit(testLicense.id);
    console.log(`✅ Rate limit check: ${rateLimitCheck.allowed ? 'ALLOWED' : 'BLOCKED'}`);
    console.log(`   Remaining requests: ${rateLimitCheck.remaining}`);
    console.log(`   Reset time: ${rateLimitCheck.resetTime}ms`);

    // Test usage stats
    console.log('\n📊 Testing usage statistics...');
    const stats = await Generation.getUsageStats(testLicense.id);
    console.log(`✅ Usage stats:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Pending: ${stats.pending}`);

    // Test license methods
    console.log('\n🔄 Testing license methods...');
    await testLicense.incrementUsage();
    console.log(`✅ Incremented usage: ${testLicense.current_usage}`);
    console.log(`   Remaining generations: ${testLicense.getRemainingGenerations()}`);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Generation.destroy({ where: { license_id: testLicense.id } });
    await RateLimit.destroy({ where: { license_id: testLicense.id } });
    await License.destroy({ where: { id: testLicense.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All model tests passed successfully!');

  } catch (error) {
    console.error('❌ Model test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const { closeConnection } = await import('../config/database');
    await closeConnection();
    process.exit(0);
  }
}

// Run the test
testModels();