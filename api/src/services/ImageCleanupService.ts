import fs from 'fs';
import path from 'path';
import { loggingService } from './LoggingService';

export interface CleanupStats {
  filesDeleted: number;
  spaceSaved: number; // in bytes
  errors: number;
  duration: number; // in milliseconds
}

export interface CleanupOptions {
  maxAge?: number; // Maximum age in milliseconds
  maxSize?: number; // Maximum total size in bytes
  dryRun?: boolean; // Don't actually delete, just report
}

/**
 * Service for managing temporary image files and cleanup
 */
export class ImageCleanupService {
  private tempDir: string;
  private uploadsDir: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.uploadsDir = path.join(process.cwd(), 'uploads');

    // Ensure directories exist
    this.ensureDirectories();

    // Start automatic cleanup
    this.startAutomaticCleanup();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        loggingService.info('Created temp directory', { path: this.tempDir });
      }

      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
        loggingService.info('Created uploads directory', { path: this.uploadsDir });
      }
    } catch (error) {
      loggingService.error('Failed to create directories', error as Error);
    }
  }

  /**
   * Clean up temporary files
   */
  public async cleanupTempFiles(options: CleanupOptions = {}): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      filesDeleted: 0,
      spaceSaved: 0,
      errors: 0,
      duration: 0
    };

    const maxAge = options.maxAge || 2 * 60 * 60 * 1000; // 2 hours default
    const cutoffTime = Date.now() - maxAge;

    try {
      loggingService.info('Starting temp files cleanup', {
        directory: this.tempDir,
        maxAge: maxAge / 1000 / 60, // minutes
        dryRun: options.dryRun || false
      });

      const files = await this.getFilesRecursively(this.tempDir);

      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath);

          // Check if file is old enough to delete
          if (stat.mtime.getTime() < cutoffTime) {
            const fileSize = stat.size;

            if (!options.dryRun) {
              fs.unlinkSync(filePath);
            }

            stats.filesDeleted++;
            stats.spaceSaved += fileSize;

            loggingService.debug('Temp file cleaned', {
              file: path.basename(filePath),
              size: fileSize,
              age: Date.now() - stat.mtime.getTime(),
              dryRun: options.dryRun
            });
          }
        } catch (error) {
          stats.errors++;
          loggingService.warn('Failed to clean temp file', {
            file: filePath,
            error: (error as Error).message
          });
        }
      }

      // Clean empty directories
      if (!options.dryRun) {
        await this.cleanEmptyDirectories(this.tempDir);
      }

    } catch (error) {
      loggingService.error('Temp files cleanup failed', error as Error);
      stats.errors++;
    }

    stats.duration = Date.now() - startTime;

    loggingService.info('Temp files cleanup completed', {
      ...stats,
      spaceSavedMB: Math.round(stats.spaceSaved / 1024 / 1024 * 100) / 100
    });

    return stats;
  }

  /**
   * Clean up old uploaded files
   */
  public async cleanupUploadedFiles(options: CleanupOptions = {}): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      filesDeleted: 0,
      spaceSaved: 0,
      errors: 0,
      duration: 0
    };

    const maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days default
    const cutoffTime = Date.now() - maxAge;

    try {
      loggingService.info('Starting uploaded files cleanup', {
        directory: this.uploadsDir,
        maxAge: maxAge / 1000 / 60 / 60 / 24, // days
        dryRun: options.dryRun || false
      });

      const files = await this.getFilesRecursively(this.uploadsDir);

      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath);

          // Check if file is old enough to delete
          if (stat.mtime.getTime() < cutoffTime) {
            const fileSize = stat.size;

            if (!options.dryRun) {
              fs.unlinkSync(filePath);
            }

            stats.filesDeleted++;
            stats.spaceSaved += fileSize;

            loggingService.debug('Uploaded file cleaned', {
              file: path.basename(filePath),
              size: fileSize,
              age: Date.now() - stat.mtime.getTime(),
              dryRun: options.dryRun
            });
          }
        } catch (error) {
          stats.errors++;
          loggingService.warn('Failed to clean uploaded file', {
            file: filePath,
            error: (error as Error).message
          });
        }
      }

      // Clean empty directories
      if (!options.dryRun) {
        await this.cleanEmptyDirectories(this.uploadsDir);
      }

    } catch (error) {
      loggingService.error('Uploaded files cleanup failed', error as Error);
      stats.errors++;
    }

    stats.duration = Date.now() - startTime;

    loggingService.info('Uploaded files cleanup completed', {
      ...stats,
      spaceSavedMB: Math.round(stats.spaceSaved / 1024 / 1024 * 100) / 100
    });

    return stats;
  }

  /**
   * Clean up files by size limit
   */
  public async cleanupBySize(directory: string, maxSize: number, options: CleanupOptions = {}): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      filesDeleted: 0,
      spaceSaved: 0,
      errors: 0,
      duration: 0
    };

    try {
      loggingService.info('Starting size-based cleanup', {
        directory,
        maxSizeMB: Math.round(maxSize / 1024 / 1024 * 100) / 100,
        dryRun: options.dryRun || false
      });

      const files = await this.getFilesRecursively(directory);

      // Sort files by modification time (oldest first)
      const filesWithStats = files.map(filePath => {
        try {
          const stat = fs.statSync(filePath);
          return { path: filePath, stat };
        } catch (error) {
          return null;
        }
      }).filter(Boolean) as Array<{ path: string; stat: fs.Stats }>;

      filesWithStats.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());

      // Calculate current total size
      let totalSize = filesWithStats.reduce((sum, file) => sum + file.stat.size, 0);

      // Delete oldest files until under size limit
      for (const file of filesWithStats) {
        if (totalSize <= maxSize) {
          break;
        }

        try {
          const fileSize = file.stat.size;

          if (!options.dryRun) {
            fs.unlinkSync(file.path);
          }

          totalSize -= fileSize;
          stats.filesDeleted++;
          stats.spaceSaved += fileSize;

          loggingService.debug('File deleted for size limit', {
            file: path.basename(file.path),
            size: fileSize,
            remainingSize: totalSize,
            dryRun: options.dryRun
          });
        } catch (error) {
          stats.errors++;
          loggingService.warn('Failed to delete file for size limit', {
            file: file.path,
            error: (error as Error).message
          });
        }
      }

    } catch (error) {
      loggingService.error('Size-based cleanup failed', error as Error);
      stats.errors++;
    }

    stats.duration = Date.now() - startTime;

    loggingService.info('Size-based cleanup completed', {
      ...stats,
      spaceSavedMB: Math.round(stats.spaceSaved / 1024 / 1024 * 100) / 100
    });

    return stats;
  }

  /**
   * Get directory usage statistics
   */
  public async getDirectoryStats(directory: string): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    averageFileSize: number;
    fileTypes: { [extension: string]: number };
  }> {
    try {
      const files = await this.getFilesRecursively(directory);

      let totalSize = 0;
      let oldestFile: Date | null = null;
      let newestFile: Date | null = null;
      const fileTypes: { [extension: string]: number } = {};

      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath);
          const ext = path.extname(filePath).toLowerCase();

          totalSize += stat.size;

          if (!oldestFile || stat.mtime < oldestFile) {
            oldestFile = stat.mtime;
          }

          if (!newestFile || stat.mtime > newestFile) {
            newestFile = stat.mtime;
          }

          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        fileTypes
      };

    } catch (error) {
      loggingService.error('Failed to get directory stats', error as Error, {
        directory
      });

      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
        averageFileSize: 0,
        fileTypes: {}
      };
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startAutomaticCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        // Clean temp files older than 2 hours
        await this.cleanupTempFiles({ maxAge: 2 * 60 * 60 * 1000 });

        // Clean uploaded files older than 7 days
        await this.cleanupUploadedFiles({ maxAge: 7 * 24 * 60 * 60 * 1000 });

        // Ensure temp directory doesn't exceed 1GB
        await this.cleanupBySize(this.tempDir, 1024 * 1024 * 1024);

      } catch (error) {
        loggingService.error('Automatic cleanup failed', error as Error);
      }
    }, 60 * 60 * 1000); // Every hour

    loggingService.info('Automatic image cleanup started');
  }

  /**
   * Get all files recursively from directory
   */
  private async getFilesRecursively(directory: string): Promise<string[]> {
    const files: string[] = [];

    if (!fs.existsSync(directory)) {
      return files;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subFiles = await this.getFilesRecursively(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Clean empty directories
   */
  private async cleanEmptyDirectories(directory: string): Promise<void> {
    try {
      const items = fs.readdirSync(directory);

      for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          await this.cleanEmptyDirectories(fullPath);

          // Check if directory is now empty
          const subItems = fs.readdirSync(fullPath);
          if (subItems.length === 0) {
            fs.rmdirSync(fullPath);
            loggingService.debug('Empty directory removed', { path: fullPath });
          }
        }
      }
    } catch (error) {
      // Ignore errors when cleaning empty directories
    }
  }

  /**
   * Manual cleanup trigger
   */
  public async performFullCleanup(): Promise<{
    tempFiles: CleanupStats;
    uploadedFiles: CleanupStats;
    totalSpaceSaved: number;
  }> {
    loggingService.info('Starting full manual cleanup');

    const tempStats = await this.cleanupTempFiles();
    const uploadStats = await this.cleanupUploadedFiles();

    const result = {
      tempFiles: tempStats,
      uploadedFiles: uploadStats,
      totalSpaceSaved: tempStats.spaceSaved + uploadStats.spaceSaved
    };

    loggingService.info('Full cleanup completed', {
      totalFilesDeleted: tempStats.filesDeleted + uploadStats.filesDeleted,
      totalSpaceSavedMB: Math.round(result.totalSpaceSaved / 1024 / 1024 * 100) / 100
    });

    return result;
  }

  /**
   * Shutdown cleanup service
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    loggingService.info('Image cleanup service shutdown');
  }
}

export const imageCleanupService = new ImageCleanupService();
export default ImageCleanupService;