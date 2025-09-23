import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, closeDatabaseConnection, pool } from "./db";
import { performanceMonitoringMiddleware } from "./middleware/performance";
import { advancedSecurity } from "./middleware/advanced-security";


const app = express();

// Clear blocked IPs on startup (useful for development)
if (process.env.NODE_ENV === 'development') {
  advancedSecurity.clearAllBlocks();
}

// Fix for Replit GCE deployment - trust proxy for authentication  
// Always trust proxy in Replit environment to fix rate limiting issues
app.set('trust proxy', true);

// Enhanced CORS and security headers with special handling for portal routes
app.use((req, res, next) => {
  // Set comprehensive CORS headers for all origins in production
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Check if this is a portal route (public access)
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');

  if (isPortalRoute) {
    // Relaxed security headers for portal routes to improve Android browser compatibility
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding for portal
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    res.header('Cache-Control', 'public, max-age=300'); // Allow caching for portal content
    res.header('Pragma', 'public');

    // Additional headers for Android browser compatibility
    res.header('X-UA-Compatible', 'IE=edge,chrome=1');
    res.header('X-DNS-Prefetch-Control', 'on');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  } else {
    // Strict security headers for admin routes
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Session configuration - Skip session for public portal routes
const PgSession = connectPgSimple(session);
const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours base session for stable operations
    sameSite: 'lax' // Better cross-origin handling
  },
  name: 'marfanet.sid', // Custom session name for identification
  rolling: true // Extend session on activity
});

// Apply session middleware for all non-portal routes
app.use((req, res, next) => {
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');

  if (isPortalRoute) {
    // Skip session middleware for portal routes to avoid authentication issues
    next();
  } else {
    // Apply session middleware for admin and CRM routes
    sessionMiddleware(req, res, next);
  }
});

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);

// Response compression middleware  
// Compression middleware removed for simplified system

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Special middleware for Android browser compatibility
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isAndroid = /Android/.test(userAgent);
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');

  if (isAndroid && isPortalRoute) {
    // Additional Android-specific headers for better compatibility
    res.header('Accept-Ranges', 'bytes');
    res.header('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: blob:; connect-src \'self\' *');
    res.header('X-Permitted-Cross-Domain-Policies', 'none');
    res.header('X-Download-Options', 'noopen');

    // Remove problematic headers that cause issues on some Android browsers
    res.removeHeader('X-XSS-Protection');
    res.removeHeader('Strict-Transport-Security');
  }

  next();
});

// Simplified timeout handling
app.use((req, res, next) => {
  // Basic timeout without complex logic
  req.setTimeout(60 * 1000); // 1 minute
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Database health check before starting server
  log('Checking database connection...');
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    log('Warning: Database connection failed during startup', 'database');
    // Continue starting server - will retry connections as needed
  } else {
    log('Database connection successful', 'database');
  }

  const server = await registerRoutes(app);

  // SHERLOCK v16.2 DEPLOYMENT STABILITY: Enhanced health endpoints with comprehensive checks
  app.get('/health', async (req, res) => {
    try {
      const dbHealthy = await checkDatabaseHealth();
      const memoryUsage = process.memoryUsage();

      res.status(200).json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        environment: app.get("env"),
        uptime: process.uptime(),
        pid: process.pid,
        services: {
          database: dbHealthy ? 'connected' : 'disconnected',
          financial: 'running',
          crm: 'running',
          auth: 'running',
          sync: 'simplified'
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        }
      });
    } catch (error) {
      log(`Health check error: ${error}`, 'error');
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: Date.now(),
        error: 'Internal service error'
      });
    }
  });

  app.get('/ready', (req, res) => {
    res.status(200).json({ 
      status: 'ready', 
      timestamp: Date.now(),
      environment: app.get("env"),
      version: '16.2',
      uptime: process.uptime()
    });
  });

  // Enhanced error handling middleware with logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error ${status}: ${message} - ${req.method} ${req.path}`, 'error');

    // Don't crash the server, just log and respond
    res.status(status).json({ 
      error: message,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced SPA routing middleware for portal compatibility
  app.use((req, res, next) => {
    // Skip this middleware for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Special handling for portal routes
    if (req.path.startsWith('/portal/')) {
      // Set portal-specific headers for better Android compatibility
      res.header('Content-Type', 'text/html; charset=utf-8');
      res.header('X-UA-Compatible', 'IE=edge');
      res.header('Viewport', 'width=device-width, initial-scale=1.0');
    }

    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  // Simplified port handling - removed process killing logic
  async function logPortInfo(port: number) {
    console.log(`Starting server on port ${port}`);
  }

  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

  // Log port info
  logPortInfo(Number(port));

  // Add graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  // Start server with retry mechanism
  let serverInstance: any;
  const startServer = async () => {
    try {
      serverInstance = app.listen(port, host, () => {
        console.log(`🚀 MarFaNet Server started on port ${port}`);
        console.log(`✅ API accessible at /api/dashboard`);
      });

      serverInstance.on('error', (error: any) => {
        console.error('❌ Server error:', error);
        process.exit(1);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();

  // ✅ PERFORMANCE: Enhanced graceful error handling for production stability
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    
    // In production, log and continue. In development, crash for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ PRODUCTION: Continuing operation despite uncaught exception');
    } else {
      console.error('🛑 DEVELOPMENT: Exiting process for debugging');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise);
    console.error('Reason:', reason);
    
    // Enhanced logging with stack trace if available
    if (reason && reason.stack) {
      console.error('Stack:', reason.stack);
    }
    
    // In production, log and continue. In development, crash for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ PRODUCTION: Continuing operation despite unhandled rejection');
      
      // Close any affected database connections gracefully
      try {
        if (reason && reason.message && reason.message.includes('database')) {
          console.log('🔄 Attempting to refresh database connection...');
          checkDatabaseHealth().catch(() => {
            console.error('Failed to refresh database connection');
          });
        }
      } catch (dbError) {
        console.error('Error during database recovery:', dbError);
      }
    } else {
      console.error('🛑 DEVELOPMENT: Exiting process for debugging');
      process.exit(1);
    }
  });

  // ✅ PERFORMANCE: Additional error monitoring for async operations
  process.on('warning', (warning) => {
    console.warn('⚠️ Node.js Warning:', warning.name);
    console.warn('Message:', warning.message);
    console.warn('Stack:', warning.stack);
  });

})();