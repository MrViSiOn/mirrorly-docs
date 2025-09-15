import { Request, Response } from 'express';
import { LicenseController } from '../../controllers/LicenseController';
import { License } from '../../models/License';
import { Op } from 'sequelize';
import sequelize from '../../config/db';

// Mock dependencies
jest.mock('../../models/License');

describe('LicenseController', () => {
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
      query: {},
      params: {},
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

  describe('getLicenseInfo', () => {
    it('should return license information successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'TEST-LICENSE-KEY',
        domain: 'test.example.com',
        type: 'pro_basic',
        status: 'active',
        monthly_limit: 100,
        current_usage: 25,
        last_reset: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(false),
        getRemainingGenerations: jest.fn().mockReturnValue(75),
        canGenerate: jest.fn().mockReturnValue(true),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.getLicenseInfo(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          license: expect.objectContaining({
            license_key: 'TEST-LICENSE-KEY',
            domain: 'test.example.com',
            type: 'pro_basic',
            status: 'active',
            monthly_limit: 100,
            current_usage: 25,
            remaining_generations: 75,
          }),
          limits: expect.objectContaining({
            monthly_generations: 100,
            remaining_generations: 75,
            rate_limit_seconds: 30,
            can_generate: true,
            days_until_expiry: expect.any(Number),
          }),
        })
      );
    });

    it('should handle expired license', async () => {
      const mockLicense = {
        license_key: 'EXPIRED-LICENSE',
        domain: 'expired.example.com',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(true),
      };

      mockRequest.license = mockLicense as any;

      // Mock the private method
      jest.spyOn(LicenseController as any, 'handleExpiredLicense').mockResolvedValue(undefined);

      await LicenseController.getLicenseInfo(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_002',
          message: 'License has expired',
          code: 'EXPIRED_LICENSE',
          degraded_to: 'free',
        })
      );
    });

    it('should reset usage if needed', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'RESET-LICENSE',
        domain: 'reset.example.com',
        type: 'free',
        status: 'active',
        monthly_limit: 10,
        current_usage: 8,
        isExpired: jest.fn().mockReturnValue(false),
        shouldResetUsage: jest.fn().mockReturnValue(true),
        resetMonthlyUsage: jest.fn(),
        getRemainingGenerations: jest.fn().mockReturnValue(10),
        canGenerate: jest.fn().mockReturnValue(true),
        last_reset: new Date(),
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.getLicenseInfo(mockRequest as Request, mockResponse as Response);

      expect(mockLicense.resetMonthlyUsage).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should reject request without license', async () => {
      mockRequest.license = undefined;

      await LicenseController.getLicenseInfo(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_001',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        })
      );
    });
  });

  describe('validateProLicense', () => {
    it('should validate PRO license successfully', async () => {
      const mockLicense = {
        type: 'pro_basic',
        status: 'active',
        monthly_limit: 100,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(false),
        getRemainingGenerations: jest.fn().mockReturnValue(75),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.validateProLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'PRO license is valid',
          license: expect.objectContaining({
            type: 'pro_basic',
            status: 'active',
          }),
          pro_features: expect.objectContaining({
            unlimited_products: true,
            custom_styling: true,
            priority_support: true,
            advanced_analytics: false,
          }),
        })
      );
    });

    it('should reject FREE license for PRO validation', async () => {
      const mockLicense = {
        type: 'free',
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.validateProLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_001',
          message: 'PRO license required',
          code: 'PRO_LICENSE_REQUIRED',
          current_license: 'free',
          upgrade_required: true,
        })
      );
    });

    it('should handle expired PRO license', async () => {
      const mockLicense = {
        type: 'pro_basic',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(true),
      };

      mockRequest.license = mockLicense as any;

      // Mock the private method
      jest.spyOn(LicenseController as any, 'handleExpiredLicense').mockResolvedValue(undefined);

      await LicenseController.validateProLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'AUTH_002',
          message: 'PRO license has expired, degraded to FREE',
          code: 'PRO_LICENSE_EXPIRED',
          degraded_to: 'free',
        })
      );
    });

    it('should handle suspended PRO license', async () => {
      const mockLicense = {
        type: 'pro_basic',
        status: 'suspended',
        isExpired: jest.fn().mockReturnValue(false),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.validateProLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_002',
          message: 'PRO license is suspended',
          code: 'PRO_LICENSE_SUSPENDED',
        })
      );
    });
  });

  describe('getExpirationStatus', () => {
    it('should return expiration status for license with expiration', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const mockLicense = {
        license_key: 'EXPIRING-LICENSE',
        type: 'pro_basic',
        status: 'active',
        expires_at: futureDate,
        isExpired: jest.fn().mockReturnValue(false),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.getExpirationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          license_key: 'EXPIRING-LICENSE',
          current_type: 'pro_basic',
          current_status: 'active',
          expiration: expect.objectContaining({
            has_expiration: true,
            is_expired: false,
            expires_at: futureDate,
            days_until_expiry: 5,
            expires_soon: true,
            expires_today: false,
            warning_level: 'warning',
          }),
        })
      );
    });

    it('should return expiration status for license without expiration', async () => {
      const mockLicense = {
        license_key: 'PERMANENT-LICENSE',
        type: 'free',
        status: 'active',
        expires_at: null,
        isExpired: jest.fn().mockReturnValue(false),
      };

      mockRequest.license = mockLicense as any;

      await LicenseController.getExpirationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          expiration: expect.objectContaining({
            has_expiration: false,
            is_expired: false,
            expires_at: null,
          }),
        })
      );
    });

    it('should handle expired license in expiration status', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockLicense = {
        license_key: 'EXPIRED-LICENSE',
        type: 'pro_basic',
        status: 'active',
        expires_at: pastDate,
        isExpired: jest.fn().mockReturnValue(true),
      };

      mockRequest.license = mockLicense as any;

      // Mock the private method
      jest.spyOn(LicenseController as any, 'handleExpiredLicense').mockResolvedValue(undefined);

      await LicenseController.getExpirationStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          expiration: expect.objectContaining({
            is_expired: true,
            degraded_to: 'free',
          }),
        })
      );
    });
  });

  describe('upgradeLicense', () => {
    it('should upgrade license successfully', async () => {
      const mockLicense = {
        id: 1,
        type: 'free',
        license_key: 'OLD-FREE-KEY',
        domain: 'upgrade.example.com',
        status: 'active',
        monthly_limit: 10,
        current_usage: 5,
        save: jest.fn(),
        updated_at: new Date(),
        expires_at: null,
      };

      mockRequest.license = mockLicense as any;
      mockRequest.body = {
        new_license_key: 'NEW-PRO-KEY',
        type: 'pro_basic',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);

      await LicenseController.upgradeLicense(mockRequest as Request, mockResponse as Response);

      expect(mockLicense.save).toHaveBeenCalled();
      expect(mockLicense.license_key).toBe('NEW-PRO-KEY');
      expect(mockLicense.type).toBe('pro_basic');
      expect(mockLicense.monthly_limit).toBe(100);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'License upgraded from free to pro_basic',
          upgrade_info: expect.objectContaining({
            previous_type: 'free',
            new_type: 'pro_basic',
            new_monthly_limit: 100,
          }),
        })
      );
    });

    it('should reject upgrade with missing data', async () => {
      const mockLicense = { id: 1 };
      mockRequest.license = mockLicense as any;
      mockRequest.body = { type: 'pro_basic' }; // Missing new_license_key

      await LicenseController.upgradeLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'New license key and type are required',
          code: 'MISSING_UPGRADE_DATA',
        })
      );
    });

    it('should reject upgrade with invalid type', async () => {
      const mockLicense = { id: 1 };
      mockRequest.license = mockLicense as any;
      mockRequest.body = {
        new_license_key: 'NEW-KEY',
        type: 'invalid_type',
      };

      await LicenseController.upgradeLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid license type for upgrade',
          code: 'INVALID_UPGRADE_TYPE',
        })
      );
    });

    it('should reject upgrade with existing license key', async () => {
      const mockLicense = { id: 1 };
      const existingLicense = { id: 2 };

      mockRequest.license = mockLicense as any;
      mockRequest.body = {
        new_license_key: 'EXISTING-KEY',
        type: 'pro_basic',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(existingLicense);

      await LicenseController.upgradeLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_EXISTS',
          message: 'License key already exists',
          code: 'LICENSE_KEY_EXISTS',
        })
      );
    });
  });

  describe('suspendLicense', () => {
    it('should suspend license successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'SUSPEND-KEY',
        domain: 'suspend.example.com',
        type: 'pro_basic',
        status: 'active',
        save: jest.fn(),
      };

      mockRequest.body = {
        license_key: 'SUSPEND-KEY',
        reason: 'Violation of terms',
      };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await LicenseController.suspendLicense(mockRequest as Request, mockResponse as Response);

      expect(mockLicense.save).toHaveBeenCalled();
      expect(mockLicense.status).toBe('suspended');

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'License suspended successfully',
          reason: 'Violation of terms',
        })
      );
    });

    it('should reject suspension of non-existent license', async () => {
      mockRequest.body = { license_key: 'NON-EXISTENT' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(null);

      await LicenseController.suspendLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_NOT_FOUND',
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND',
        })
      );
    });
  });

  describe('reactivateLicense', () => {
    it('should reactivate license successfully', async () => {
      const mockLicense = {
        id: 1,
        license_key: 'REACTIVATE-KEY',
        domain: 'reactivate.example.com',
        type: 'pro_basic',
        status: 'suspended',
        isExpired: jest.fn().mockReturnValue(false),
        save: jest.fn(),
      };

      mockRequest.body = { license_key: 'REACTIVATE-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await LicenseController.reactivateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockLicense.save).toHaveBeenCalled();
      expect(mockLicense.status).toBe('active');

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'License reactivated successfully',
        })
      );
    });

    it('should reject reactivation of expired license', async () => {
      const mockLicense = {
        license_key: 'EXPIRED-KEY',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: jest.fn().mockReturnValue(true),
      };

      mockRequest.body = { license_key: 'EXPIRED-KEY' };

      (License.findByLicenseKey as jest.Mock).mockResolvedValue(mockLicense);

      await LicenseController.reactivateLicense(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'LICENSE_EXPIRED',
          message: 'Cannot reactivate expired license',
          code: 'CANNOT_REACTIVATE_EXPIRED',
        })
      );
    });
  });

  describe('getExpiringSoon', () => {
    it('should return licenses expiring soon', async () => {
      const expiringLicenses = [
        {
          license_key: 'EXPIRING-1',
          domain: 'expiring1.example.com',
          type: 'pro_basic',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
        {
          license_key: 'EXPIRING-2',
          domain: 'expiring2.example.com',
          type: 'pro_premium',
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      ];

      mockRequest.query = { days: '7' };

      (License.findAll as jest.Mock).mockResolvedValue(expiringLicenses);

      await LicenseController.getExpiringSoon(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Found 2 licenses expiring in the next 7 days',
          count: 2,
          licenses: expect.arrayContaining([
            expect.objectContaining({
              license_key: 'EXPIRING-1',
              days_until_expiry: 3,
            }),
            expect.objectContaining({
              license_key: 'EXPIRING-2',
              days_until_expiry: 5,
            }),
          ]),
        })
      );
    });

    it('should use default days parameter', async () => {
      mockRequest.query = {};

      (License.findAll as jest.Mock).mockResolvedValue([]);

      await LicenseController.getExpiringSoon(mockRequest as Request, mockResponse as Response);

      expect(License.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expires_at: {
              [Op.between]: expect.any(Array),
            },
          }),
        })
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Found 0 licenses expiring in the next 7 days',
        })
      );
    });
  });
});