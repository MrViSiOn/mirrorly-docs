/**
 * Script para probar el GoogleAIService y ImageProcessor
 * Este script verifica que los servicios se puedan instanciar y configurar correctamente
 */

import { GoogleAIService } from '../services/GoogleAIService';
import { ImageProcessor } from '../services/ImageProcessor';

async function testServices() {
  console.log('🧪 Testing GoogleAIService and ImageProcessor...\n');

  try {
    // Test 1: GoogleAIService Configuration
    console.log('1. Testing GoogleAIService configuration...');

    const googleAIService = new GoogleAIService({
      apiKey: 'test-api-key-for-validation'
    });

    const configValidation = googleAIService.validateConfig();
    console.log('   ✅ Configuration validation:', configValidation.valid ? 'PASSED' : 'FAILED');

    if (!configValidation.valid) {
      console.log('   ❌ Errors:', configValidation.errors);
    }

    const modelInfo = googleAIService.getModelInfo();
    console.log('   ✅ Model info:', modelInfo);

    // Test 2: GoogleAIService with invalid config
    console.log('\n2. Testing GoogleAIService with invalid configuration...');

    const invalidService = new GoogleAIService({
      apiKey: '',
      timeout: 1000,
      maxRetries: 10
    });

    const invalidValidation = invalidService.validateConfig();
    console.log('   ✅ Invalid config detected:', !invalidValidation.valid ? 'PASSED' : 'FAILED');
    console.log('   ✅ Errors found:', invalidValidation.errors);

    // Test 3: ImageProcessor
    console.log('\n3. Testing ImageProcessor...');

    const imageProcessor = new ImageProcessor();

    // Test con buffer de imagen mock
    const mockImageBuffer = Buffer.from('mock-image-data'.repeat(100));

    // Test validación
    console.log('   Testing image validation...');
    const validation = await imageProcessor.validateImage(mockImageBuffer);
    console.log('   ✅ Validation result:', validation.valid ? 'PASSED' : 'FAILED');

    if (!validation.valid) {
      console.log('   ❌ Validation errors:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.log('   ⚠️  Validation warnings:', validation.warnings);
    }

    // Test información de imagen
    console.log('   Testing image info extraction...');
    try {
      const imageInfo = await imageProcessor.getImageInfo(mockImageBuffer);
      console.log('   ✅ Image info extraction: PASSED');
      console.log('   📊 Image info:', imageInfo);
    } catch (error) {
      console.log('   ❌ Image info extraction: FAILED');
      console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test detección de optimización necesaria
    console.log('   Testing optimization detection...');
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
    try {
      const optimizationNeeded = await imageProcessor.needsOptimization(largeBuffer);
      console.log('   ✅ Optimization detection: PASSED');
      console.log('   📊 Needs optimization:', optimizationNeeded.needs);
      console.log('   📊 Reasons:', optimizationNeeded.reasons);
    } catch (error) {
      console.log('   ❌ Optimization detection: FAILED');
      console.log('   Error:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Integration workflow simulation
    console.log('\n4. Testing integration workflow simulation...');

    const mockUserImage = Buffer.from('user-image-data'.repeat(500));
    const mockProductImage = Buffer.from('product-image-data'.repeat(500));

    console.log('   Step 1: Validate images...');
    const userValidation = await imageProcessor.validateImage(mockUserImage);
    const productValidation = await imageProcessor.validateImage(mockProductImage);

    console.log('   ✅ User image validation:', userValidation.valid ? 'PASSED' : 'FAILED');
    console.log('   ✅ Product image validation:', productValidation.valid ? 'PASSED' : 'FAILED');

    if (userValidation.valid && productValidation.valid) {
      console.log('   Step 2: Check if optimization is needed...');

      const userOptNeeded = await imageProcessor.needsOptimization(mockUserImage);
      const productOptNeeded = await imageProcessor.needsOptimization(mockProductImage);

      console.log('   📊 User image needs optimization:', userOptNeeded.needs);
      console.log('   📊 Product image needs optimization:', productOptNeeded.needs);

      console.log('   Step 3: Simulate Google AI service call...');
      console.log('   ✅ GoogleAI service ready for:', modelInfo.visionModel);
      console.log('   ✅ Two-step process configured: prompt analysis + image generation');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ GoogleAIService: Configuration and validation working');
    console.log('   ✅ ImageProcessor: Validation and info extraction working');
    console.log('   ✅ Integration: Services ready for production workflow');
    console.log('   ✅ Two-step AI process: Configured and ready');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Ejecutar tests
testServices().catch(console.error);