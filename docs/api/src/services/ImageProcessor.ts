import sharp from 'sharp';
import {
  ImageProcessingOptions,
  ImageValidationOptions,
  ImageInfo,
  ProcessingResult,
  ValidationResult,
  OptimizationStats
} from '../types/image-processor';

/**
 * Servicio para procesamiento y optimización de imágenes
 * Utiliza Sharp para operaciones de alta performance
 */
export class ImageProcessor {
  private readonly defaultProcessingOptions: Required<ImageProcessingOptions> = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 85,
    format: 'jpeg',
    removeMetadata: true,
    optimize: true
  };

  private readonly defaultValidationOptions: Required<ImageValidationOptions> = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
    minWidth: 100,
    minHeight: 100,
    maxWidth: 4096,
    maxHeight: 4096
  };

  /**
   * Optimiza una imagen para uso con Google AI
   * Reduce tamaño y optimiza para minimizar costos de API
   */
  async optimize(
    imageBuffer: Buffer,
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const processingOptions = { ...this.defaultProcessingOptions, ...options };

    try {
      // Obtener información de la imagen original
      const originalInfo = await this.getImageInfo(imageBuffer);

      // Validar imagen antes de procesar
      const validation = await this.validateImage(imageBuffer, {});
      if (!validation.valid) {
        return {
          success: false,
          error: `Image validation failed: ${validation.errors.join(', ')}`,
          originalInfo
        };
      }

      // Crear pipeline de procesamiento
      let pipeline = sharp(imageBuffer);

      // Remover metadata si está habilitado
      if (processingOptions.removeMetadata) {
        pipeline = pipeline.withMetadata({
          exif: {},
          icc: undefined
        });
      }

      // Redimensionar si es necesario
      const needsResize = originalInfo.width > processingOptions.maxWidth ||
        originalInfo.height > processingOptions.maxHeight;

      if (needsResize) {
        pipeline = pipeline.resize(processingOptions.maxWidth, processingOptions.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Aplicar formato y compresión
      switch (processingOptions.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: processingOptions.quality,
            progressive: true,
            mozjpeg: processingOptions.optimize
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            compressionLevel: 9,
            progressive: true,
            palette: processingOptions.optimize
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality: processingOptions.quality,
            effort: processingOptions.optimize ? 6 : 4
          });
          break;
      }

      // Procesar imagen
      const processedBuffer = await pipeline.toBuffer();
      const processedInfo = await this.getImageInfo(processedBuffer);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        processedImage: processedBuffer,
        originalInfo,
        processedInfo,
        compressionRatio: (1 - processedInfo.size / originalInfo.size) * 100,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime
      };
    }
  }

  /**
   * Valida formato y tamaño de imagen
   */
  async validateImage(
    imageBuffer: Buffer,
    options: Partial<ImageValidationOptions> = {}
  ): Promise<ValidationResult> {
    const validationOptions = { ...this.defaultValidationOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verificar que el buffer no esté vacío
      if (!imageBuffer || imageBuffer.length === 0) {
        errors.push('Image buffer is empty');
        return { valid: false, errors, warnings };
      }

      // Verificar tamaño del archivo
      if (imageBuffer.length > validationOptions.maxSizeBytes) {
        errors.push(`Image size (${this.formatBytes(imageBuffer.length)}) exceeds maximum allowed (${this.formatBytes(validationOptions.maxSizeBytes)})`);
      }

      // Obtener información de la imagen
      const imageInfo = await this.getImageInfo(imageBuffer);

      // Validar formato
      if (!validationOptions.allowedFormats.includes(imageInfo.format.toLowerCase())) {
        errors.push(`Format '${imageInfo.format}' is not allowed. Allowed formats: ${validationOptions.allowedFormats.join(', ')}`);
      }

      // Validar dimensiones
      if (imageInfo.width < validationOptions.minWidth) {
        errors.push(`Image width (${imageInfo.width}px) is below minimum (${validationOptions.minWidth}px)`);
      }

      if (imageInfo.height < validationOptions.minHeight) {
        errors.push(`Image height (${imageInfo.height}px) is below minimum (${validationOptions.minHeight}px)`);
      }

      if (imageInfo.width > validationOptions.maxWidth) {
        warnings.push(`Image width (${imageInfo.width}px) exceeds recommended maximum (${validationOptions.maxWidth}px) - will be resized`);
      }

      if (imageInfo.height > validationOptions.maxHeight) {
        warnings.push(`Image height (${imageInfo.height}px) exceeds recommended maximum (${validationOptions.maxHeight}px) - will be resized`);
      }

      // Advertencias adicionales
      if (imageInfo.size > 5 * 1024 * 1024) { // 5MB
        warnings.push('Large image detected - consider optimizing for better performance');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        imageInfo
      };

    } catch (error) {
      errors.push(`Failed to validate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Redimensiona automáticamente una imagen manteniendo proporción
   */
  async autoResize(
    imageBuffer: Buffer,
    maxWidth: number = 1024,
    maxHeight: number = 1024,
    quality: number = 85
  ): Promise<ProcessingResult> {
    return this.optimize(imageBuffer, {
      maxWidth,
      maxHeight,
      quality,
      format: 'jpeg',
      optimize: true
    });
  }

  /**
   * Comprime una imagen para optimizar costos de API
   */
  async compressForAPI(imageBuffer: Buffer): Promise<ProcessingResult> {
    // Configuración agresiva para minimizar tamaño y costos
    return this.optimize(imageBuffer, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 75,
      format: 'jpeg',
      optimize: true,
      removeMetadata: true
    });
  }

  /**
   * Obtiene información detallada de una imagen
   */
  async getImageInfo(imageBuffer: Buffer): Promise<ImageInfo> {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: imageBuffer.length,
        hasAlpha: metadata.hasAlpha || false,
        density: metadata.density
      };
    } catch (error) {
      throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Genera estadísticas de optimización
   */
  async getOptimizationStats(
    originalBuffer: Buffer,
    optimizedBuffer: Buffer,
    processingTime: number,
    operations: string[] = []
  ): Promise<OptimizationStats> {
    return {
      originalSize: originalBuffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: (1 - optimizedBuffer.length / originalBuffer.length) * 100,
      processingTime,
      operations
    };
  }

  /**
   * Convierte una imagen a formato específico
   */
  async convertFormat(
    imageBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      const originalInfo = await this.getImageInfo(imageBuffer);
      let pipeline = sharp(imageBuffer);

      switch (targetFormat) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality, effort: 6 });
          break;
      }

      const processedBuffer = await pipeline.toBuffer();
      const processedInfo = await this.getImageInfo(processedBuffer);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        processedImage: processedBuffer,
        originalInfo,
        processedInfo,
        compressionRatio: (1 - processedInfo.size / originalInfo.size) * 100,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error: `Format conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime
      };
    }
  }

  /**
   * Crea una versión thumbnail de la imagen
   */
  async createThumbnail(
    imageBuffer: Buffer,
    width: number = 150,
    height: number = 150
  ): Promise<ProcessingResult> {
    return this.optimize(imageBuffer, {
      maxWidth: width,
      maxHeight: height,
      quality: 80,
      format: 'jpeg',
      optimize: true
    });
  }

  /**
   * Valida múltiples imágenes en lote
   */
  async validateMultipleImages(
    images: Buffer[],
    options: Partial<ImageValidationOptions> = {}
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const imageBuffer of images) {
      const result = await this.validateImage(imageBuffer, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Optimiza múltiples imágenes en lote
   */
  async optimizeMultiple(
    images: Buffer[],
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const imageBuffer of images) {
      const result = await this.optimize(imageBuffer, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Formatea bytes en formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Detecta si una imagen necesita optimización
   */
  async needsOptimization(
    imageBuffer: Buffer,
    thresholds: {
      maxSize?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<{ needs: boolean; reasons: string[] }> {
    const defaultThresholds = {
      maxSize: 2 * 1024 * 1024, // 2MB
      maxWidth: 1024,
      maxHeight: 1024,
      ...thresholds
    };

    const reasons: string[] = [];
    const imageInfo = await this.getImageInfo(imageBuffer);

    if (imageBuffer.length > defaultThresholds.maxSize) {
      reasons.push(`File size (${this.formatBytes(imageBuffer.length)}) exceeds threshold`);
    }

    if (imageInfo.width > defaultThresholds.maxWidth) {
      reasons.push(`Width (${imageInfo.width}px) exceeds threshold`);
    }

    if (imageInfo.height > defaultThresholds.maxHeight) {
      reasons.push(`Height (${imageInfo.height}px) exceeds threshold`);
    }

    return {
      needs: reasons.length > 0,
      reasons
    };
  }
}