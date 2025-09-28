#!/usr/bin/env ts-node

import { initializeDatabase } from '../config';
import { initializeModels } from '../models';
import DatabaseOptimizationService from '../services/DatabaseOptimizationService';
import { assetOptimizationService } from '../services/AssetOptimizationService';
import { imageCleanupService } from '../services/ImageCleanupService';
import { loggingService } from '../services/LoggingService';
import path from 'path';

/**
 * Performance optimization script
 * Run this script to optimize database, assets, and clean up files
 */
async function runOptimizations() {
  try {
    console.log('🚀 Starting performance optimizations...\n');

    // Initialize database
    console.log('📊 Initializing database connection...');
    await initializeDatabase();
    await initializeModels();
    console.log('✅ Database connected\n');

    // Database optimizations
    console.log('🗄️  Running database optimizations...');
    const sequelize = require('../config').sequelize;
    const dbOptimizer = new DatabaseOptimizationService(sequelize);

    await dbOptimizer.createOptimizedIndexes();
    await dbOptimizer.optimizeConfiguration();

    const cleanupResults = await dbOptimizer.cleanupOldData();
    console.log('✅ Database optimization completed:', {
      generationsDeleted: cleanupResults.generationsDeleted,
      rateLimitsDeleted: cleanupResults.rateLimitsDeleted,
      expiredLicensesUpdated: cleanupResults.expiredLicensesUpdated
    });

    const dbStats = await dbOptimizer.getDatabaseStats();
    console.log('📈 Database statistics:', dbStats);
    console.log('');

    // Performance analysis
    console.log('🔍 Analyzing database performance...');
    const analysis = await dbOptimizer.analyzeQueryPerformance();
    console.log('📊 Performance analysis:', {
      slowQueries: analysis.slowQueries.length,
      recommendations: analysis.recommendations.length
    });

    if (analysis.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    console.log('');

    // Asset optimizations
    console.log('🎨 Optimizing assets...');
    const projectPath = path.join(process.cwd());

    try {
      const assetResults = await assetOptimizationService.optimizeProject(projectPath);
      console.log('✅ Asset optimization completed:', {
        compressionRatio: `${assetResults.compression.averageCompressionRatio.toFixed(2)}%`,
        cssFilesOptimized: assetResults.cssOptimization.files,
        jsFilesOptimized: assetResults.jsOptimization.files,
        totalSpaceSavedMB: Math.round(
          (assetResults.compression.totalSpaceSaved +
            assetResults.cssOptimization.spaceSaved +
            assetResults.jsOptimization.spaceSaved) / 1024 / 1024 * 100
        ) / 100
      });
    } catch (error) {
      console.log('⚠️  Asset optimization skipped (no assets found or error occurred)');
    }
    console.log('');

    // File cleanup
    console.log('🧹 Cleaning up temporary files...');
    const cleanupStats = await imageCleanupService.performFullCleanup();
    console.log('✅ File cleanup completed:', {
      tempFilesDeleted: cleanupStats.tempFiles.filesDeleted,
      uploadedFilesDeleted: cleanupStats.uploadedFiles.filesDeleted,
      totalSpaceSavedMB: Math.round(cleanupStats.totalSpaceSaved / 1024 / 1024 * 100) / 100
    });
    console.log('');

    // Directory statistics
    console.log('📁 Directory statistics:');
    const tempStats = await imageCleanupService.getDirectoryStats(path.join(process.cwd(), 'temp'));
    const uploadStats = await imageCleanupService.getDirectoryStats(path.join(process.cwd(), 'uploads'));

    console.log('   Temp directory:', {
      files: tempStats.totalFiles,
      sizeMB: Math.round(tempStats.totalSize / 1024 / 1024 * 100) / 100,
      oldestFile: tempStats.oldestFile?.toISOString() || 'N/A'
    });

    console.log('   Uploads directory:', {
      files: uploadStats.totalFiles,
      sizeMB: Math.round(uploadStats.totalSize / 1024 / 1024 * 100) / 100,
      oldestFile: uploadStats.oldestFile?.toISOString() || 'N/A'
    });
    console.log('');

    // Memory usage
    const memoryUsage = process.memoryUsage();
    console.log('💾 Current memory usage:', {
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      externalMB: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
    });

    console.log('\n🎉 All optimizations completed successfully!');

    // Log completion
    loggingService.info('Performance optimization script completed', {
      dbCleanup: cleanupResults,
      fileCleanup: cleanupStats,
      memoryUsage
    });

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    loggingService.error('Performance optimization script failed', error as Error);
    process.exit(1);
  }
}

// Command line options
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  dbOnly: args.includes('--db-only'),
  filesOnly: args.includes('--files-only'),
  assetsOnly: args.includes('--assets-only')
};

if (args.includes('--help')) {
  console.log(`
Performance Optimization Script

Usage: npm run optimize [options]

Options:
  --dry-run     Show what would be done without making changes
  --verbose     Show detailed output
  --db-only     Only run database optimizations
  --files-only  Only run file cleanup
  --assets-only Only run asset optimizations
  --help        Show this help message

Examples:
  npm run optimize
  npm run optimize -- --dry-run
  npm run optimize -- --db-only --verbose
  `);
  process.exit(0);
}

// Run optimizations
if (require.main === module) {
  runOptimizations()
    .then(() => {
      console.log('✨ Optimization script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Optimization script failed:', error);
      process.exit(1);
    });
}

export { runOptimizations };