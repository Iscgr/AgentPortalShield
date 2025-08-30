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

// EMERGENCY: Simplified CORS - minimal headers only
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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

// EMERGENCY: Disable session middleware temporarily
app.use((req, res, next) => {
  console.log('🚨 EMERGENCY: Session middleware disabled for debugging');
  next();
});

// EMERGENCY: Performance monitoring disabled
// app.use(performanceMonitoringMiddleware);

// Response compression middleware  
// Compression middleware removed for simplified system

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// EMERGENCY: Android middleware disabled
// app.use(androidMiddleware); // Temporarily disabled

// EMERGENCY: Timeout middleware disabled
// app.use(timeoutMiddleware); // Temporarily disabled

// EMERGENCY: Simple logging only
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`🔍 ${req.method} ${req.path}`);
  }
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
  let serverInstance: any;
  
  if (process.env.NODE_ENV === "production") {
    // Production: Register routes first, then static serving
    console.log('🔧 Registering API routes for production...');
    registerRoutes(app);
    registerIntegrationHealthRoutes(app);
    registerBatchRollbackRoutes(app, unifiedAuthMiddleware);
    registerStandardizedInvoiceRoutes(app, storage);
    app.use('/api/phase9', phase9IntegrationRoutes);
    console.log('✅ Production API routes registered');
    
    // Production: Static file serving
    serveStatic(app);
    
    serverInstance = app.listen(port, host, () => {
      console.log(`🚀 SHERLOCK v32.0: Production server started on port ${port}`);
      console.log(`📱 WebView: https://${process.env.REPL_SLUG || 'localhost'}.${process.env.REPL_OWNER || 'replit'}.repl.co`);
    });

  } else {
    // Development: Register routes BEFORE Vite setup
    console.log('🔧 Registering API routes BEFORE Vite setup...');
    // EMERGENCY: Disable auth middleware temporarily  
    const noAuthMiddleware = (req: any, res: any, next: any) => next();
    registerRoutes(app);
    registerIntegrationHealthRoutes(app);
    registerBatchRollbackRoutes(app, noAuthMiddleware);
    registerStandardizedInvoiceRoutes(app, storage);
    app.use('/api/phase9', phase9IntegrationRoutes);
    console.log('✅ API routes registered successfully');

    // Log all registered routes for debugging
    app._router.stack.forEach((layer: any) => {
      if (layer.route) {
        console.log(`🔍 API Route registered: ${layer.route.path}`);
      }
    });
    
    // Development: Single HTTP server with Vite integration
    const { createServer } = await import('http');
    const httpServer = createServer(app);
    
    // Setup Vite middleware AFTER routes are registered
    console.log('🔧 Setting up Vite middleware AFTER API routes...');
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
    
    // Set server instance for graceful shutdown
    serverInstance = httpServer;
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