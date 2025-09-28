/**
 * Interfaces para el procesamiento de imágenes
 */

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  removeMetadata?: boolean;
  optimize?: boolean;
}

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  allowedFormats?: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  density?: number;
}

export interface ProcessingResult {
  success: boolean;
  processedImage?: Buffer;
  originalInfo?: ImageInfo;
  processedInfo?: ImageInfo;
  compressionRatio?: number;
  processingTime?: number;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  imageInfo?: ImageInfo;
}

export interface OptimizationStats {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  processingTime: number;
  operations: string[];
}