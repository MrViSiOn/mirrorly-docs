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
  let googleAIService: GoogleAIService;

  beforeAll(() => {
    // Usar fake timers para controlar timeouts en tests
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Restaurar timers reales
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
    
    googleAIService = new GoogleAIService({
      apiKey: 'test-api-key',
      timeout: 5000, // Timeout más corto para tests
      maxRetries: 1 // Menos reintentos para tests más rápidos
    });
  });

  afterEach(() => {
    // Limpiar timeouts pendientes
    jest.clearAllTimers();
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

      // Ejecutar la generación de imagen de forma asíncrona
      const resultPromise = googleAIService.generateImage(userImage, productImage);
      
      // Avanzar los timers para que los timeouts no interfieran
      jest.advanceTimersByTime(1000);
      
      const result = await resultPromise;

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

      const resultPromise = googleAIService.generateImage(userImage, productImage, options);
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBeDefined();
      expect(result.metadata?.optimizedPrompt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock para simular error en generateContent
      const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const faultyService = new GoogleAIService({
        apiKey: 'test-key', // Usar key válida pero mockear el error
        maxRetries: 1,
        timeout: 5000
      });

      // Sobrescribir el mock para este test específico
      require('@google/generative-ai').GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: mockGenerateContent
        })
      }));

      const userImage = Buffer.from('mock-user-image-data');
      const productImage = Buffer.from('mock-product-image-data');

      const resultPromise = faultyService.generateImage(userImage, productImage);
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;

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
    jest.clearAllMocks();
    
    googleAIService = new GoogleAIService({
      apiKey: 'test-api-key',
      timeout: 5000,
      maxRetries: 1
    });
    imageProcessor = new ImageProcessor();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should work together for complete image processing workflow', async () => {
    // Simular imágenes de entrada más pequeñas para tests
    const mockUserImage = Buffer.from('mock-user-image-data');
    const mockProductImage = Buffer.from('mock-product-image-data');

    // Paso 1: Optimizar imágenes
    const optimizedUserResult = await imageProcessor.compressForAPI(mockUserImage);
    const optimizedProductResult = await imageProcessor.compressForAPI(mockProductImage);

    expect(optimizedUserResult.success).toBe(true);
    expect(optimizedProductResult.success).toBe(true);
    expect(optimizedUserResult.processedImage).toBeDefined();
    expect(optimizedProductResult.processedImage).toBeDefined();

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
      expect(generationResult.imageUrl).toBeDefined();
      expect(generationResult.metadata?.twoStepProcess).toBe(true);
    }
  });
});