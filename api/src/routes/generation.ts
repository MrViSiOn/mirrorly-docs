import { Router } from 'express';
import { GenerationController } from '../controllers/GenerationController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { RateLimitMiddleware } from '../middleware/RateLimitMiddleware';

const router = Router();
const generationController = new GenerationController();
const upload = GenerationController.getMulterConfig();

/**
 * Generation Routes
 * Todas las rutas requieren autenticación con API key
 */

/**
 * POST /generate/image
 * Generar imagen con IA usando foto del usuario y producto
 *
 * Headers requeridos:
 * - X-API-Key: License key
 * - X-Domain: Domain (opcional, para validación adicional)
 *
 * Body (multipart/form-data):
 * - userImage: Archivo de imagen del usuario
 * - productImage: Archivo de imagen del producto
 * - productId: ID del producto (opcional)
 * - style: 'realistic' | 'artistic' | 'professional' (opcional, default: 'professional')
 * - quality: 'standard' | 'high' | 'premium' (opcional, default: 'high')
 * - productType: 'clothing' | 'jewelry' | 'accessories' | 'shoes' | 'bags' | 'automático' (opcional, default: 'automático')
 */
router.post('/image',
  // Middleware de autenticación
  AuthMiddleware.validateApiKey,

  // Middleware de rate limiting
  RateLimitMiddleware.comprehensiveRateLimit,

  // Middleware de multer para archivos
  upload.fields([
    { name: 'userImage', maxCount: 1 },
    { name: 'productImage', maxCount: 1 }
  ]),

  // Controlador
  (req, res) => generationController.generateImage(req, res)
);

/**
 * GET /limits/current
 * Consultar límites actuales de uso
 *
 * Headers requeridos:
 * - X-API-Key: License key
 */
router.get('/current',
  AuthMiddleware.validateApiKey,
  RateLimitMiddleware.addUsageStatsOnly,
  (req, res) => generationController.getCurrentLimits(req, res)
);



/**
 * GET /generate/status/:id
 * Consultar estado de una generación específica
 *
 * Headers requeridos:
 * - X-API-Key: License key
 *
 * Params:
 * - id: ID de la generación
 */
router.get('/status/:id',
  AuthMiddleware.validateApiKey,
  (req, res) => generationController.getGenerationStatus(req, res)
);

/**
 * GET /generate/image/:fileName
 * Servir una imagen generada desde el sistema de archivos
 */
router.get('/image/:fileName', AuthMiddleware.validateApiKey, generationController.serveGeneratedImage.bind(generationController));

// Middleware de manejo de errores específico para multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof Error) {
    if (error.message.includes('File too large')) {
      return res.status(413).json({
        error: 'IMG_002',
        message: 'Image file too large',
        code: 'FILE_TOO_LARGE',
        maxSize: '10MB'
      });
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        error: 'IMG_001',
        message: error.message,
        code: 'INVALID_FILE_TYPE'
      });
    }

    if (error.message.includes('Too many files')) {
      return res.status(400).json({
        error: 'IMG_001',
        message: 'Too many files uploaded',
        code: 'TOO_MANY_FILES',
        maxFiles: 2
      });
    }
  }

  next(error);
});

export default router;