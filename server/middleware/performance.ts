import { Request, Response, NextFunction } from 'express';

// Enhanced performance monitoring middleware with batch detection
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Detect batch operations
  const isBatchOperation = req.url?.includes('batch-calculate') || 
                          (req.body && Array.isArray(req.body.representativeIds) && req.body.representativeIds.length > 10);

  // Track error responses
  const originalJson = res.json;
  let hasError = false;

  // SHERLOCK v32.2: Memory monitoring and cleanup
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Memory leak prevention for large responses
    if (body && typeof body === 'object' && JSON.stringify(body).length > 1000000) {
      console.warn(`⚠️ Large response detected: ${JSON.stringify(body).length} bytes for ${req.url}`);
    }
    
    // Check for error responses
    if (res.statusCode >= 400) {
      hasError = true;
      console.error(`❌ SHERLOCK v32.1: Error response ${res.statusCode} for ${req.method} ${req.url} in ${duration}ms`);
      if (body?.error) {
        console.error(`❌ Error details:`, body.error);
      }
    }

    // Dynamic thresholds based on endpoint type
    let threshold = 200;
    if (req.url?.includes('/statistics') || req.url?.includes('/global')) {
      threshold = 1000;
    } else if (req.url?.includes('/debtors') || req.url?.includes('/unified-financial')) {
      threshold = isBatchOperation ? 2000 : 500; // More lenient for financial calculations
    } else if (req.url?.includes('/batch-calculate')) {
      threshold = 3000; // Even more lenient for explicit batch operations
    }

    // Performance categorization
    let perfLevel = '✅';
    if (duration > threshold * 2) {
      perfLevel = '🔴 CRITICAL';
    } else if (duration > threshold) {
      perfLevel = '⚠️ SLOW';
    } else if (duration > threshold * 0.5) {
      perfLevel = '🟡 MODERATE';
    }

    // Enhanced logging with batch detection
    const batchInfo = isBatchOperation ? 
      `[BATCH: ${req.body?.representativeIds?.length || 'unknown'} items]` : '';

    if (duration > threshold || process.env.NODE_ENV === 'development') {
      console.log(`${perfLevel} ${req.method} ${req.url} ${batchInfo} ${res.statusCode} in ${duration}ms`);
    }

    // Memory usage check for heavy endpoints with batch awareness
    if (duration > (isBatchOperation ? 2000 : 1000)) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      if (heapUsedMB > 300) {
        console.warn(`🧠 High memory usage: ${heapUsedMB}MB after ${req.url} ${batchInfo}`);
      }
    }

    // Special handling for 400 errors to help debugging
    if (res.statusCode === 400 && req.url?.includes('batch-calculate')) {
      console.error(`❌ Batch calculation 400 error: ${req.url}`, {
        bodyKeys: req.body ? Object.keys(req.body) : [],
        bodyType: typeof req.body,
        hasRepIds: !!(req.body?.representativeIds),
        repIdsType: typeof req.body?.representativeIds,
        repIdsLength: Array.isArray(req.body?.representativeIds) ? req.body.representativeIds.length : 'not array'
      });
    }

    return originalJson.call(this, body);
  };

  next();
}

// Memory monitoring utility
export function logMemoryUsage() {
  const used = process.memoryUsage();
  const memoryInfo = {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100,
  };

  console.log('Memory usage:', memoryInfo);

  // Warn if heap usage is too high
  if (memoryInfo.heapUsed > 500) {
    console.warn('⚠️ High memory usage detected:', memoryInfo.heapUsed, 'MB');
  }
}

// Startup memory monitoring
if (process.env.NODE_ENV === 'development') {
  setInterval(logMemoryUsage, 60000); // Log every minute in development
}