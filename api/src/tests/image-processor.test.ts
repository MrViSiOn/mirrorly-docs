import { ImageProcessor } from '../services/ImageProcessor';
import { ImageProcessingOptions, ImageValidationOptions } from '../types/image-processor';

// Mock de Sharp para testing
jest.mock('sharp', () => {
  const mockSharp = {
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      hasAlpha: false,
      density: 72
    }),
    withMetadata: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed-image-data'))
  };

  return jest.fn(() => mockSharp);
});

describe('ImageProcessor', () => {
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
  });

  describe('Image Validation', () => {
    it('should validate a correct image', async () => {
      const mockImage = Buffer.from('mock-image-data'.repeat(100));

      const result = await imageProcessor.validateImage(mockImage);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.imageInfo).toBeDefined();
    });

    it('should reject empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await imageProcessor.validateImage(emptyBuffer);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Image buffer is empty');
    });

    it('should reject oversized images', async () => {
      const largeImage = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const options: Partial<ImageValidationOptions> = {
        maxSizeBytes: 10 * 1024 * 1024 // 10MB limit
      };

      const result = await imageProcessor.validateImage(largeImage, options);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum allowed'))).toBe(true);
    });

    it('should generate warnings for large dimensions', async () => {
      const mockImage = Buffer.from('mock-image-data');

      // Mock metadata para imagen muy grande
      const sharp = require('sharp');
      sharp().metadata.mockResolvedValueOnce({
        width: 5000,
        height: 4000,
        format: 'jpeg',
        hasAlpha: false
      });

      const result = await imageProcessor.validateImage(mockImage);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Image Optimization', () => {
    it('should optimize image with default settings', async () => {
      const mockImage = Buffer.from('mock-large-image-data'.repeat(1000));

      const result = await imageProcessor.optimize(mockImage);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
      expect(result.originalInfo).toBeDefined();
      expect(result.processedInfo).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should optimize image with custom options', async () => {
      const mockImage = Buffer.from('mock-image-data');

      const options: Partial<ImageProcessingOptions> = {
        maxWidth: 512,
        maxHeight: 512,
        quality: 75,
        format: 'webp'
      };

      const result = await imageProcessor.optimize(mockImage, options);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });

    it('should handle processing errors gracefully', async () => {
      // Mock Sharp para que falle
      const sharp = require('sharp');
      sharp().toBuffer.mockRejectedValueOnce(new Error('Processing failed'));

      const mockImage = Buffer.from('invalid-image-data');

      const result = await imageProcessor.optimize(mockImage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image processing failed');
    });
  });

  describe('Auto Resize', () => {
    it('should auto resize image correctly', async () => {
      const mockImage = Buffer.from('mock-large-image');

      const result = await imageProcessor.autoResize(mockImage, 800, 600, 90);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });
  });

  describe('API Compression', () => {
    it('should compress image for API usage', async () => {
      const mockImage = Buffer.from('mock-image-for-api');

      const result = await imageProcessor.compressForAPI(mockImage);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
      // Debería usar configuración agresiva para API
    });
  });

  describe('Format Conversion', () => {
    it('should convert image to JPEG', async () => {
      const mockImage = Buffer.from('mock-png-image');

      const result = await imageProcessor.convertFormat(mockImage, 'jpeg', 85);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });

    it('should convert image to WebP', async () => {
      const mockImage = Buffer.from('mock-jpeg-image');

      const result = await imageProcessor.convertFormat(mockImage, 'webp', 80);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });
  });

  describe('Thumbnail Creation', () => {
    it('should create thumbnail with default size', async () => {
      const mockImage = Buffer.from('mock-large-image');

      const result = await imageProcessor.createThumbnail(mockImage);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });

    it('should create thumbnail with custom size', async () => {
      const mockImage = Buffer.from('mock-image');

      const result = await imageProcessor.createThumbnail(mockImage, 200, 200);

      expect(result.success).toBe(true);
      expect(result.processedImage).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should validate multiple images', async () => {
      const images = [
        Buffer.from('image1'),
        Buffer.from('image2'),
        Buffer.from('image3')
      ];

      const results = await imageProcessor.validateMultipleImages(images);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.valid).toBe(true);
      });
    });

    it('should optimize multiple images', async () => {
      const images = [
        Buffer.from('image1'),
        Buffer.from('image2')
      ];

      const results = await imageProcessor.optimizeMultiple(images);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Optimization Detection', () => {
    it('should detect when optimization is needed', async () => {
      const largeImage = Buffer.alloc(5 * 1024 * 1024); // 5MB

      // Mock metadata para imagen grande
      const sharp = require('sharp');
      sharp().metadata.mockResolvedValueOnce({
        width: 3000,
        height: 2000,
        format: 'jpeg'
      });

      const result = await imageProcessor.needsOptimization(largeImage);

      expect(result.needs).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should detect when optimization is not needed', async () => {
      const smallImage = Buffer.alloc(500 * 1024); // 500KB

      // Mock metadata para imagen pequeña
      const sharp = require('sharp');
      sharp().metadata.mockResolvedValueOnce({
        width: 800,
        height: 600,
        format: 'jpeg'
      });

      const result = await imageProcessor.needsOptimization(smallImage);

      expect(result.needs).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('Image Info', () => {
    it('should get correct image information', async () => {
      const mockImage = Buffer.from('mock-image');

      const info = await imageProcessor.getImageInfo(mockImage);

      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.format).toBe('jpeg');
      expect(info.hasAlpha).toBe(false);
    });
  });

  describe('Optimization Stats', () => {
    it('should generate optimization statistics', async () => {
      const originalBuffer = Buffer.alloc(1000);
      const optimizedBuffer = Buffer.alloc(500);
      const processingTime = 150;
      const operations = ['resize', 'compress', 'format-convert'];

      const stats = await imageProcessor.getOptimizationStats(
        originalBuffer,
        optimizedBuffer,
        processingTime,
        operations
      );

      expect(stats.originalSize).toBe(1000);
      expect(stats.optimizedSize).toBe(500);
      expect(stats.compressionRatio).toBe(50);
      expect(stats.processingTime).toBe(150);
      expect(stats.operations).toEqual(operations);
    });
  });
});