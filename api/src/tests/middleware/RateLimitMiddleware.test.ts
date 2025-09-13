import { Request, Response, NextFunction } from 'express';
import { RateLimitMiddleware } from '../../middleware/RateLimitMiddleware';
import { RateLimitService } from '../../services/RateLimitService';
import sequelize from '../../config/db';

// Mock dependencies
jest.mock('../../services/RateLimitService');

describe('RateLimitMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSet: jest.Mock;

  // Helper function to create mock files
  const createMockFile = (originalname: string, size: number) => ({
    originalname,
    size,
    fieldname: 'file',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    stream: {} as any,
    destination: '',
    filename: originalname,
    path: '',
    buffer: Buffer.from('mock-data'),
  });

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockSet = jest.fn();
    mockNext = jest.fn();

    mockRequest = {
      headers: {},
      body: {},
      files: {},
      license: {
        id: 1,
        type: 'free',
        status: 'active',
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

  describe('checkGenerationLimits', () => {
    it('should allow generation when limits are not exceeded', async () => {
      const mockRateLimitResult = {
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue(mockRateLimitResult);

      await RateLimitMiddleware.checkGenerationLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSet).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '5',
        'X-RateLimit-Reset': expect.any(String),
      });

      expect(mockRequest.rateLimitResult).toBe(mockRateLimitResult);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject generation when monthly limit exceeded', async () => {
      const mockRateLimitResult = {
        allowed: false,
        reason: 'Monthly limit exceeded',
        currentUsage: 10,
        monthlyLimit: 10,
        remainingGenerations: 0,
        resetDate: new Date(),
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue(mockRateLimitResult);

      await RateLimitMiddleware.checkGenerationLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_001',
          message: 'Monthly limit exceeded',
          code: 'MONTHLY_LIMIT_EXCEEDED',
          details: expect.objectContaining({
            currentUsage: 10,
            monthlyLimit: 10,
            remainingGenerations: 0,
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject generation when rate limit exceeded', async () => {
      const mockRateLimitResult = {
        allowed: false,
        reason: 'Rate limit exceeded',
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
        remainingTimeMs: 30000,
      };

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue(mockRateLimitResult);

      await RateLimitMiddleware.checkGenerationLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSet).toHaveBeenCalledWith('Retry-After', '30');

      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_001',
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: expect.objectContaining({
            retryAfterMs: 30000,
            retryAfterSeconds: 30,
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without license', async () => {
      mockRequest.license = undefined;
      mockRequest.licenseId = undefined;

      await RateLimitMiddleware.checkGenerationLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_001',
          message: 'License authentication required for rate limiting',
          code: 'MISSING_LICENSE_FOR_RATE_LIMIT',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle rate limit service errors', async () => {
      (RateLimitService.checkLimits as jest.Mock).mockRejectedValue(new Error('Service error'));

      await RateLimitMiddleware.checkGenerationLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'Rate limiting check failed',
          code: 'RATE_LIMIT_CHECK_ERROR',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('recordGeneration', () => {
    it('should record generation successfully', async () => {
      (RateLimitService.incrementUsage as jest.Mock).mockResolvedValue(undefined);

      await RateLimitMiddleware.recordGeneration(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.incrementUsage).toHaveBeenCalledWith(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error without failing request', async () => {
      (RateLimitService.incrementUsage as jest.Mock).mockRejectedValue(new Error('Recording error'));

      await RateLimitMiddleware.recordGeneration(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should handle missing license ID gracefully', async () => {
      mockRequest.licenseId = undefined;

      await RateLimitMiddleware.recordGeneration(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.incrementUsage).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkImageSizeLimits', () => {
    it('should allow images within size limits', async () => {
      const mockFiles = {
        userImage: [createMockFile('user.jpg', 1024 * 1024)], // 1MB
        productImage: [createMockFile('product.jpg', 1536 * 1024)], // 1.5MB
      };

      mockRequest.files = mockFiles as any;

      (RateLimitService.isImageSizeAllowed as jest.Mock).mockReturnValue(true);

      await RateLimitMiddleware.checkImageSizeLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.isImageSizeAllowed).toHaveBeenCalledWith('free', 1024);
      expect(RateLimitService.isImageSizeAllowed).toHaveBeenCalledWith('free', 1536);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject oversized images', async () => {
      const mockFiles = {
        userImage: [createMockFile('large-user.jpg', 5 * 1024 * 1024)], // 5MB
      };

      mockRequest.files = mockFiles as any;

      (RateLimitService.isImageSizeAllowed as jest.Mock).mockReturnValue(false);
      (RateLimitService.getLimitConfig as jest.Mock).mockReturnValue({
        imageMaxSizeKB: 2048,
      });

      await RateLimitMiddleware.checkImageSizeLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(413);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'IMG_002',
          message: 'Image size exceeds limit for license type',
          code: 'IMAGE_SIZE_EXCEEDED',
          details: expect.objectContaining({
            fileName: 'large-user.jpg',
            fileSizeKB: 5120,
            maxSizeKB: 2048,
            licenseType: 'free',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle array format files', async () => {
      const mockFiles = [
        createMockFile('file1.jpg', 1024 * 1024),
        createMockFile('file2.jpg', 512 * 1024),
      ];

      mockRequest.files = mockFiles as any;

      (RateLimitService.isImageSizeAllowed as jest.Mock).mockReturnValue(true);

      await RateLimitMiddleware.checkImageSizeLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.isImageSizeAllowed).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when no files present', async () => {
      mockRequest.files = undefined;

      await RateLimitMiddleware.checkImageSizeLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(RateLimitService.isImageSizeAllowed).not.toHaveBeenCalled();
    });

    it('should reject request without license', async () => {
      mockRequest.license = undefined;

      await RateLimitMiddleware.checkImageSizeLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_001',
          message: 'License required for image size validation',
          code: 'MISSING_LICENSE_FOR_SIZE_CHECK',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkProductLimits', () => {
    it('should allow products within limits', async () => {
      mockRequest.body = { productCount: 2 };

      (RateLimitService.canUseProducts as jest.Mock).mockReturnValue(true);

      await RateLimitMiddleware.checkProductLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.canUseProducts).toHaveBeenCalledWith('free', 2);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject when product limit exceeded', async () => {
      mockRequest.body = { productCount: 5 };

      (RateLimitService.canUseProducts as jest.Mock).mockReturnValue(false);
      (RateLimitService.getLimitConfig as jest.Mock).mockReturnValue({
        maxProducts: 3,
      });

      await RateLimitMiddleware.checkProductLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LIMIT_003',
          message: 'Product limit exceeded for license type',
          code: 'PRODUCT_LIMIT_EXCEEDED',
          details: expect.objectContaining({
            requestedProducts: 5,
            maxProducts: 3,
            licenseType: 'free',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use default product count of 1', async () => {
      mockRequest.body = {};

      (RateLimitService.canUseProducts as jest.Mock).mockReturnValue(true);

      await RateLimitMiddleware.checkProductLimits(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.canUseProducts).toHaveBeenCalledWith('free', 1);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('addUsageHeaders', () => {
    it('should add usage headers successfully', async () => {
      const mockUsageStats = {
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        nextReset: new Date(),
        rateLimitSeconds: 60,
        timeUntilNextRequest: 0,
      };

      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue(mockUsageStats);

      await RateLimitMiddleware.addUsageHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSet).toHaveBeenCalledWith({
        'X-Usage-Current': '5',
        'X-Usage-Limit': '10',
        'X-Usage-Remaining': '5',
        'X-Usage-Reset': expect.any(String),
        'X-RateLimit-Seconds': '60',
      });

      expect(mockRequest.usageStats).toBe(mockUsageStats);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add retry-after header when rate limited', async () => {
      const mockUsageStats = {
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        nextReset: new Date(),
        rateLimitSeconds: 60,
        timeUntilNextRequest: 45000, // 45 seconds
      };

      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue(mockUsageStats);

      await RateLimitMiddleware.addUsageHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockSet).toHaveBeenCalledWith('X-RateLimit-Retry-After', '45');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without headers when no license ID', async () => {
      mockRequest.licenseId = undefined;

      await RateLimitMiddleware.addUsageHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.getUsageStats).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error without failing request', async () => {
      (RateLimitService.getUsageStats as jest.Mock).mockRejectedValue(new Error('Stats error'));

      await RateLimitMiddleware.addUsageHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('comprehensiveRateLimit', () => {
    it('should execute all middleware checks in sequence', async () => {
      const mockFiles = {
        userImage: [createMockFile('user.jpg', 1024 * 1024)],
      };

      mockRequest.files = mockFiles as any;
      mockRequest.body = { productCount: 1 };

      (RateLimitService.isImageSizeAllowed as jest.Mock).mockReturnValue(true);
      (RateLimitService.canUseProducts as jest.Mock).mockReturnValue(true);
      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });
      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue({
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        nextReset: new Date(),
        rateLimitSeconds: 60,
        timeUntilNextRequest: 0,
      });

      await RateLimitMiddleware.comprehensiveRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.isImageSizeAllowed).toHaveBeenCalled();
      expect(RateLimitService.canUseProducts).toHaveBeenCalled();
      expect(RateLimitService.checkLimits).toHaveBeenCalled();
      expect(RateLimitService.getUsageStats).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop at first failed check', async () => {
      const mockFiles = {
        userImage: [createMockFile('large.jpg', 10 * 1024 * 1024)],
      };

      mockRequest.files = mockFiles as any;

      (RateLimitService.isImageSizeAllowed as jest.Mock).mockReturnValue(false);
      (RateLimitService.getLimitConfig as jest.Mock).mockReturnValue({
        imageMaxSizeKB: 2048,
      });

      await RateLimitMiddleware.comprehensiveRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(413);
      expect(RateLimitService.canUseProducts).not.toHaveBeenCalled();
      expect(RateLimitService.checkLimits).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createCustomRateLimit', () => {
    it('should create middleware with custom options', async () => {
      const customMiddleware = RateLimitMiddleware.createCustomRateLimit({
        skipImageSizeCheck: true,
        skipProductLimitCheck: true,
        addUsageHeaders: false,
      });

      (RateLimitService.checkLimits as jest.Mock).mockResolvedValue({
        allowed: true,
        currentUsage: 5,
        monthlyLimit: 10,
        remainingGenerations: 5,
        resetDate: new Date(),
      });

      await customMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.isImageSizeAllowed).not.toHaveBeenCalled();
      expect(RateLimitService.canUseProducts).not.toHaveBeenCalled();
      expect(RateLimitService.checkLimits).toHaveBeenCalled();
      expect(RateLimitService.getUsageStats).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip all checks when configured', async () => {
      const customMiddleware = RateLimitMiddleware.createCustomRateLimit({
        skipImageSizeCheck: true,
        skipProductLimitCheck: true,
        skipGenerationLimitCheck: true,
        addUsageHeaders: false,
      });

      await customMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.isImageSizeAllowed).not.toHaveBeenCalled();
      expect(RateLimitService.canUseProducts).not.toHaveBeenCalled();
      expect(RateLimitService.checkLimits).not.toHaveBeenCalled();
      expect(RateLimitService.getUsageStats).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('addUsageStatsOnly', () => {
    it('should only add usage statistics', async () => {
      const mockUsageStats = {
        currentUsage: 3,
        monthlyLimit: 10,
        remainingGenerations: 7,
        nextReset: new Date(),
        rateLimitSeconds: 60,
        timeUntilNextRequest: 0,
      };

      (RateLimitService.getUsageStats as jest.Mock).mockResolvedValue(mockUsageStats);

      await RateLimitMiddleware.addUsageStatsOnly(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(RateLimitService.getUsageStats).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});