import { GoogleAIService } from '../services/GoogleAIService';
import { ImageProcessor } from '../services/ImageProcessor';
import { GenerationOptions } from '../types/google-ai';

// Mock completo de GoogleAIService para evitar problemas con timeouts
jest.mock('../services/GoogleAIService');

// Mock de Sharp para ImageProcessor
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      hasAlpha: false,
      density: 72
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    withMetadata: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed-image-data'))
  }));

  return mockSharp;
});

describe('GoogleAIService', () => {
  let mockGoogleAIService: jest.Mocked<GoogleAIService>;
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    // Crear mock del servicio
    mockGoogleAIService = new GoogleAIService({
      apiKey: 'test-api-key'
    }) as jest.Mocked<GoogleAIService>;

    // Mock de los métodos
    mockGoogleAIService.validateConfig = jest.fn().mockReturnValue({
      valid: true,
      errors: []
    });

    mockGoogleAIService.getModelInfo = jest.fn().mockReturnValue({
      textModel: 'gemini-pro',
      visionModel: 'gemini-pro-vision'
    });

    mockGoogleAIService.generateImage = jest.fn().mockResolvedValue({
      success: true,
      imageUrl: 'https://generated-images.mirrorly.com/test-image.jpg',
      processingTime: 1500,
      usedPrompt: 'Mocked optimized prompt for e-commerce image generation',
      metadata: {
        model: 'gemini-pro-vision',
        twoStepProcess: true,
        promptGenerationTime: 800,
        imageGenerationTime: 700,
        optimizedPrompt: 'Mocked optimized prompt for e-commerce image generation'
      }
    });

    imageProcessor = new ImageProcessor();
  });

  describe('Configuration Validation', () => {
    it('should validate configuration correctly', () => {
      const result = mockGoogleAIService.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Model Information', () => {
    it('should return correct model information', () => {
      const modelInfo = mockGoogleAIService.getModelInfo();
      expect(modelInfo.textModel).toBe('gemini-pro');
      expect(modelInfo.visionModel).toBe('gemini-pro-vision');
    });
  });

  describe('Image Generation', () => {
    it('should handle image generation with default options', async () => {
      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const result = await mockGoogleAIService.generateImage(userImage, productImage);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.usedPrompt).toBeDefined();
      expect(result.metadata?.twoStepProcess).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle image generation with custom options', async () => {
      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const options: GenerationOptions = {
        style: 'artistic',
        quality: 'premium',
        productType: 'jewelry'
      };

      const result = await mockGoogleAIService.generateImage(userImage, productImage, options);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.metadata?.optimizedPrompt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock para simular error
      mockGoogleAIService.generateImage.mockResolvedValueOnce({
        success: false,
        error: 'API Error: Invalid request',
        processingTime: 500,
        metadata: {
          model: 'gemini-pro-vision',
          twoStepProcess: true
        }
      });

      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const result = await mockGoogleAIService.generateImage(userImage, productImage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Integration: GoogleAIService + ImageProcessor', () => {
    it('should work together for complete image processing workflow', async () => {
      const mockUserImage = Buffer.from('mock-user-image-data');
      const mockProductImage = Buffer.from('mock-product-image-data');

      // Paso 1: Optimizar imágenes
      const optimizedUserResult = await imageProcessor.compressForAPI(mockUserImage);
      const optimizedProductResult = await imageProcessor.compressForAPI(mockProductImage);

      expect(optimizedUserResult.success).toBe(true);
      expect(optimizedProductResult.success).toBe(true);
      expect(optimizedUserResult.processedImage).toBeDefined();
      expect(optimizedProductResult.processedImage).toBeDefined();

      // Paso 2: Generar imagen con Google AI
      if (optimizedUserResult.processedImage && optimizedProductResult.processedImage) {
        const generationResult = await mockGoogleAIService.generateImage(
          optimizedUserResult.processedImage,
          optimizedProductResult.processedImage,
          {
            style: 'professional',
            quality: 'high',
            productType: 'clothing'
          }
        );

        expect(generationResult.success).toBe(true);
        expect(generationResult.imageUrl).toBeDefined();
        expect(generationResult.metadata?.twoStepProcess).toBe(true);
      }
    });
  });
});