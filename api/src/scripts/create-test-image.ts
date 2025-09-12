/**
 * Script para crear una imagen de prueba válida para testing
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createTestImage() {
  console.log('🖼️  Creating test image...');

  try {
    // Crear una imagen simple de 800x600 con fondo azul
    const testImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Guardar la imagen de prueba
    const testImagePath = path.join(__dirname, '..', 'temp', 'test-image.jpg');

    // Crear directorio temp si no existe
    const tempDir = path.dirname(testImagePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(testImagePath, testImage);

    console.log('✅ Test image created:', testImagePath);
    console.log('📊 Image size:', testImage.length, 'bytes');

    return testImage;

  } catch (error) {
    console.error('❌ Failed to create test image:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTestImage().catch(console.error);
}

export { createTestImage };