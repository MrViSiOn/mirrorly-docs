import fs from 'fs';
import path from 'path';
import { gzip, brotliCompress } from 'zlib';
import { promisify } from 'util';
import { loggingService } from './LoggingService';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'brotli';
  filePath: string;
}

export interface OptimizationStats {
  filesProcessed: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSpaceSaved: number;
  averageCompressionRatio: number;
  errors: number;
  duration: number;
}

/**
 * Service for optimizing and compressing static assets
 */
export class AssetOptimizationService {
  private readonly compressibleExtensions = [
    '.js', '.css', '.html', '.json', '.xml', '.svg', '.txt', '.md'
  ];

  private readonly compressionOptions = {
    gzip: {
      level: 9, // Maximum compression
      windowBits: 15,
      memLevel: 8
    },
    brotli: {
      params: {
        [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11, // Maximum quality
        [require('zlib').constants.BROTLI_PARAM_SIZE_HINT]: 0
      }
    }
  };

  /**
   * Compress a single file with both gzip and brotli
   */
  public async compressFile(filePath: string): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const originalContent = fs.readFileSync(filePath);
      const originalSize = originalContent.length;

      // Skip if file is too small to benefit from compression
      if (originalSize < 1024) {
        loggingService.debug('Skipping compression for small file', {
          file: path.basename(filePath),
          size: originalSize
        });
        return results;
      }

      // Gzip compression
      try {
        const gzipCompressed = await gzipAsync(originalContent, this.compressionOptions.gzip);
        const gzipPath = `${filePath}.gz`;

        fs.writeFileSync(gzipPath, gzipCompressed);

        results.push({
          originalSize,
          compressedSize: gzipCompressed.length,
          compressionRatio: (1 - gzipCompressed.length / originalSize) * 100,
          algorithm: 'gzip',
          filePath: gzipPath
        });

        loggingService.debug('Gzip compression completed', {
          file: path.basename(filePath),
          originalSize,
          compressedSize: gzipCompressed.length,
          ratio: Math.round((1 - gzipCompressed.length / originalSize) * 100 * 100) / 100
        });
      } catch (error) {
        loggingService.warn('Gzip compression failed', {
          file: filePath,
          error: (error as Error).message
        });
      }

      // Brotli compression
      try {
        const brotliCompressed = await brotliAsync(originalContent, this.compressionOptions.brotli);
        const brotliPath = `${filePath}.br`;

        fs.writeFileSync(brotliPath, brotliCompressed);

        results.push({
          originalSize,
          compressedSize: brotliCompressed.length,
          compressionRatio: (1 - brotliCompressed.length / originalSize) * 100,
          algorithm: 'brotli',
          filePath: brotliPath
        });

        loggingService.debug('Brotli compression completed', {
          file: path.basename(filePath),
          originalSize,
          compressedSize: brotliCompressed.length,
          ratio: Math.round((1 - brotliCompressed.length / originalSize) * 100 * 100) / 100
        });
      } catch (error) {
        loggingService.warn('Brotli compression failed', {
          file: filePath,
          error: (error as Error).message
        });
      }

    } catch (error) {
      loggingService.error('File compression failed', error as Error, {
        file: filePath
      });
    }

    return results;
  }

  /**
   * Compress all assets in a directory
   */
  public async compressDirectory(directory: string): Promise<OptimizationStats> {
    const startTime = Date.now();
    const stats: OptimizationStats = {
      filesProcessed: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalSpaceSaved: 0,
      averageCompressionRatio: 0,
      errors: 0,
      duration: 0
    };

    try {
      loggingService.info('Starting directory compression', { directory });

      const files = await this.getCompressibleFiles(directory);

      for (const filePath of files) {
        try {
          const results = await this.compressFile(filePath);

          if (results.length > 0) {
            stats.filesProcessed++;

            // Use the best compression result
            const bestResult = results.reduce((best, current) =>
              current.compressionRatio > best.compressionRatio ? current : best
            );

            stats.totalOriginalSize += bestResult.originalSize;
            stats.totalCompressedSize += bestResult.compressedSize;
          }
        } catch (error) {
          stats.errors++;
          loggingService.warn('Failed to compress file', {
            file: filePath,
            error: (error as Error).message
          });
        }
      }

      stats.totalSpaceSaved = stats.totalOriginalSize - stats.totalCompressedSize;
      stats.averageCompressionRatio = stats.totalOriginalSize > 0
        ? (stats.totalSpaceSaved / stats.totalOriginalSize) * 100
        : 0;

    } catch (error) {
      loggingService.error('Directory compression failed', error as Error, { directory });
      stats.errors++;
    }

    stats.duration = Date.now() - startTime;

    loggingService.info('Directory compression completed', {
      ...stats,
      totalOriginalSizeMB: Math.round(stats.totalOriginalSize / 1024 / 1024 * 100) / 100,
      totalCompressedSizeMB: Math.round(stats.totalCompressedSize / 1024 / 1024 * 100) / 100,
      spaceSavedMB: Math.round(stats.totalSpaceSaved / 1024 / 1024 * 100) / 100
    });

    return stats;
  }

  /**
   * Optimize CSS files by minifying
   */
  public async optimizeCSS(filePath: string): Promise<{
    originalSize: number;
    optimizedSize: number;
    spaceSaved: number;
  }> {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      const originalSize = originalContent.length;

      // Simple CSS minification
      const optimizedContent = originalContent
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around specific characters
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();

      const optimizedSize = optimizedContent.length;
      const spaceSaved = originalSize - optimizedSize;

      // Write optimized version
      const optimizedPath = filePath.replace(/\.css$/, '.min.css');
      fs.writeFileSync(optimizedPath, optimizedContent);

      loggingService.debug('CSS optimization completed', {
        file: path.basename(filePath),
        originalSize,
        optimizedSize,
        spaceSaved,
        compressionRatio: Math.round((spaceSaved / originalSize) * 100 * 100) / 100
      });

      return { originalSize, optimizedSize, spaceSaved };

    } catch (error) {
      loggingService.error('CSS optimization failed', error as Error, { file: filePath });
      throw error;
    }
  }

  /**
   * Optimize JavaScript files by basic minification
   */
  public async optimizeJS(filePath: string): Promise<{
    originalSize: number;
    optimizedSize: number;
    spaceSaved: number;
  }> {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      const originalSize = originalContent.length;

      // Basic JS minification (for production, use proper tools like Terser)
      const optimizedContent = originalContent
        // Remove single-line comments (but preserve URLs)
        .replace(/(?:^|\s)\/\/(?![^\r\n]*https?:).*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around operators and punctuation
        .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
        // Remove leading/trailing whitespace
        .trim();

      const optimizedSize = optimizedContent.length;
      const spaceSaved = originalSize - optimizedSize;

      // Write optimized version
      const optimizedPath = filePath.replace(/\.js$/, '.min.js');
      fs.writeFileSync(optimizedPath, optimizedContent);

      loggingService.debug('JS optimization completed', {
        file: path.basename(filePath),
        originalSize,
        optimizedSize,
        spaceSaved,
        compressionRatio: Math.round((spaceSaved / originalSize) * 100 * 100) / 100
      });

      return { originalSize, optimizedSize, spaceSaved };

    } catch (error) {
      loggingService.error('JS optimization failed', error as Error, { file: filePath });
      throw error;
    }
  }

  /**
   * Create cache-busting versions of assets
   */
  public async createCacheBustedVersions(directory: string): Promise<{
    filesProcessed: number;
    manifestPath: string;
  }> {
    const manifest: { [originalPath: string]: string } = {};
    let filesProcessed = 0;

    try {
      loggingService.info('Creating cache-busted versions', { directory });

      const files = await this.getAllFiles(directory);
      const assetFiles = files.filter(file =>
        this.compressibleExtensions.includes(path.extname(file).toLowerCase())
      );

      for (const filePath of assetFiles) {
        try {
          const content = fs.readFileSync(filePath);
          const hash = require('crypto').createHash('md5').update(content).digest('hex').substring(0, 8);

          const ext = path.extname(filePath);
          const baseName = path.basename(filePath, ext);
          const dir = path.dirname(filePath);

          const cacheBustedName = `${baseName}.${hash}${ext}`;
          const cacheBustedPath = path.join(dir, cacheBustedName);

          // Copy file with new name
          fs.copyFileSync(filePath, cacheBustedPath);

          // Add to manifest
          const relativePath = path.relative(directory, filePath);
          const relativeCacheBustedPath = path.relative(directory, cacheBustedPath);
          manifest[relativePath] = relativeCacheBustedPath;

          filesProcessed++;

          loggingService.debug('Cache-busted version created', {
            original: path.basename(filePath),
            cacheBusted: cacheBustedName,
            hash
          });

        } catch (error) {
          loggingService.warn('Failed to create cache-busted version', {
            file: filePath,
            error: (error as Error).message
          });
        }
      }

      // Write manifest file
      const manifestPath = path.join(directory, 'asset-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      loggingService.info('Cache-busted versions created', {
        filesProcessed,
        manifestPath
      });

      return { filesProcessed, manifestPath };

    } catch (error) {
      loggingService.error('Failed to create cache-busted versions', error as Error);
      throw error;
    }
  }

  /**
   * Get all compressible files in directory
   */
  private async getCompressibleFiles(directory: string): Promise<string[]> {
    const allFiles = await this.getAllFiles(directory);
    return allFiles.filter(file =>
      this.compressibleExtensions.includes(path.extname(file).toLowerCase())
    );
  }

  /**
   * Get all files recursively
   */
  private async getAllFiles(directory: string): Promise<string[]> {
    const files: string[] = [];

    if (!fs.existsSync(directory)) {
      return files;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Optimize all assets in a project
   */
  public async optimizeProject(projectPath: string): Promise<{
    compression: OptimizationStats;
    cssOptimization: { files: number; spaceSaved: number };
    jsOptimization: { files: number; spaceSaved: number };
    cacheBusting: { filesProcessed: number; manifestPath: string };
  }> {
    loggingService.info('Starting full project optimization', { projectPath });

    const results = {
      compression: await this.compressDirectory(projectPath),
      cssOptimization: { files: 0, spaceSaved: 0 },
      jsOptimization: { files: 0, spaceSaved: 0 },
      cacheBusting: await this.createCacheBustedVersions(projectPath)
    };

    // Optimize CSS files
    const cssFiles = (await this.getAllFiles(projectPath))
      .filter(file => file.endsWith('.css') && !file.includes('.min.'));

    for (const cssFile of cssFiles) {
      try {
        const result = await this.optimizeCSS(cssFile);
        results.cssOptimization.files++;
        results.cssOptimization.spaceSaved += result.spaceSaved;
      } catch (error) {
        // Continue with other files
      }
    }

    // Optimize JS files
    const jsFiles = (await this.getAllFiles(projectPath))
      .filter(file => file.endsWith('.js') && !file.includes('.min.'));

    for (const jsFile of jsFiles) {
      try {
        const result = await this.optimizeJS(jsFile);
        results.jsOptimization.files++;
        results.jsOptimization.spaceSaved += result.spaceSaved;
      } catch (error) {
        // Continue with other files
      }
    }

    loggingService.info('Project optimization completed', {
      compressionRatio: results.compression.averageCompressionRatio,
      cssFilesOptimized: results.cssOptimization.files,
      jsFilesOptimized: results.jsOptimization.files,
      totalSpaceSaved: results.compression.totalSpaceSaved +
        results.cssOptimization.spaceSaved +
        results.jsOptimization.spaceSaved
    });

    return results;
  }
}

export const assetOptimizationService = new AssetOptimizationService();
export default AssetOptimizationService;