import { GoogleAIService } from '../services/GoogleAIService';
import { ImageProcessor } from '../services/ImageProcessor';
import { GenerationOptions } from '../types/google-ai';

// Mock de Google Generative AI para testing
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockResolvedValue('Mocked optimized prompt for e-commerce image generation')
        }
      })
    })
  }))
}));

describe('GoogleAIService', () => {
  let googleAIService: GoogleAIService;
  // let imageProcessor: ImageProcessor; // Not used in current tests

  beforeEach(() => {
    googleAIService = new GoogleAIService({
      apiKey: 'test-api-key'
    });
    // imageProcessor = new ImageProcessor(); // Not used in current tests
  });

  describe('Configuration Validation', () => {
    it('should validate configuration correctly', () => {
      const result = googleAIService.validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing API key', () => {
      const serviceWithoutKey = new GoogleAIService({ apiKey: '' });
      const result = serviceWithoutKey.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    it('should detect invalid timeout', () => {
      const serviceWithInvalidTimeout = new GoogleAIService({
        apiKey: 'test-key',
        timeout: 1000
      });
      const result = serviceWithInvalidTimeout.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout should be at least 5000ms');
    });
  });

  describe('Model Information', () => {
    it('should return correct model information', () => {
      const modelInfo = googleAIService.getModelInfo();
      expect(modelInfo.textModel).toBe('gemini-pro');
      expect(modelInfo.visionModel).toBe('gemini-pro-vision');
    });
  });

  describe('Image Generation', () => {
    it('should handle image generation with default options', async () => {
      // Crear buffers de imagen mock
      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const result = await googleAIService.generateImage(userImage, productImage);

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

      const result = await googleAIService.generateImage(userImage, productImage, options);

      expect(result.success).toBe(true);
      expect(result.metadata?.optimizedPrompt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Crear servicio con configuración que causará error
      const faultyService = new GoogleAIService({
        apiKey: 'invalid-key',
        maxRetries: 1,
        timeout: 100
      });

      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const result = await faultyService.generateImage(userImage, productImage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});

describe('Integration: GoogleAIService + ImageProcessor', () => {
  let googleAIService: GoogleAIService;
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    googleAIService = new GoogleAIService({
      apiKey: 'test-api-key'
    });
    imageProcessor = new ImageProcessor();
  });

  it('should work together for complete image processing workflow', async () => {
    // Simular imágenes de entrada
    const mockUserImage = Buffer.from('mock-large-user-image-data'.repeat(1000));
    const mockProductImage = Buffer.from('mock-large-product-image-data'.repeat(1000));

    // Paso 1: Optimizar imágenes
    const optimizedUserResult = await imageProcessor.compressForAPI(mockUserImage);
    const optimizedProductResult = await imageProcessor.compressForAPI(mockProductImage);

    expect(optimizedUserResult.success).toBe(true);
    expect(optimizedProductResult.success).toBe(true);

    // Paso 2: Generar imagen con Google AI (usando imágenes optimizadas)
    if (optimizedUserResult.processedImage && optimizedProductResult.processedImage) {
      const generationResult = await googleAIService.generateImage(
        optimizedUserResult.processedImage,
        optimizedProductResult.processedImage,
        {
          style: 'professional',
          quality: 'high',
          productType: 'clothing'
        }
      );

      expect(generationResult.success).toBe(true);
      expect(generationResult.metadata?.twoStepProcess).toBe(true);
    }
  });
});