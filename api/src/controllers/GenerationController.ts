import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GoogleAIService } from '../services/GoogleAIService';
import { RateLimitService } from '../services/RateLimitService';
import { ImageProcessor } from '../services/ImageProcessor';
import { Generation } from '../models/Generation';
import { License } from '../models/License';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { GenerationOptions } from '../types/google-ai';
import { loggingService } from '../services/LoggingService';

/**
 * Controlador para la generación de imágenes con Google AI
 * Maneja el flujo completo: validación, rate limiting, procesamiento y generación
 */
export class GenerationController {
  private imageProcessor: ImageProcessor;

  constructor() {
    // Inicializar servicios
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * Obtiene una instancia de GoogleAIService con la API key de la licencia
   * @param license Licencia que contiene la API key cifrada
   * @returns Instancia configurada de GoogleAIService
   */
  private static getGoogleAIService(license: License): GoogleAIService {
    const googleApiKey = license.getDecryptedGoogleKey();
    if (!googleApiKey) {
      throw new Error('Google API key not configured. Please configure your Google API key in the plugin settings.');
    }
    return new GoogleAIService({ apiKey: googleApiKey });
  }

  /**
   * POST /generate/image
   * Endpoint principal para generar imágenes con IA
   */
  async generateImage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const authReq = req as AuthenticatedRequest;
      const { license, licenseId } = authReq;

      if (!license || !licenseId) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Validar archivos de imagen
      const files = req.files as { [fieldname: string]: any[] };
      const userImageFile = files?.userImage?.[0];
      const productImageFile = files?.productImage?.[0];

      if (!userImageFile || !productImageFile) {
        res.status(400).json({
          error: 'IMG_001',
          message: 'Both user image and product image are required',
          code: 'MISSING_IMAGES',
          required: ['userImage', 'productImage']
        });
        return;
      }

      // Verificar límites de rate limiting
      const rateLimitCheck = await RateLimitService.checkLimits(licenseId);

      // Log rate limit check
      loggingService.logRateLimit(licenseId, req.originalUrl, !rateLimitCheck.allowed);

      if (!rateLimitCheck.allowed) {
        res.status(429).json({
          error: 'LIMIT_001',
          message: rateLimitCheck.reason || 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            currentUsage: rateLimitCheck.currentUsage,
            monthlyLimit: rateLimitCheck.monthlyLimit,
            remainingGenerations: rateLimitCheck.remainingGenerations,
            resetDate: rateLimitCheck.resetDate,
            retryAfterMs: rateLimitCheck.remainingTimeMs
          }
        });
        return;
      }

      // Validar y procesar imágenes
      const userImageValidation = await this.imageProcessor.validateImage(userImageFile.buffer);
      if (!userImageValidation.valid) {
        res.status(400).json({
          error: 'IMG_001',
          message: 'Invalid user image',
          code: 'INVALID_USER_IMAGE',
          errors: userImageValidation.errors
        });
        return;
      }

      const productImageValidation = await this.imageProcessor.validateImage(productImageFile.buffer);
      if (!productImageValidation.valid) {
        res.status(400).json({
          error: 'IMG_001',
          message: 'Invalid product image',
          code: 'INVALID_PRODUCT_IMAGE',
          errors: productImageValidation.errors
        });
        return;
      }

      // Crear registro de generación
      const generation = await Generation.create({
        license_id: licenseId,
        product_id: req.body.productId || 'unknown',
        user_image_hash: this.generateImageHash(userImageFile.buffer),
        product_image_hash: this.generateImageHash(productImageFile.buffer),
        status: 'processing'
      });

      // Procesar imágenes para optimizar costos de API
      const processedUserImage = await this.imageProcessor.compressForAPI(userImageFile.buffer);
      const processedProductImage = await this.imageProcessor.compressForAPI(productImageFile.buffer);

      if (!processedUserImage.success || !processedProductImage.success) {
        await generation.update({ status: 'failed' });
        res.status(500).json({
          error: 'IMG_003',
          message: 'Failed to process images',
          code: 'IMAGE_PROCESSING_FAILED'
        });
        return;
      }

      // Preparar opciones de generación
      const generationOptions: GenerationOptions = {
        style: req.body.style || 'professional',
        quality: req.body.quality || 'high',
        productType: req.body.productType || 'automático'
      };

      // Obtener instancia de GoogleAI con la API key de la licencia
      const googleAI = GenerationController.getGoogleAIService(license);

      // Generar imagen con Google AI (flujo de dos pasos)
      const result = await googleAI.generateImage(
        processedUserImage.processedImage!,
        processedProductImage.processedImage!,
        generationOptions,
        `${req.protocol}://${req.get('host')}`
      );

      if (!result.success) {
        await generation.update({
          status: 'failed',
          error_message: result.error
        });

        // Log failed generation
        loggingService.logGeneration({
          generationId: generation.id.toString(),
          licenseId: String(licenseId),
          licenseType: license.type,
          imageSize: userImageFile.size + productImageFile.size,
          processingTime: Date.now() - startTime,
          googleAIModel: process.env.GOOGLE_AI_MODEL_VISION || 'gemini-1.0-pro-vision',
          promptLength: 0,
          success: false,
          error: result.error
        });

        res.status(500).json({
          error: 'GAI_001',
          message: 'Image generation failed',
          code: 'GOOGLE_AI_ERROR',
          details: result.error
        });
        return;
      }

      // Actualizar registro con resultado exitoso
      await generation.update({
        status: 'completed',
        result_image_url: result.imageUrl,
        processing_time_ms: result.processingTime,
        used_prompt: result.usedPrompt,
        completed_at: new Date()
      });

      // Incrementar contadores de uso
      await RateLimitService.incrementUsage(licenseId);

      const totalTime = Date.now() - startTime;

      // Log successful generation
      loggingService.logGeneration({
        generationId: generation.id.toString(),
        licenseId: String(licenseId),
        licenseType: license.type,
        imageSize: userImageFile.size + productImageFile.size,
        processingTime: totalTime,
        googleAIModel: result.metadata?.model || process.env.GOOGLE_AI_MODEL_VISION || 'gemini-1.0-pro-vision',
        promptLength: result.usedPrompt?.length || 0,
        success: true
      });

      // Enviar respuesta exitosa al cliente
      res.status(200).json({
        success: true,
        imageUrl: result.imageUrl,
        processingTime: totalTime,
        generationId: generation.id
      });


    } catch (error) {
      const totalTime = Date.now() - startTime;

      loggingService.error('Image generation failed', error as Error, {
        requestId: req.id,
        method: req.method,
        endpoint: req.originalUrl,
        processingTime: totalTime,
        licenseId: String((req as AuthenticatedRequest).licenseId)
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Image generation failed',
        code: 'GENERATION_INTERNAL_ERROR',
        processingTime: totalTime,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  }

  /**
   * GET /generate/status/:id
   * Consultar estado de una generación específica
   */
  async getGenerationStatus(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { licenseId } = authReq;
      const { id } = req.params;

      if (!licenseId) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Buscar generación por ID y licencia
      const generation = await Generation.findOne({
        where: {
          id: parseInt(id),
          license_id: licenseId
        }
      });

      if (!generation) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Generation not found',
          code: 'GENERATION_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        id: generation.id,
        status: generation.status,
        productId: generation.product_id,
        createdAt: generation.created_at,
        completedAt: generation.completed_at,
        processingTime: generation.processing_time_ms,
        imageUrl: generation.result_image_url,
        errorMessage: generation.error_message,
        usedPrompt: generation.used_prompt
      });

    } catch (error) {
      loggingService.error('Failed to get generation status', error as Error, {
        requestId: req.id,
        generationId: req.params.id,
        licenseId: String((req as AuthenticatedRequest).licenseId)
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get generation status',
        code: 'STATUS_INTERNAL_ERROR'
      });
    }
  }

  /**
   * GET /generate/image/:fileName
   * Servir una imagen generada desde el sistema de archivos
   */
  async serveGeneratedImage(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.params;

      // Validar el nombre del archivo para evitar path traversal
      if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        res.status(400).json({
          error: 'INVALID_FILENAME',
          message: 'Invalid file name',
          code: 'INVALID_REQUEST'
        });
        return;
      }

      // Construir la ruta al archivo
      const filePath = path.join(__dirname, '../../uploads/generated', fileName);

      // Verificar si el archivo existe
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          error: 'FILE_NOT_FOUND',
          message: 'Generated image not found',
          code: 'IMAGE_NOT_FOUND'
        });
        return;
      }

      // Determinar el tipo MIME basado en la extensión
      const ext = path.extname(fileName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
          'application/octet-stream';

      // Configurar headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año

      // Enviar el archivo
      fs.createReadStream(filePath).pipe(res);

    } catch (error) {
      loggingService.error('Failed to serve generated image', error as Error, {
        requestId: req.id,
        fileName: req.params.fileName
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to serve generated image',
        code: 'IMAGE_SERVE_ERROR'
      });
    }
  }
  async getCurrentLimits(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { license, licenseId } = authReq;

      if (!license || !licenseId) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Obtener estadísticas de uso actuales
      const usageStats = await RateLimitService.getUsageStats(licenseId);

      if (!usageStats) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Usage statistics not found',
          code: 'USAGE_STATS_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        licenseType: license.type,
        monthlyLimits: {
          total: usageStats.monthlyLimit,
          used: usageStats.currentUsage,
          remaining: usageStats.remainingGenerations,
          resetDate: usageStats.nextReset
        },
        rateLimits: {
          seconds: usageStats.rateLimitSeconds,
          timeUntilNextRequest: usageStats.timeUntilNextRequest,
          lastRequest: usageStats.lastRequest
        },
        canGenerate: usageStats.remainingGenerations > 0 && usageStats.timeUntilNextRequest <= 0,
        restrictions: {
          maxProducts: RateLimitService.getLimitConfig(license.type).maxProducts,
          imageMaxSizeKB: RateLimitService.getLimitConfig(license.type).imageMaxSizeKB
        }
      });

    } catch (error) {
      loggingService.error('Failed to get current limits', error as Error, {
        requestId: req.id,
        licenseId: String((req as AuthenticatedRequest).licenseId)
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get current limits',
        code: 'LIMITS_INTERNAL_ERROR'
      });
    }
  }

  /**
   * GET /auth/status
   * Validar estado de autenticación y licencia
   */
  async getAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const { license } = authReq;

      if (!license) {
        res.status(401).json({
          error: 'AUTH_001',
          message: 'Authentication required',
          code: 'MISSING_LICENSE'
        });
        return;
      }

      // Verificar si la licencia necesita reset de uso
      if (license.shouldResetUsage()) {
        await license.resetMonthlyUsage();
      }

      res.status(200).json({
        authenticated: true,
        license: {
          id: license.id,
          type: license.type,
          status: license.status,
          domain: license.domain,
          createdAt: license.created_at,
          expiresAt: license.expires_at,
          isExpired: license.isExpired(),
          daysUntilExpiration: license.expires_at ? Math.ceil((license.expires_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        },
        usage: {
          monthlyLimit: license.monthly_limit,
          currentUsage: license.current_usage,
          remaining: license.monthly_limit - license.current_usage,
          lastReset: license.last_reset
        },
        features: {
          canGenerate: license.current_usage < license.monthly_limit && license.status === 'active',
          maxProducts: license.type === 'free' ? 3 : -1,
          customization: license.type !== 'free',
          priority: license.type === 'pro_premium'
        }
      });

    } catch (error) {
      loggingService.error('Failed to get authentication status', error as Error, {
        requestId: req.id,
        licenseId: String((req as AuthenticatedRequest).licenseId)
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get authentication status',
        code: 'AUTH_STATUS_INTERNAL_ERROR'
      });
    }
  }

  /**
   * Configurar multer para manejo de archivos
   */
  static getMulterConfig(): multer.Multer {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 2 // máximo 2 archivos (user + product image)
      },
      fileFilter: (req, file, cb) => {
        // Validar tipos de archivo
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`));
        }
      }
    });
  }

  /**
   * Generar hash de imagen para tracking
    * Genera un hash SHA-256 de 64 caracteres para cumplir con la validación del modelo
   */
  private generateImageHash(imageBuffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Validar configuración del controlador
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Note: Google AI API key validation is now done per-license
    // No global validation needed since each license has its own API key

    return {
      valid: errors.length === 0,
      errors
    };
  }
}