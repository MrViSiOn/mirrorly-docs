import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../../middleware/AuthMiddleware';
import { License } from '../../models/License';
import sequelize from '../../config/db';

// Mock dependencies
jest.mock('../../models/License');
jest.mock('jsonwebtoken');

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockNext = jest.fn();

    mockRequest = {
      headers: {},
      body: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'VALID-API-KEY',
        domain: 'test.example.com',
        status: 'active',
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
      };

      mockRequest.headers = { 'x-api-key': 'VALID-API-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.license).toBe(mockLicense);
      expect(mockRequest.licenseId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject request without API key', async () => {
      mockRequest.headers = {};

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'API key is required',
          code: 'MISSING_API_KEY',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      mockRequest.headers = { 'x-api-key': 'INVALID-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Invalid API key',
          code: 'INVALID_API_KEY',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive license', async () => {
      const mockLicense = {
        status: 'suspended',
        isExpired: jest.fn().mockReturnValue(false),
      };

      mockRequest.headers = { 'x-api-key': 'SUSPENDED-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_002',
          message: 'License is not active',
          code: 'INACTIVE_LICENSE',
          status: 'suspended',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired license', async () => {
      const mockLicense = {
        status: 'active',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(true),
        save: jest.fn(),
      };

      mockRequest.headers = { 'x-api-key': 'EXPIRED-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockLicense.save).toHaveBeenCalled();
      expect(mockLicense.status).toBe('expired');

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reset usage if needed', async () => {
      const mockLicense = {
        id: 1,
        status: 'active',
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(true),
        resetMonthlyUsage: jest.fn(),
      };

      mockRequest.headers = { 'x-api-key': 'RESET-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockLicense.resetMonthlyUsage).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockRequest.headers = { 'x-api-key': 'ERROR-KEY' };

      (License.findByLicenseKey as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AuthMiddleware.validateApiKey(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          code: 'AUTH_INTERNAL_ERROR',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateDomain', () => {
    it('should validate domain successfully from header', async () => {
      const mockLicense = {
        domain: 'test.example.com',
      };

      mockRequest.license = mockLicense as any;
      mockRequest.headers = { 'x-domain': 'test.example.com' };

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should validate domain successfully from body', async () => {
      const mockLicense = {
        domain: 'test.example.com',
      };

      mockRequest.license = mockLicense as any;
      mockRequest.body = { domain: 'test.example.com' };

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should normalize domain correctly', async () => {
      const mockLicense = {
        domain: 'test.example.com',
      };

      mockRequest.license = mockLicense as any;
      mockRequest.headers = { 'x-domain': 'https://test.example.com/' };

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without license', async () => {
      mockRequest.license = undefined;

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'License not found in request',
          code: 'MISSING_LICENSE',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without domain', async () => {
      const mockLicense = { domain: 'test.example.com' };
      mockRequest.license = mockLicense as any;

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_003',
          message: 'Domain is required',
          code: 'MISSING_DOMAIN',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthorized domain', async () => {
      const mockLicense = {
        domain: 'authorized.example.com',
      };

      mockRequest.license = mockLicense as any;
      mockRequest.headers = { 'x-domain': 'unauthorized.example.com' };

      await AuthMiddleware.validateDomain(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_003',
          message: 'Domain not authorized for this license',
          code: 'UNAUTHORIZED_DOMAIN',
          authorized_domain: 'authorized.example.com',
          requested_domain: 'unauthorized.example.com',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireProLicense', () => {
    it('should allow PRO license', async () => {
      const mockLicense = {
        type: 'pro_basic',
      };

      mockRequest.license = mockLicense as any;

      await AuthMiddleware.requireProLicense(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject FREE license', async () => {
      const mockLicense = {
        type: 'free',
      };

      mockRequest.license = mockLicense as any;

      await AuthMiddleware.requireProLicense(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_001',
          message: 'PRO license required for this feature',
          code: 'PRO_LICENSE_REQUIRED',
          current_license: 'free',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without license', async () => {
      mockRequest.license = undefined;

      await AuthMiddleware.requireProLicense(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'License not found in request',
          code: 'MISSING_LICENSE',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('generateJWT', () => {
    it('should generate JWT token correctly', () => {
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = AuthMiddleware.generateJWT(1, 'test.example.com');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          licenseId: 1,
          domain: 'test.example.com',
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
        expect.any(String)
      );

      expect(token).toBe(mockToken);
    });

    it('should use default secret if not provided', () => {
      delete process.env.JWT_SECRET;

      AuthMiddleware.generateJWT(1, 'test.example.com');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'mirrorly-default-secret'
      );
    });

    it('should use environment JWT secret', () => {
      process.env.JWT_SECRET = 'custom-secret';

      AuthMiddleware.generateJWT(1, 'test.example.com');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'custom-secret'
      );
    });
  });

  describe('validateJWT', () => {
    it('should validate JWT token successfully', async () => {
      const mockLicense = {
        id: 1,
        domain: 'test.example.com',
      };

      const mockDecoded = {
        licenseId: 1,
        domain: 'test.example.com',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      (License.findByPk as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.license).toBe(mockLicense);
      expect(mockRequest.licenseId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject request without JWT token', async () => {
      mockRequest.headers = {};

      await AuthMiddleware.validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'JWT token is required',
          code: 'MISSING_JWT',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await AuthMiddleware.validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Invalid JWT token',
          code: 'INVALID_JWT',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject JWT with non-existent license', async () => {
      const mockDecoded = {
        licenseId: 999,
        domain: 'nonexistent.example.com',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-invalid-license',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      (License.findByPk as jest.Mock).mockResolvedValue(null);

      await AuthMiddleware.validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Invalid JWT token',
          code: 'INVALID_JWT',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle JWT verification errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer error-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Verification failed');
      });

      await AuthMiddleware.validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'JWT validation failed',
          code: 'JWT_VALIDATION_ERROR',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate when API key is provided', async () => {
      const mockLicense = {
        id: 1,
        status: 'active',
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
      };

      mockRequest.headers = { 'x-api-key': 'VALID-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.license).toBe(mockLicense);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no API key provided', async () => {
      mockRequest.headers = {};

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.license).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue without authentication on error', async () => {
      mockRequest.headers = { 'x-api-key': 'ERROR-KEY' };

      (License.findByLicenseKey as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });
});