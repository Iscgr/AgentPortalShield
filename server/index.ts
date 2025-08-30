import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, closeDatabaseConnection, pool } from "./db";
import { performanceMonitoringMiddleware } from "./middleware/performance";
import { registerCrmRoutes } from "./routes/crm-routes";
import { registerUnifiedFinancialRoutes } from "./routes/unified-financial-routes";
import { registerUnifiedStatisticsRoutes } from "./routes/unified-statistics-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import { registerStandardizedInvoiceRoutes } from "./routes/standardized-invoice-routes";
import { registerMaintenanceRoutes } from "./routes/maintenance-routes";
import { registerBatchRollbackRoutes } from "./routes/batch-rollback-routes";
import { registerWorkspaceRoutes } from "./routes/workspace-routes";
import { registerIntegrationHealthRoutes } from "./routes/integration-health-routes";
import { registerFeatureFlagRoutes } from "./routes/feature-flag-routes";
import { registerAiEngineRoutes } from "./routes/ai-engine-routes";
import { registerDebtVerificationRoutes } from "./routes/debt-verification-routes";
import phase9IntegrationRoutes from "./routes/phase-9-integration-monitoring";
import { unifiedAuthMiddleware } from "./middleware/unified-auth";
import { storage } from "./storage";


const app = express();

// Fix for Replit GCE deployment - trust proxy for authentication
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

// Increase timeout for large file processing
app.use((req, res, next) => {
  // Set timeout to 10 minutes for file upload endpoints
  if (req.path === '/api/invoices/generate') {
    req.setTimeout(10 * 60 * 1000); // 10 minutes
    res.setTimeout(10 * 60 * 1000); // 10 minutes
  }
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

  // 🎯 CRITICAL FIX: Register API routes BEFORE any middleware that might interfere
  console.log('🔧 Registering API routes with priority...');
  registerRoutes(app);
  // registerCouplingRoutes(app); // This route is not defined in the original code, assuming it's a typo or removed.
  registerIntegrationHealthRoutes(app);
  registerBatchRollbackRoutes(app, unifiedAuthMiddleware);
  registerStandardizedInvoiceRoutes(app, storage);
  
  // Phase 9: Integration monitoring system
  app.use('/api/phase9', phase9IntegrationRoutes);
  console.log('✅ PHASE 9: Integration monitoring routes registered');

  // Log all registered routes for debugging
  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      console.log(`🔍 API Route registered: ${layer.route.path}`);
    }
  });

  // Move port and host declarations to the top
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = '0.0.0.0';

  // Kill any existing process on the port before starting
  async function killExistingPort(port: number) {
    try {
      const { exec } = await import('child_process');
      exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
        if (error) {
          console.log(`No existing process on port ${port} to kill`);
        } else {
          console.log(`✅ Killed existing process on port ${port}`);
        }
      });
    } catch (error) {
      console.log('Could not check for existing processes');
    }
  }

  await killExistingPort(Number(port));

  // 🎯 CRITICAL FIX: Single unified server startup logic
  if (process.env.NODE_ENV === "production") {
    // Production: Static file serving
    serveStatic(app);
    
    const serverInstance = app.listen(port, host, () => {
      console.log(`🚀 SHERLOCK v32.0: Production server started on port ${port}`);
      console.log(`📱 WebView: https://${process.env.REPL_SLUG || 'localhost'}.${process.env.REPL_OWNER || 'replit'}.repl.co`);
    });

  } else {
    // Development: Single HTTP server with Vite integration
    const { createServer } = await import('http');
    const httpServer = createServer(app);
    
    // Setup Vite middleware with the HTTP server
    console.log('🔧 Setting up Vite with HTTP server integration...');
    await setupVite(app, httpServer);

    // Start the unified HTTP server
    httpServer.listen(port, host, () => {
      console.log(`🚀 SHERLOCK v32.0: Development server started on port ${port}`);
      console.log(`📱 WebView: https://${process.env.REPL_SLUG || 'localhost'}.${process.env.REPL_OWNER || 'replit'}.repl.co`);
      console.log(`✅ Dashboard API accessible at /api/dashboard`);
    });

    httpServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is still in use. Retrying in 2 seconds...`);
        setTimeout(() => {
          httpServer.close();
          process.exit(1);
        }, 2000);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });
  }

  // Graceful shutdown handling for production stability
  const gracefulShutdown = async (signal: string) => {
    log(`Received ${signal} signal, starting graceful shutdown...`);

    try {
      // Close HTTP server
      serverInstance.close(async () => {
        log('HTTP server closed');

        // Close database connections
        await closeDatabaseConnection();

        log('Graceful shutdown complete');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        log('Force shutdown after timeout');
        process.exit(1);
      }, 10000);

    } catch (error) {
      log(`Error during shutdown: ${error}`, 'error');
      process.exit(1);
    }
  };

  // Handle various termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions to prevent crashes
  process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    console.error(error.stack);
    // Don't exit - let the server continue running
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at promise: ${reason}`, 'error');
    // Don't exit - let the server continue running
  });

})();