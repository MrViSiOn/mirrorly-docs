import { Request, Response, NextFunction } from 'express';
import { responseCache, licenseCache, rateLimitCache } from '../services/CacheService';
import { loggingService } from '../services/LoggingService';

// Extend Request interface for performance tracking
declare global {
  namespace Express {
    interface Request {
      performanceStart?: number;
      cacheHit?: boolean;
      cacheKey?: string;
    }
  }
}

/**
 * Middleware for response caching
 */
export const responseCacheMiddleware = (ttl: number = 5 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for certain endpoints
    const skipCache = [
      '/health',
      '/dashboard',
      '/generate/image' // Don't cache image generation
    ].some(path => req.originalUrl.includes(path));

    if (skipCache) {
      return next();
    }

    // Generate cache key
    const cacheKey = `response:${req.originalUrl}:${JSON.stringify(req.query)}`;
    req.cacheKey = cacheKey;

    // Try to get cached response
    const cachedResponse = responseCache.get(cacheKey);

    if (cachedResponse) {
      req.cacheHit = true;

      loggingService.debug('Response cache hit', {
        requestId: req.id,
        endpoint: req.originalUrl,
        cacheKey
      });

      // Set cache headers
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);

      res.json(cachedResponse);
      return;
    }

    req.cacheHit = false;

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        responseCache.set(cacheKey, body, { ttl });

        loggingService.debug('Response cached', {
          requestId: req.id,
          endpoint: req.originalUrl,
          cacheKey,
          statusCode: res.statusCode
        });
      }

      // Set cache headers
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware for license caching
 */
export const licenseCacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const licenseKey = req.get('X-API-Key');

  if (!licenseKey) {
    return next();
  }

  // Try to get cached license
  const cachedLicense = licenseCache.getCachedLicense(licenseKey);

  if (cachedLicense) {
    req.license = cachedLicense;
    req.licenseId = cachedLicense.id;

    loggingService.debug('License cache hit', {
      requestId: req.id,
      licenseId: cachedLicense.id
    });

    return next();
  }

  // If no cache hit, continue to auth middleware
  // The auth middleware should cache the license after validation
  next();
};

/**
 * Middleware for compression
 */
export const compressionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const acceptEncoding = req.get('Accept-Encoding') || '';

  // Check if client supports compression
  const supportsBrotli = acceptEncoding.includes('br');
  const supportsGzip = acceptEncoding.includes('gzip');

  if (supportsBrotli || supportsGzip) {
    // Override res.json to compress responses
    const originalJson = res.json;
    res.json = function (body: any) {
      const jsonString = JSON.stringify(body);

      // Only compress responses larger than 1KB
      if (jsonString.length > 1024) {
        if (supportsBrotli) {
          res.setHeader('Content-Encoding', 'br');
        } else if (supportsGzip) {
          res.setHeader('Content-Encoding', 'gzip');
        }

        res.setHeader('Vary', 'Accept-Encoding');
      }

      return originalJson.call(this, body);
    };
  }

  next();
};

/**
 * Middleware for performance monitoring
 */
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.performanceStart = Date.now();

  // Override res.end to measure response time
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - (req.performanceStart || Date.now());

    // Log performance metrics
    loggingService.debug('Performance metrics', {
      requestId: req.id,
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      cacheHit: req.cacheHit,
      memoryUsage: process.memoryUsage().heapUsed,
      userAgent: req.get('User-Agent')
    });

    // Add performance headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Memory-Usage', `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    if (req.cacheHit !== undefined) {
      res.setHeader('X-Cache-Status', req.cacheHit ? 'HIT' : 'MISS');
    }

    // Warn about slow responses
    if (responseTime > 1000) {
      loggingService.warn('Slow response detected', {
        requestId: req.id,
        endpoint: req.originalUrl,
        responseTime,
        statusCode: res.statusCode
      });
    }

    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
};

/**
 * Middleware for rate limit caching
 */
export const rateLimitCacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const licenseId = req.licenseId;

  if (!licenseId) {
    return next();
  }

  // Try to get cached rate limit data
  const cachedRateLimit = rateLimitCache.getCachedRateLimit(String(licenseId));

  if (cachedRateLimit) {
    req.rateLimitData = cachedRateLimit;

    loggingService.debug('Rate limit cache hit', {
      requestId: req.id,
      licenseId: String(licenseId)
    });
  }

  next();
};

/**
 * Middleware for ETag support
 */
export const etagMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply ETag to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const originalJson = res.json;
  res.json = function (body: any) {
    const jsonString = JSON.stringify(body);
    const etag = require('crypto').createHash('md5').update(jsonString).digest('hex');

    res.setHeader('ETag', `"${etag}"`);

    // Check if client has matching ETag
    const clientETag = req.get('If-None-Match');
    if (clientETag === `"${etag}"`) {
      return res.status(304).end();
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Middleware for security headers
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS headers for API
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Domain');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  next();
};

/**
 * Middleware for request size limiting
 */
export const requestSizeLimitMiddleware = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      loggingService.warn('Request size limit exceeded', {
        requestId: req.id,
        contentLength,
        maxSize,
        endpoint: req.originalUrl
      });

      res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Request entity too large',
        maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`
      });
    }

    next();
  };
};

/**
 * Middleware for API versioning
 */
export const apiVersioningMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add API version to response headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-API-Docs', 'https://docs.mirrorly.com/api/v1');

  next();
};

/**
 * Combined performance middleware stack
 */
export const performanceMiddlewareStack = [
  performanceMonitoringMiddleware,
  securityHeadersMiddleware,
  apiVersioningMiddleware,
  requestSizeLimitMiddleware(),
  licenseCacheMiddleware,
  rateLimitCacheMiddleware,
  responseCacheMiddleware(),
  compressionMiddleware,
  etagMiddleware
];