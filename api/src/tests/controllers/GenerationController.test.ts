import { Request, Response } from 'express';
import { GenerationController } from '../../controllers/GenerationController';
import { GoogleAIService } from '../../services/GoogleAIService';
import { RateLimitService } from '../../services/RateLimitService';
import { ImageProcessor } from '../../services/ImageProcessor';
import { Generation } from '../../models/Generation';
import { AuthenticatedRequest } from '../../middleware/AuthMiddleware';
import sequelize from '../../config/db';

// Mock dependencies
jest.mock('../../services/GoogleAIService');
jest.mock('../../services/RateLimitService');
jest.mock('../../services/ImageProcessor');
jest.mock('../../models/Generation');

describe('GenerationController', () => {
  let controller: GenerationController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSet: jest.Mock;

  // Helper function to create mock files
  const createMockFile = (fieldname: string, originalname: string, size: number, buffer: Buffer) => ({
    buffer,
    size,
    originalname,
    fieldname,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    stream: {} as any,
    destination: '',
    filename: originalname,
    path: '',
  });

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(() => {
    controller = new GenerationController();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockSet = jest.fn();

    mockRequest = {
      body: {},
      headers: {},
      files: {},
      license: {
        id: 1,
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 5,
      } as any,
      licenseId: 1,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      set: mockSet,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('generateImage', () => {
    it('should generate image successfully', async () => {
      const mockUserImageFile = createMockFile('userImage', 'user.jpg', 1024, Buffer.from('user-image-data'));
      const mockProductImageFile = createMockFile('productImage', 'product.jpg', 2048, Buffer.from('product-image-data'));

      mockRequest.files = {
        userImage: [mockUserImageFile as any],
        productImage: [mockProductImageFile as any],
      };

      mockRequest.body = {
        productId: 'test-product-123',
        style: 'professional',
        quality: 'high',
        productType: 'clothing',
      };

      // Mock rate limit check
      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });

      // Mock image validation
      const mockImageProcessor = {
        validateImage: jest.fn().mockResolvedValue({
          valid: true,
          errors: [],
        }),
        compressForAPI: jest.fn().mockResolvedValue({
          success: true,
          processedImage: Buffer.from('compressed-image'),
          compressionRatio: 50,
        }),
      };

      (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);

      // Mock generation creation
      const mockGeneration = {
        id: 1,
        update: jest.fn(),
      };

      (Generation.create as jest.Mock).mockResolvedValue(mockGeneration);

      // Mock Google AI service
      const mockGoogleAI = {
        generateImage: jest.fn().mockResolvedValue({
          success: true,
          imageUrl: 'https://example.com/generated-image.jpg',
          imageBase64: 'base64encodedimagedata',
          processingTime: 5000,
          usedPrompt: 'Professional e-commerce image prompt',
          metadata: {
            twoStepProcess: true,
          },
        }),
      };

      (GoogleAIService as jest.Mock).mockImplementation(() => mockGoogleAI);

      // Mock rate limit increment
      (RateLimitService.incrementUsage as jest.Mock).mockResolvedValue(undefined);

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          generationId: 1,
          imageUrl: 'https://example.com/generated-image.jpg',
          metadata: expect.objectContaining({
            twoStepProcess: true,
            compressionStats: expect.any(Object),
          }),
          usage: expect.objectContaining({
            currentUsage: 6,
            monthlyLimit: 10,
            remaining: 4,
          }),
        })
      );

      expect(mockGeneration.update).toHaveBeenCalledWith({
        status: 'completed',
        result_image_url: 'https://example.com/generated-image.jpg',
        processing_time_ms: 5000,
        used_prompt: 'Professional e-commerce image prompt',
        completed_at: expect.any(Date),
      });

      expect(RateLimitService.incrementUsage).toHaveBeenCalledWith(1);
    });

    it('should reject request without authentication', async () => {
      mockRequest.license = undefined;
      mockRequest.licenseId = undefined;

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE',
        })
      );
    });

    it('should reject request without required images', async () => {
      mockRequest.files = {};

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'IMG_001',
          message: 'Both user image and product image are required',
          code: 'MISSING_IMAGES',
        })
      );
    });

    it('should reject request when rate limit exceeded', async () => {
      const mockUserImageFile = createMockFile('userImage', 'user.jpg', 1024, Buffer.from('user-image-data'));
      const mockProductImageFile = createMockFile('productImage', 'product.jpg', 2048, Buffer.from('product-image-data'));

      mockRequest.files = {
        userImage: [mockUserImageFile as any],
        productImage: [mockProductImageFile as any],
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Monthly limit exceeded',
        currentUsage: 10,
        monthlyLimit: 10,
        remainingGenerations: 0,
        resetDate: new Date(),
      });

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_001',
          message: 'Monthly limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
        })
      );
    });

    it('should handle invalid user image', async () => {
      const mockUserImageFile = createMockFile('userImage', 'invalid.jpg', 1024, Buffer.from('invalid-image-data'));
      const mockProductImageFile = createMockFile('productImage', 'product.jpg', 2048, Buffer.from('product-image-data'));

      mockRequest.files = {
        userImage: [mockUserImageFile as any],
        productImage: [mockProductImageFile as any],
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });

      const mockImageProcessor = {
        validateImage: jest.fn()
          .mockResolvedValueOnce({
            valid: false,
            errors: ['Invalid image format', 'Corrupted image data'],
          })
          .mockResolvedValueOnce({
            valid: true,
            errors: [],
          }),
      };

      (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'IMG_001',
          message: 'Invalid user image',
          code: 'INVALID_USER_IMAGE',
          errors: ['Invalid image format', 'Corrupted image data'],
        })
      );
    });

    it('should handle Google AI generation failure', async () => {
      const mockUserImageFile = createMockFile('userImage', 'user.jpg', 1024, Buffer.from('user-image-data'));
      const mockProductImageFile = createMockFile('productImage', 'product.jpg', 2048, Buffer.from('product-image-data'));

      mockRequest.files = {
        userImage: [mockUserImageFile as any],
        productImage: [mockProductImageFile as any],
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });

      const mockImageProcessor = {
        validateImage: jest.fn().mockResolvedValue({
          valid: true,
          errors: [],
        }),
        compressForAPI: jest.fn().mockResolvedValue({
          success: true,
          processedImage: Buffer.from('compressed-image'),
        }),
      };

      (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);

      const mockGeneration = {
        id: 1,
        update: jest.fn(),
      };

      (Generation.create as jest.Mock).mockResolvedValue(mockGeneration);

      const mockGoogleAI = {
        generateImage: jest.fn().mockResolvedValue({
          success: false,
          error: 'Google AI API quota exceeded',
        }),
      };

      (GoogleAIService as jest.Mock).mockImplementation(() => mockGoogleAI);

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'GAI_001',
          message: 'Image generation failed',
          code: 'GOOGLE_AI_ERROR',
          details: 'Google AI API quota exceeded',
        })
      );

      expect(mockGeneration.update).toHaveBeenCalledWith({
        status: 'failed',
        error_message: 'Google AI API quota exceeded',
      });
    });

    it('should handle image processing failure', async () => {
      const mockUserImageFile = createMockFile('userImage', 'user.jpg', 1024, Buffer.from('user-image-data'));
      const mockProductImageFile = createMockFile('productImage', 'product.jpg', 2048, Buffer.from('product-image-data'));

      mockRequest.files = {
        userImage: [mockUserImageFile as any],
        productImage: [mockProductImageFile as any],
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });

      const mockImageProcessor = {
        validateImage: jest.fn().mockResolvedValue({
          valid: true,
          errors: [],
        }),
        compressForAPI: jest.fn()
          .mockResolvedValueOnce({
            success: false,
            error: 'Image compression failed',
          })
          .mockResolvedValueOnce({
            success: true,
            processedImage: Buffer.from('compressed-image'),
          }),
      };

      (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);

      const mockGeneration = {
        id: 1,
        update: jest.fn(),
      };

      (Generation.create as jest.Mock).mockResolvedValue(mockGeneration);

      await controller.generateImage(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'IMG_003',
          message: 'Failed to process images',
          code: 'IMAGE_PROCESSING_FAILED',
        })
      );

      expect(mockGeneration.update).toHaveBeenCalledWith({ status: 'failed' });
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status successfully', async () => {
      const mockGeneration = {
        id: 1,
        status: 'completed',
        product_id: 'test-product-123',
        created_at: new Date(),
        completed_at: new Date(),
        processing_time_ms: 5000,
        result_image_url: 'https://example.com/result.jpg',
        error_message: null,
        used_prompt: 'Test prompt',
      };

      mockRequest.params = { id: '1' };

      (Generation.findOne as jest.Mock).mockResolvedValue(mockGeneration);

      await controller.getGenerationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          status: 'completed',
          productId: 'test-product-123',
          imageUrl: 'https://example.com/result.jpg',
          processingTime: 5000,
          usedPrompt: 'Test prompt',
        })
      );
    });

    it('should return 404 for non-existent generation', async () => {
      mockRequest.params = { id: '999' };

      (Generation.findOne as jest.Mock).mockResolvedValue(null);

      await controller.getGenerationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'NOT_FOUND',
          message: 'Generation not found',
          code: 'GENERATION_NOT_FOUND',
        })
      );
    });

    it('should reject unauthenticated request', async () => {
      mockRequest.licenseId = undefined;
      mockRequest.params = { id: '1' };

      await controller.getGenerationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE',
        })
      );
    });
  });

  describe('getCurrentLimits', () => {
    it('should return current limits successfully', async () => {
      const mockUsageStats = {
        monthlyLimit: 10,
        currentUsage: 3,
        remainingGenerations: 7,
        nextReset: new Date(),
        rateLimitSeconds: 60,
        timeUntilNextRequest: 0,
        lastRequest: new Date(),
      };

      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue(mockUsageStats);
      (RateLimitService.getLimitConfig as jest.Mock).mockReturnValue({
        maxProducts: 3,
        imageMaxSizeKB: 2048,
      });

      await controller.getCurrentLimits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          licenseType: 'free',
          monthlyLimits: expect.objectContaining({
            total: 10,
            used: 3,
            remaining: 7,
          }),
          rateLimits: expect.objectContaining({
            seconds: 60,
          }),
          canGenerate: true,
          restrictions: expect.objectContaining({
            maxProducts: 3,
            imageMaxSizeKB: 2048,
          }),
        })
      );
    });

    it('should return 404 when usage stats not found', async () => {
      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue(null);

      await controller.getCurrentLimits(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'NOT_FOUND',
          message: 'Usage statistics not found',
          code: 'USAGE_STATS_NOT_FOUND',
        })
      );
    });
  });

  describe('getAuthStatus', () => {
    it('should return authentication status successfully', async () => {
      const mockLicense = {
        id: 1,
        type: 'pro_basic',
        status: 'active',
        domain: 'test.example.com',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthly_limit: 100,
        current_usage: 25,
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
        resetMonthlyUsage: jest.fn(),
        last_reset: new Date(),
      };

      mockRequest.license = mockLicense as any;

      await controller.getAuthStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticated: true,
          license: expect.objectContaining({
            id: 1,
            type: 'pro_basic',
            status: 'active',
            domain: 'test.example.com',
            isExpired: false,
            daysUntilExpiration: expect.any(Number),
          }),
          usage: expect.objectContaining({
            monthlyLimit: 100,
            currentUsage: 25,
            remaining: 75,
          }),
          features: expect.objectContaining({
            canGenerate: true,
            maxProducts: -1,
            customization: true,
            priority: false,
          }),
        })
      );
    });

    it('should reset usage if needed', async () => {
      const mockLicense = {
        id: 1,
        type: 'free',
        status: 'active',
        domain: 'test.example.com',
        created_at: new Date(),
        expires_at: null,
        monthly_limit: 10,
        current_usage: 5,
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(true),
        resetMonthlyUsage: jest.fn(),
        last_reset: new Date(),
      };

      mockRequest.license = mockLicense as any;

      await controller.getAuthStatus(mockRequest as Request, mockResponse as Response);

      expect(mockLicense.resetMonthlyUsage).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration correctly', () => {
      // Mock environment variable
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';

      const mockGoogleAI = {
        validateConfig: jest.fn().mockReturnValue({
          valid: true,
          errors: [],
        }),
      };

      (GoogleAIService as jest.Mock).mockImplementation(() => mockGoogleAI);

      const result = controller.validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing API key', () => {
      delete process.env.GOOGLE_AI_API_KEY;

      const result = controller.validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GOOGLE_AI_API_KEY environment variable is required');
    });

    it('should detect Google AI configuration errors', () => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';

      const mockGoogleAI = {
        validateConfig: jest.fn().mockReturnValue({
          valid: false,
          errors: ['Invalid API key format', 'Timeout too low'],
        }),
      };

      (GoogleAIService as jest.Mock).mockImplementation(() => mockGoogleAI);

      const result = controller.validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Google AI: Invalid API key format');
      expect(result.errors).toContain('Google AI: Timeout too low');
    });
  });

  describe('getMulterConfig', () => {
    it('should return valid multer configuration', () => {
      const multerConfig = GenerationController.getMulterConfig();

      expect(multerConfig).toBeDefined();
      expect(typeof multerConfig.single).toBe('function');
    });
  });
});