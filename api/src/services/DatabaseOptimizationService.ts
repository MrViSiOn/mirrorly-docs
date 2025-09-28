import { Sequelize, QueryInterface } from 'sequelize';
import { loggingService } from './LoggingService';

/**
 * Service for database performance optimization
 * Handles indexing, query optimization, and maintenance tasks
 */
export class DatabaseOptimizationService {
  private sequelize: Sequelize;
  private queryInterface: QueryInterface;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.queryInterface = sequelize.getQueryInterface();
  }

  /**
   * Create optimized indexes for better query performance
   */
  public async createOptimizedIndexes(): Promise<void> {
    try {
      loggingService.info('Creating optimized database indexes');

      // Licenses table indexes
      await this.createIndexIfNotExists('licenses', 'idx_licenses_license_key', ['license_key']);
      await this.createIndexIfNotExists('licenses', 'idx_licenses_domain', ['domain']);
      await this.createIndexIfNotExists('licenses', 'idx_licenses_status', ['status']);
      await this.createIndexIfNotExists('licenses', 'idx_licenses_type_status', ['type', 'status']);
      await this.createIndexIfNotExists('licenses', 'idx_licenses_expires_at', ['expires_at']);
      await this.createIndexIfNotExists('licenses', 'idx_licenses_last_reset', ['last_reset']);

      // Generations table indexes
      await this.createIndexIfNotExists('generations', 'idx_generations_license_id', ['license_id']);
      await this.createIndexIfNotExists('generations', 'idx_generations_status', ['status']);
      await this.createIndexIfNotExists('generations', 'idx_generations_created_at', ['created_at']);
      await this.createIndexIfNotExists('generations', 'idx_generations_license_status', ['license_id', 'status']);
      await this.createIndexIfNotExists('generations', 'idx_generations_license_created', ['license_id', 'created_at']);

      // Rate limits table indexes
      await this.createIndexIfNotExists('rate_limits', 'idx_rate_limits_license_id', ['license_id']);
      await this.createIndexIfNotExists('rate_limits', 'idx_rate_limits_last_request', ['last_request']);
      await this.createIndexIfNotExists('rate_limits', 'idx_rate_limits_window_start', ['window_start']);

      // Composite indexes for common queries
      await this.createIndexIfNotExists('generations', 'idx_generations_product_license', ['product_id', 'license_id']);
      await this.createIndexIfNotExists('generations', 'idx_generations_hash_lookup', ['user_image_hash', 'product_image_hash']);

      loggingService.info('Database indexes created successfully');

    } catch (error) {
      loggingService.error('Failed to create database indexes', error as Error);
      throw error;
    }
  }

  /**
   * Create index if it doesn't exist
   */
  private async createIndexIfNotExists(
    tableName: string,
    indexName: string,
    columns: string[],
    options: any = {}
  ): Promise<void> {
    try {
      // Check if index exists
      const indexes = await this.queryInterface.showIndex(tableName) as any[];
      const indexExists = indexes.some((index: any) => index.name === indexName);

      if (!indexExists) {
        await this.queryInterface.addIndex(tableName, columns, {
          name: indexName,
          ...options
        });

        loggingService.debug('Index created', {
          table: tableName,
          index: indexName,
          columns
        });
      } else {
        loggingService.debug('Index already exists', {
          table: tableName,
          index: indexName
        });
      }
    } catch (error) {
      loggingService.warn('Failed to create index', {
        table: tableName,
        index: indexName,
        error: (error as Error).message
      });
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  public async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{
      query: string;
      executionTime: number;
      suggestions: string[];
    }>;
    indexUsage: Array<{
      table: string;
      index: string;
      usage: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const analysis: {
        slowQueries: Array<{
          query: string;
          executionTime: number;
          suggestions: string[];
        }>;
        indexUsage: Array<{
          table: string;
          index: string;
          usage: number;
        }>;
        recommendations: string[];
      } = {
        slowQueries: [],
        indexUsage: [],
        recommendations: []
      };

      // Get slow query log (MySQL specific)
      if (this.sequelize.getDialect() === 'mysql') {
        try {
          const slowQueries = await this.sequelize.query(`
            SELECT
              sql_text,
              exec_count,
              avg_timer_wait / 1000000000 as avg_execution_time_seconds
            FROM performance_schema.events_statements_summary_by_digest
            WHERE avg_timer_wait > 1000000000
            ORDER BY avg_timer_wait DESC
            LIMIT 10
          `, { type: 'SELECT' });

          analysis.slowQueries = (slowQueries as any[]).map(query => ({
            query: query.sql_text,
            executionTime: query.avg_execution_time_seconds,
            suggestions: this.generateQuerySuggestions(query.sql_text)
          }));
        } catch (error) {
          loggingService.debug('Could not access performance schema', {
            error: (error as Error).message
          });
        }
      }

      // Generate general recommendations
      analysis.recommendations = await this.generateRecommendations();

      return analysis;

    } catch (error) {
      loggingService.error('Failed to analyze query performance', error as Error);
      return {
        slowQueries: [],
        indexUsage: [],
        recommendations: ['Unable to analyze performance - check database permissions']
      };
    }
  }

  /**
   * Generate query optimization suggestions
   */
  private generateQuerySuggestions(query: string): string[] {
    const suggestions: string[] = [];

    if (query.includes('SELECT *')) {
      suggestions.push('Avoid SELECT * - specify only needed columns');
    }

    if (query.includes('WHERE') && !query.includes('INDEX')) {
      suggestions.push('Consider adding indexes for WHERE clause columns');
    }

    if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT to ORDER BY queries');
    }

    if (query.includes('JOIN') && query.includes('WHERE')) {
      suggestions.push('Ensure JOIN conditions use indexed columns');
    }

    return suggestions;
  }

  /**
   * Generate general database recommendations
   */
  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      // Check table sizes
      const tables = ['licenses', 'generations', 'rate_limits'];

      for (const table of tables) {
        try {
          const result = await this.sequelize.query(`
            SELECT COUNT(*) as count FROM ${table}
          `, { type: 'SELECT' });

          const count = (result as any[])[0].count;

          if (count > 100000) {
            recommendations.push(`Table ${table} has ${count} rows - consider partitioning or archiving old data`);
          }

          if (count > 10000 && table === 'generations') {
            recommendations.push('Consider implementing automatic cleanup of old generation records');
          }
        } catch (error) {
          // Table might not exist yet
        }
      }

      // Check for missing indexes on foreign keys
      recommendations.push('Ensure all foreign key columns have indexes');
      recommendations.push('Consider implementing database connection pooling');
      recommendations.push('Monitor query execution times regularly');
      recommendations.push('Implement read replicas for high-traffic scenarios');

    } catch (error) {
      loggingService.debug('Could not generate all recommendations', {
        error: (error as Error).message
      });
    }

    return recommendations;
  }

  /**
   * Optimize database configuration
   */
  public async optimizeConfiguration(): Promise<void> {
    try {
      loggingService.info('Optimizing database configuration');

      // Set optimal connection pool settings
      if (this.sequelize.config.pool) {
        const poolConfig = {
          max: 20,          // Maximum connections
          min: 5,           // Minimum connections
          acquire: 30000,   // Maximum time to get connection
          idle: 10000,      // Maximum idle time
          evict: 1000       // Check for idle connections interval
        };

        loggingService.info('Database pool configuration', poolConfig);
      }

      // MySQL specific optimizations
      if (this.sequelize.getDialect() === 'mysql') {
        try {
          // Set optimal MySQL settings for the session
          await this.sequelize.query('SET SESSION query_cache_type = ON');
          await this.sequelize.query('SET SESSION query_cache_size = 67108864'); // 64MB

          loggingService.debug('MySQL session optimizations applied');
        } catch (error) {
          loggingService.debug('Could not apply MySQL optimizations', {
            error: (error as Error).message
          });
        }
      }

    } catch (error) {
      loggingService.error('Failed to optimize database configuration', error as Error);
    }
  }

  /**
   * Clean up old data to maintain performance
   */
  public async cleanupOldData(): Promise<{
    generationsDeleted: number;
    rateLimitsDeleted: number;
    expiredLicensesUpdated: number;
  }> {
    try {
      loggingService.info('Starting database cleanup');

      const results = {
        generationsDeleted: 0,
        rateLimitsDeleted: 0,
        expiredLicensesUpdated: 0
      };

      // Clean up old generations (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const generationsResult = await this.sequelize.query(`
        DELETE FROM generations
        WHERE created_at < :thirtyDaysAgo
        AND status IN ('completed', 'failed')
      `, {
        replacements: { thirtyDaysAgo },
        type: 'DELETE'
      });

      results.generationsDeleted = (generationsResult as any)[1] || 0;

      // Clean up old rate limit records (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const rateLimitsResult = await this.sequelize.query(`
        DELETE FROM rate_limits
        WHERE last_request < :sevenDaysAgo
      `, {
        replacements: { sevenDaysAgo },
        type: 'DELETE'
      });

      results.rateLimitsDeleted = (rateLimitsResult as any)[1] || 0;

      // Update expired licenses status
      const expiredLicensesResult = await this.sequelize.query(`
        UPDATE licenses
        SET status = 'expired'
        WHERE expires_at < NOW()
        AND status = 'active'
      `, {
        type: 'UPDATE'
      });

      results.expiredLicensesUpdated = (expiredLicensesResult as any)[1] || 0;

      loggingService.info('Database cleanup completed', results);

      return results;

    } catch (error) {
      loggingService.error('Database cleanup failed', error as Error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<{
    tableStats: Array<{
      table: string;
      rows: number;
      size: string;
      indexes: number;
    }>;
    connectionStats: {
      active: number;
      idle: number;
      total: number;
    };
    performance: {
      avgQueryTime: number;
      slowQueries: number;
      cacheHitRate: number;
    };
  }> {
    try {
      const stats: {
        tableStats: Array<{
          table: string;
          rows: number;
          size: string;
          indexes: number;
        }>;
        connectionStats: {
          active: number;
          idle: number;
          total: number;
        };
        performance: {
          avgQueryTime: number;
          slowQueries: number;
          cacheHitRate: number;
        };
      } = {
        tableStats: [],
        connectionStats: { active: 0, idle: 0, total: 0 },
        performance: { avgQueryTime: 0, slowQueries: 0, cacheHitRate: 0 }
      };

      // Get table statistics
      const tables = ['licenses', 'generations', 'rate_limits'];

      for (const table of tables) {
        try {
          const result = await this.sequelize.query(`
            SELECT COUNT(*) as count FROM ${table}
          `, { type: 'SELECT' });

          const count = (result as any[])[0].count;

          // Get indexes for this table
          const indexes = await this.queryInterface.showIndex(table) as any[];

          stats.tableStats.push({
            table,
            rows: count,
            size: 'N/A', // Would need database-specific queries
            indexes: indexes.length
          });
        } catch (error) {
          // Table might not exist
        }
      }

      // Connection pool stats
      if (this.sequelize.connectionManager && (this.sequelize.connectionManager as any).pool) {
        const pool = (this.sequelize.connectionManager as any).pool;
        stats.connectionStats = {
          active: pool.used || 0,
          idle: pool.available || 0,
          total: (pool.used || 0) + (pool.available || 0)
        };
      }

      return stats;

    } catch (error) {
      loggingService.error('Failed to get database statistics', error as Error);
      throw error;
    }
  }

  /**
   * Schedule regular maintenance tasks
   */
  public scheduleMaintenanceTasks(): void {
    // Run cleanup every day at 2 AM
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

    setInterval(async () => {
      try {
        const results = await this.cleanupOldData();
        loggingService.info('Scheduled database cleanup completed', results);
      } catch (error) {
        loggingService.error('Scheduled database cleanup failed', error as Error);
      }
    }, cleanupInterval);

    // Analyze performance every week
    const analysisInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

    setInterval(async () => {
      try {
        const analysis = await this.analyzeQueryPerformance();
        loggingService.info('Scheduled performance analysis completed', {
          slowQueriesFound: analysis.slowQueries.length,
          recommendationsCount: analysis.recommendations.length
        });
      } catch (error) {
        loggingService.error('Scheduled performance analysis failed', error as Error);
      }
    }, analysisInterval);

    loggingService.info('Database maintenance tasks scheduled');
  }
}

export default DatabaseOptimizationService;