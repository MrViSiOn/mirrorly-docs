import { Request, Response } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { License } from '../../models/License';
import { AuthMiddleware } from '../../middleware/AuthMiddleware';
import sequelize from '../../config/db';

// Mock dependencies
jest.mock('../../models/License');
jest.mock('../../middleware/AuthMiddleware');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      body: {},
      headers: {},
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

  describe('registerFree', () => {
    it('should create a FREE license successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'TEST-FREE-KEY-123',
        domain: 'test.example.com',
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 0,
        created_at: new Date(),
        getRemainingGenerations: jest.fn().mockReturnValue(10),
      };

      mockRequest.body = { domain: 'test.example.com' };

      (License.findByDomain as jest.Mock).mockResolvedValue(null);
      (License.createFreeLicense as jest.Mock).mockResolvedValue(mockLicense);
      (AuthMiddleware.generateJWT as jest.Mock).mockReturnValue('mock-jwt-token');

      await AuthController.registerFree(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'FREE license created successfully',
          license: expect.objectContaining({
            license_key: 'TEST-FREE-KEY-123',
            domain: 'test.example.com',
            type: 'free',
          }),
          token: 'mock-jwt-token',
        })
      );
    });

    it('should reject request without domain', async () => {
      mockRequest.body = {};

      await AuthController.registerFree(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Domain is required',
          code: 'MISSING_DOMAIN',
        })
      );
    });

    it('should reject invalid domain format', async () => {
      mockRequest.body = { domain: 'invalid-domain' };

      await AuthController.registerFree(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid domain format',
          code: 'INVALID_DOMAIN_FORMAT',
        })
      );
    });

    it('should reject domain that already has a license', async () => {
      const existingLicense = {
        type: 'free',
        status: 'active',
        created_at: new Date(),
      };

      mockRequest.body = { domain: 'existing.example.com' };

      (License.findByDomain as jest.Mock).mockResolvedValue(existingLicense);

      await AuthController.registerFree(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DOMAIN_EXISTS',
          message: 'Domain already has a license',
          code: 'DOMAIN_ALREADY_REGISTERED',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.body = { domain: 'test.example.com' };

      (License.findByDomain as jest.Mock).mockRejectedValue(new Error('Database error'));

      await AuthController.registerFree(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          message: 'Failed to register FREE license',
          code: 'REGISTRATION_FAILED',
        })
      );
    });
  });

  describe('registerPro', () => {
    it('should create a PRO license successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'PRO-KEY-123',
        domain: 'pro.example.com',
        type: 'pro_basic',
        status: 'active',
        monthly_limit: 100,
        current_usage: 0,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        getRemainingGenerations: jest.fn().mockReturnValue(100),
      };

      mockRequest.body = {
        domain: 'pro.example.com',
        license_key: 'PRO-KEY-123',
        type: 'pro_basic',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);
      (License.findByDomain as jest.Mock).mockResolvedValue(null);
      (License.create as jest.Mock).mockResolvedValue(mockLicense);
      (AuthMiddleware.generateJWT as jest.Mock).mockReturnValue('mock-jwt-token');

      await AuthController.registerPro(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'PRO license created successfully',
          license: expect.objectContaining({
            license_key: 'PRO-KEY-123',
            type: 'pro_basic',
          }),
        })
      );
    });

    it('should upgrade existing FREE license to PRO', async () => {
      const existingFreeLicense = {
        id: 1,
        type: 'free',
        license_key: 'OLD-FREE-KEY',
        domain: 'upgrade.example.com',
        monthly_limit: 10,
        status: 'active',
        save: jest.fn(),
        getRemainingGenerations: jest.fn().mockReturnValue(100),
      };

      mockRequest.body = {
        domain: 'upgrade.example.com',
        license_key: 'NEW-PRO-KEY',
        type: 'pro_basic',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);
      (License.findByDomain as jest.Mock).mockResolvedValue(existingFreeLicense);
      (AuthMiddleware.generateJWT as jest.Mock).mockReturnValue('mock-jwt-token');

      await AuthController.registerPro(mockRequest as Request, mockResponse as Response);

      expect(existingFreeLicense.save).toHaveBeenCalled();
      expect(existingFreeLicense.license_key).toBe('NEW-PRO-KEY');
      expect(existingFreeLicense.type).toBe('pro_basic');
      expect(existingFreeLicense.monthly_limit).toBe(100);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'License upgraded to PRO successfully',
        })
      );
    });

    it('should reject invalid license type', async () => {
      mockRequest.body = {
        domain: 'test.example.com',
        license_key: 'TEST-KEY',
        type: 'invalid_type',
      };

      await AuthController.registerPro(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid license type',
          code: 'INVALID_LICENSE_TYPE',
        })
      );
    });

    it('should reject existing license key', async () => {
      const existingLicense = { id: 1 };

      mockRequest.body = {
        domain: 'test.example.com',
        license_key: 'EXISTING-KEY',
        type: 'pro_basic',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(existingLicense);

      await AuthController.registerPro(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_EXISTS',
          message: 'License key already exists',
          code: 'LICENSE_KEY_ALREADY_EXISTS',
        })
      );
    });
  });

  describe('validateLicense', () => {
    it('should validate a valid license successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'VALID-KEY',
        domain: 'valid.example.com',
        type: 'pro_basic',
        status: 'active',
        monthly_limit: 100,
        current_usage: 25,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
        getRemainingGenerations: jest.fn().mockReturnValue(75),
      };

      mockRequest.body = {
        license_key: 'VALID-KEY',
        domain: 'valid.example.com',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);
      (AuthMiddleware.generateJWT as jest.Mock).mockReturnValue('mock-jwt-token');

      await AuthController.validateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'License is valid',
          license: expect.objectContaining({
            license_key: 'VALID-KEY',
            domain: 'valid.example.com',
          }),
          token: 'mock-jwt-token',
        })
      );
    });

    it('should reject non-existent license', async () => {
      mockRequest.body = { license_key: 'NON-EXISTENT-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);

      await AuthController.validateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        })
      );
    });

    it('should reject expired license', async () => {
      const expiredLicense = {
        license_key: 'EXPIRED-KEY',
        domain: 'expired.example.com',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(true),
        save: jest.fn(),
      };

      mockRequest.body = { license_key: 'EXPIRED-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(expiredLicense);

      await AuthController.validateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
        })
      );
    });

    it('should reject unauthorized domain', async () => {
      const mockLicense = {
        license_key: 'VALID-KEY',
        domain: 'authorized.example.com',
        isExpired: jest.fn().mockReturnValue(false),
      };

      mockRequest.body = {
        license_key: 'VALID-KEY',
        domain: 'unauthorized.example.com',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await AuthController.validateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_003',
          message: 'Domain not authorized for this license',
          code: 'UNAUTHORIZED_DOMAIN',
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return status for authenticated license', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'STATUS-KEY',
        domain: 'status.example.com',
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 3,
        expires_at: null,
        created_at: new Date(),
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
        getRemainingGenerations: jest.fn().mockReturnValue(7),
        canGenerate: jest.fn().mockReturnValue(true),
      };

      mockRequest.license = mockLicense as any;

      await AuthController.getStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          authenticated: true,
          license: expect.objectContaining({
            license_key: 'STATUS-KEY',
            type: 'free',
          }),
          limits: expect.objectContaining({
            can_generate: true,
          }),
        })
      );
    });

    it('should reject unauthenticated request', async () => {
      mockRequest.license = undefined;

      await AuthController.getStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh JWT token successfully', async () => {
      const mockLicense = {
        id: 1,
        domain: 'refresh.example.com',
      };

      mockRequest.license = mockLicense as any;

      (AuthMiddleware.generateJWT as jest.Mock).mockReturnValue('new-jwt-token');

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          token: 'new-jwt-token',
          expires_in: 24 * 60 * 60,
        })
      );
    });

    it('should reject unauthenticated refresh request', async () => {
      mockRequest.license = undefined;

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        })
      );
    });
  });
});