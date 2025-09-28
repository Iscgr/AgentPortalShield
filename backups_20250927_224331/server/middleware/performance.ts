import { Request, Response, NextFunction } from 'express';

// Enhanced performance monitoring middleware with crash prevention
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Detect batch operations
  const isBatchOperation = req.url?.includes('batch-calculate') || 
                          (req.body && Array.isArray(req.body.representativeIds) && req.body.representativeIds.length > 10);

  // Set request timeout to prevent crashes
  req.setTimeout(30000, () => {
    console.error(`⏰ Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: "Request timeout", 
        message: "درخواست طولانی شد و لغو شد",
        timeout: 30000
      });
    }
  });

  // Track error responses and memory monitoring
  const originalJson = res.json;
  let hasError = false;

  // SHERLOCK v32.3: Enhanced memory monitoring with crash prevention
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Prevent large response crashes
    try {
      const bodySize = body ? JSON.stringify(body).length : 0;
      if (bodySize > 5000000) { // 5MB limit
        console.error(`🚨 Response too large: ${bodySize} bytes for ${req.url}`);
        return originalJson.call(this, {
          error: "Response too large",
          message: "پاسخ بیش از حد بزرگ است",
          size: bodySize
        });
      }
    } catch (e) {
      console.error(`🚨 Error processing response body for ${req.url}:`, e);
      return originalJson.call(this, {
        error: "Response processing error",
        message: "خطا در پردازش پاسخ"
      });
    }
    
    // Check for error responses
    if (res.statusCode >= 400) {
      hasError = true;
      console.error(`❌ Error response ${res.statusCode} for ${req.method} ${req.url} in ${duration}ms`);
      if (body?.error) {
        console.error(`❌ Error details:`, String(body.error).substring(0, 500));
      }
    }

    // Dynamic thresholds based on endpoint type - more conservative
    let threshold = 1000; // Increased base threshold
    if (req.url?.includes('/statistics') || req.url?.includes('/global')) {
      threshold = 5000;
    } else if (req.url?.includes('/debtors') || req.url?.includes('/unified-financial')) {
      threshold = isBatchOperation ? 10000 : 2000; // Much more lenient
    } else if (req.url?.includes('/batch-calculate')) {
      threshold = 15000; // Very lenient for batch operations
    }

    // Performance categorization - more conservative
    let perfLevel = '✅';
    if (duration > threshold * 3) {
      perfLevel = '🔴 CRITICAL';
    } else if (duration > threshold * 2) {
      perfLevel = '⚠️ SLOW';
    } else if (duration > threshold) {
      perfLevel = '🟡 MODERATE';
    }

    // Enhanced logging with batch detection - only critical logs
    const batchInfo = isBatchOperation ? 
      `[BATCH: ${req.body?.representativeIds?.length || 'unknown'} items]` : '';

    if (duration > threshold * 2) { // Only log really slow requests
      console.log(`${perfLevel} ${req.method} ${req.url} ${batchInfo} ${res.statusCode} in ${duration}ms`);
    }

    // Memory cleanup for heavy operations
    if (duration > 5000) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (heapUsedMB > 400) {
        console.warn(`🧠 High memory usage: ${heapUsedMB}MB after ${req.url}`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🗑️ Forced garbage collection');
        }
      }
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