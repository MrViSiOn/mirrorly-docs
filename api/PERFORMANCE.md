# Performance Optimization Guide

This document describes the performance optimizations implemented in the Mirrorly API and how to use them effectively.

## Overview

The Mirrorly API includes several performance optimization systems:

1. **Logging and Analytics** - Comprehensive monitoring and metrics collection
2. **Caching System** - Multi-layer caching for responses, licenses, and rate limits
3. **Database Optimization** - Automated indexing, query optimization, and maintenance
4. **Asset Optimization** - Compression and minification of static assets
5. **Image Cleanup** - Automatic cleanup of temporary and uploaded files
6. **Performance Monitoring** - Real-time performance tracking and alerting

## Logging and Analytics

### Features

- **Structured Logging**: JSON-formatted logs with Winston
- **Performance Metrics**: Response times, memory usage, and throughput
- **Usage Analytics**: License usage patterns and generation statistics
- **Error Tracking**: Automatic error categorization and alerting
- **Dashboard**: Real-time metrics visualization

### Configuration

```typescript
// Environment variables
LOG_LEVEL=info          // debug, info, warn, error
NODE_ENV=production     // Affects log output format
```

### Usage

```typescript
import { loggingService } from './services/LoggingService';

// Log application events
loggingService.info('User action completed', {
  userId: '123',
  action: 'image_generation',
  duration: 1500
});

// Log errors with context
loggingService.error('Database connection failed', error, {
  database: 'mysql',
  host: 'localhost'
});

// Log generation-specific events
loggingService.logGeneration({
  generationId: 'gen_123',
  licenseId: 'lic_456',
  licenseType: 'pro_basic',
  success: true,
  processingTime: 2500
});
```

### Dashboard Access

- **HTML Dashboard**: `GET /v1/dashboard`
- **JSON Data**: `GET /v1/dashboard/data`
- **Health Check**: `GET /v1/dashboard/health`
- **Metrics**: `GET /v1/dashboard/metrics`

## Caching System

### Cache Types

1. **Response Cache**: API response caching with TTL
2. **License Cache**: License validation results
3. **Rate Limit Cache**: Rate limiting state

### Configuration

```typescript
// Cache TTL settings (milliseconds)
const CACHE_SETTINGS = {
  response: 5 * 60 * 1000,      // 5 minutes
  license: 10 * 60 * 1000,     // 10 minutes
  rateLimit: 60 * 1000         // 1 minute
};
```

### Usage

```typescript
import { responseCache, licenseCache } from './services/CacheService';

// Cache API responses
responseCache.cacheResponse('/api/endpoint', params, response, 300000);
const cached = responseCache.getCachedResponse('/api/endpoint', params);

// Cache license data
licenseCache.cacheLicense('license_key', licenseData);
const license = licenseCache.getCachedLicense('license_key');
```

### Cache Headers

The API includes cache-related headers in responses:

- `X-Cache`: HIT or MISS
- `X-Cache-Key`: Cache key used
- `ETag`: Entity tag for conditional requests
- `X-Response-Time`: Response generation time

## Database Optimization

### Automatic Optimizations

1. **Index Creation**: Optimized indexes for common queries
2. **Query Analysis**: Slow query detection and suggestions
3. **Data Cleanup**: Automatic removal of old records
4. **Connection Pooling**: Optimized connection management

### Indexes Created

```sql
-- Licenses table
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_domain ON licenses(domain);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_type_status ON licenses(type, status);

-- Generations table
CREATE INDEX idx_generations_license_id ON generations(license_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created_at ON generations(created_at);
CREATE INDEX idx_generations_license_status ON generations(license_id, status);

-- Rate limits table
CREATE INDEX idx_rate_limits_license_id ON rate_limits(license_id);
CREATE INDEX idx_rate_limits_last_request ON rate_limits(last_request);
```

### Maintenance Tasks

- **Daily Cleanup**: Remove records older than 30 days
- **Weekly Analysis**: Performance analysis and recommendations
- **License Expiration**: Update expired license status

### Manual Optimization

```bash
# Run full optimization
npm run optimize

# Database only
npm run optimize:db

# Dry run (show what would be done)
npm run optimize:dry-run
```

## Asset Optimization

### Features

1. **Compression**: Gzip and Brotli compression
2. **Minification**: CSS and JavaScript minification
3. **Cache Busting**: Automatic versioning with hashes
4. **Size Analysis**: Asset size reporting

### Supported File Types

- JavaScript (`.js`)
- CSS (`.css`)
- HTML (`.html`)
- JSON (`.json`)
- SVG (`.svg`)
- Text files (`.txt`, `.md`)

### Usage

```bash
# Optimize all assets
npm run optimize:assets

# Manual optimization
npm run optimize -- --assets-only
```

### Results

```typescript
// Optimization results
{
  compression: {
    filesProcessed: 25,
    averageCompressionRatio: 65.2,
    totalSpaceSaved: 1024000 // bytes
  },
  cssOptimization: {
    files: 5,
    spaceSaved: 50000
  },
  jsOptimization: {
    files: 10,
    spaceSaved: 150000
  }
}
```

## Image Cleanup

### Automatic Cleanup

- **Temp Files**: Cleaned every hour (files older than 2 hours)
- **Uploaded Files**: Cleaned daily (files older than 7 days)
- **Size Limits**: Temp directory limited to 1GB

### Manual Cleanup

```bash
# Clean all files
npm run optimize:files

# Get directory statistics
curl http://localhost:3000/v1/dashboard/data
```

### Configuration

```typescript
const CLEANUP_SETTINGS = {
  tempFileMaxAge: 2 * 60 * 60 * 1000,    // 2 hours
  uploadFileMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxTempDirSize: 1024 * 1024 * 1024     // 1GB
};
```

## Performance Monitoring

### Middleware Stack

The API includes comprehensive performance monitoring:

1. **Request Timing**: Measure response times
2. **Memory Monitoring**: Track memory usage
3. **Cache Monitoring**: Cache hit/miss rates
4. **Security Headers**: Security-focused headers
5. **Compression**: Automatic response compression

### Performance Headers

```http
X-Response-Time: 150ms
X-Memory-Usage: 45MB
X-Cache-Status: HIT
X-API-Version: 1.0.0
```

### Alerts

Automatic alerts are triggered for:

- Response times > 5 seconds
- Error rates > 10%
- Memory usage > 90%
- High frequency errors (>10 in 5 minutes)

## Monitoring and Metrics

### Key Metrics

1. **Response Time**: Average, P95, P99 response times
2. **Throughput**: Requests per second
3. **Error Rate**: Percentage of failed requests
4. **Memory Usage**: Heap usage and garbage collection
5. **Cache Performance**: Hit rates and efficiency
6. **Database Performance**: Query times and connection pool usage

### Metric Collection

```typescript
// Performance metrics are automatically collected
// Access via dashboard or API endpoints

// Get current metrics
GET /v1/dashboard/metrics

// Get system health
GET /v1/dashboard/health
```

### External Monitoring

The API exposes Prometheus-compatible metrics:

```typescript
// Metrics format
{
  http_requests_total: 1500,
  http_request_duration_seconds: 0.150,
  memory_usage_bytes: 47185920,
  generations_total: 250,
  active_licenses: 45
}
```

## Best Practices

### Development

1. **Use Caching**: Implement appropriate caching for expensive operations
2. **Monitor Performance**: Regularly check dashboard metrics
3. **Optimize Queries**: Use indexes and limit result sets
4. **Handle Errors**: Implement proper error handling and logging

### Production

1. **Regular Maintenance**: Run optimization scripts weekly
2. **Monitor Alerts**: Set up external monitoring for critical alerts
3. **Scale Resources**: Monitor memory and CPU usage
4. **Backup Strategy**: Regular database backups before cleanup

### Configuration

```env
# Production optimizations
NODE_ENV=production
LOG_LEVEL=warn
CACHE_TTL=300000
DB_POOL_MAX=20
DB_POOL_MIN=5
CLEANUP_INTERVAL=3600000
```

## Troubleshooting

### High Memory Usage

1. Check for memory leaks in logs
2. Restart application if usage > 95%
3. Review cache sizes and TTL settings
4. Run garbage collection manually if needed

### Slow Response Times

1. Check database query performance
2. Review cache hit rates
3. Analyze slow query logs
4. Consider adding more indexes

### High Error Rates

1. Check error logs for patterns
2. Verify database connectivity
3. Review external service status (Google AI)
4. Check rate limiting configuration

### Cache Issues

1. Verify cache configuration
2. Check cache hit rates in dashboard
3. Clear cache if needed: `DELETE /v1/dashboard/metrics`
4. Review cache key generation logic

## Performance Benchmarks

### Target Metrics

- **Response Time**: < 200ms for cached responses, < 1s for generation
- **Throughput**: > 100 requests/second
- **Error Rate**: < 1%
- **Memory Usage**: < 80% of available memory
- **Cache Hit Rate**: > 70% for frequently accessed data

### Load Testing

```bash
# Example load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/v1/auth/status

# Monitor during load test
curl http://localhost:3000/v1/dashboard/health
```

## Future Optimizations

### Planned Improvements

1. **Redis Integration**: Distributed caching for multi-instance deployments
2. **Database Sharding**: Horizontal scaling for large datasets
3. **CDN Integration**: Static asset delivery optimization
4. **Advanced Monitoring**: APM integration (New Relic, DataDog)
5. **Auto-scaling**: Automatic resource scaling based on load

### Monitoring Integration

Consider integrating with:

- **Prometheus + Grafana**: Advanced metrics and dashboards
- **ELK Stack**: Centralized logging and analysis
- **APM Tools**: Application performance monitoring
- **Alerting**: PagerDuty, Slack notifications

## Support

For performance-related issues:

1. Check the dashboard: `/v1/dashboard`
2. Review logs in the `logs/` directory
3. Run diagnostics: `npm run optimize -- --dry-run`
4. Monitor system resources: `htop`, `iostat`

For additional help, consult the main API documentation or contact the development team.