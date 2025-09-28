import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggingService } from '../services/LoggingService';

import { License } from '../models/License';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
      user?: any;
      license?: License;
      cacheHit?: boolean;
      rateLimitData?: any;
    }
  }
}

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Log request start
  loggingService.debug('Request started', {
    requestId: req.id,
    method: req.method,
    endpoint: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress
  });

  // Override res.end to capture response
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());

    // Log request completion
    loggingService.logRequest(req, res, responseTime);

    // Call original end method
    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
};

export const errorLoggingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const responseTime = Date.now() - (req.startTime || Date.now());

  loggingService.error('Request error', err, {
    requestId: req.id,
    method: req.method,
    endpoint: req.originalUrl,
    statusCode: res.statusCode,
    responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.id,
    licenseId: req.license?.id ? String(req.license.id) : undefined
  });

  next(err);
};

// Middleware to log slow requests
export const slowRequestMiddleware = (threshold: number = 5000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalEnd = res.end.bind(res);

    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      const responseTime = Date.now() - (req.startTime || Date.now());

      if (responseTime > threshold) {
        loggingService.warn('Slow request detected', {
          requestId: req.id,
          method: req.method,
          endpoint: req.originalUrl,
          responseTime,
          threshold,
          statusCode: res.statusCode
        });
      }

      return originalEnd(chunk, encoding, cb);
    } as any;

    next();
  };
};

// Middleware to log API usage patterns
export const usageTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Track API endpoint usage
  const endpoint = req.originalUrl;
  const method = req.method;

  // Skip health checks and static assets
  if (endpoint === '/health' || endpoint.startsWith('/static')) {
    return next();
  }

  loggingService.debug('API usage tracked', {
    requestId: req.id,
    endpoint,
    method,
    timestamp: new Date(),
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    licenseId: req.license?.id ? String(req.license.id) : undefined
  });

  next();
};