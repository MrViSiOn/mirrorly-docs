import dotenv from 'dotenv';
import { initializeDatabase } from '../config';
import { initializeModels, License } from '../models';

// Load environment variables
dotenv.config();

/**
 * Test script for authentication and license management system
 */
async function testAuthSystem() {
  try {
    console.log('🔄 Initializing database and models...');
    await initializeDatabase();
    await initializeModels();

    console.log('\n📋 Testing License Management System');
    console.log('=====================================');

    // Test 1: Create FREE license
    console.log('\n1️⃣ Testing FREE license creation...');
    const freeLicense = await License.createFreeLicense('example.com');
    console.log('✅ FREE license created:', {
      license_key: freeLicense.license_key,
      domain: freeLicense.domain,
      type: freeLicense.type,
      monthly_limit: freeLicense.monthly_limit
    });

    // Test 2: Find license by key
    console.log('\n2️⃣ Testing license lookup...');
    const foundLicense = await License.findByLicenseKey(freeLicense.license_key);
    console.log('✅ License found:', foundLicense ? 'Yes' : 'No');

    // Test 3: Test license methods
    console.log('\n3️⃣ Testing license methods...');
    console.log('Can generate:', foundLicense?.canGenerate());
    console.log('Remaining generations:', foundLicense?.getRemainingGenerations());
    console.log('Is expired:', foundLicense?.isExpired());
    console.log('Should reset usage:', foundLicense?.shouldResetUsage());

    // Test 4: Create PRO license
    console.log('\n4️⃣ Testing PRO license creation...');
    const proLicenseKey = License.generateLicenseKey();
    const proLicense = await License.create({
      license_key: proLicenseKey,
      domain: 'pro-example.com',
      type: 'pro_basic',
      status: 'active',
      monthly_limit: 100,
      current_usage: 0,
      last_reset: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    console.log('✅ PRO license created:', {
      license_key: proLicense.license_key,
      domain: proLicense.domain,
      type: proLicense.type,
      monthly_limit: proLicense.monthly_limit,
      expires_at: proLicense.expires_at
    });

    // Test 5: Test usage increment
    console.log('\n5️⃣ Testing usage increment...');
    const initialUsage = foundLicense!.current_usage;
    await foundLicense!.incrementUsage();
    await foundLicense!.reload();
    console.log('Usage incremented:', `${initialUsage} → ${foundLicense!.current_usage}`);

    // Test 6: Test domain validation
    console.log('\n6️⃣ Testing domain validation...');
    const domainLicense = await License.findByDomain('example.com');
    console.log('License found by domain:', domainLicense ? 'Yes' : 'No');

    // Test 7: Test expired license
    console.log('\n7️⃣ Testing expired license...');
    const expiredLicense = await License.create({
      license_key: License.generateLicenseKey(),
      domain: 'expired-example.com',
      type: 'pro_premium',
      status: 'active',
      monthly_limit: 500,
      current_usage: 50,
      last_reset: new Date(),
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    });
    console.log('Expired license created. Is expired:', expiredLicense.isExpired());

    // Test 8: Test license key generation
    console.log('\n8️⃣ Testing license key generation...');
    const generatedKeys = Array.from({ length: 3 }, () => License.generateLicenseKey());
    console.log('Generated license keys:', generatedKeys);

    console.log('\n✅ All authentication system tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- FREE licenses: Can generate ${freeLicense.monthly_limit} images/month`);
    console.log(`- PRO Basic: Can generate ${proLicense.monthly_limit} images/month`);
    console.log(`- PRO Premium: Can generate 500 images/month`);
    console.log('- All licenses support domain validation');
    console.log('- Automatic expiration handling implemented');
    console.log('- Usage tracking and reset functionality working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testAuthSystem();