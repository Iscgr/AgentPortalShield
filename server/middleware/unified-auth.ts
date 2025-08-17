import { Request, Response, NextFunction } from "express";

// Simplified interfaces
interface UnifiedSession extends Express.Session {
  authenticated?: boolean;
  userId?: number;
  username?: string;
  role?: string;
  permissions?: string[];
  crmAuthenticated?: boolean;
  crmUserId?: number;
  crmUsername?: string;
  crmRole?: string;
  crmPermissions?: string[];
  user?: any;
  crmUser?: any;
  lastActivity?: string;
}

interface UnifiedAuthRequest extends Request {
  session?: UnifiedSession;
}

// Function to create the unified authentication middleware
export function createUnifiedAuthMiddleware() {
  return (req: any, res: any, next: any) => {
    const path = req.path;

    // Public endpoints that don't require authentication
    const publicPaths = [
      '/health',
      '/api/settings/',
      '/api/unified-statistics/',
      '/api/unified-financial/',
      '/api/representatives',
      '/api/invoices',
      '/api/payments',
      '/api/activity-logs',
      '/static/',
      '/assets/',
      '/api/auth/check',
      '/api/auth/login',
      '/api/crm/auth/login'
    ];

    // Check if current path should skip authentication
    const shouldSkipAuth = publicPaths.some(publicPath => 
      path === publicPath || path.startsWith(publicPath)
    );

    if (shouldSkipAuth) {
      return next();
    }

    // For protected routes, check authentication
    const isAdminAuth = req.session?.authenticated;
    const isCrmAuth = req.session?.crmAuthenticated;

    if (!isAdminAuth && !isCrmAuth) {
      console.log(`🔒 Auth required for ${path} - No valid session found`);
      return res.status(401).json({ 
        error: 'احراز هویت مورد نیاز است',
        path: path,
        sessionId: req.sessionID
      });
    }

    // User is authenticated, continue
    console.log(`✅ Auth success for ${path} - Admin: ${!!isAdminAuth}, CRM: ${!!isCrmAuth}`);
    next();
  };
}

// Original export structure - keeping for compatibility if createUnifiedAuthMiddleware is not used directly
export const unifiedAuthMiddleware = createUnifiedAuthMiddleware();

// Enhanced auth middleware for invoice editing - also simplified
export const enhancedUnifiedAuthMiddleware = (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  // No validation - just pass through
  console.log('🔓 SHERLOCK v26.0: Enhanced pass-through auth middleware - no validation');
  next();
};

export default { unifiedAuthMiddleware, enhancedUnifiedAuthMiddleware };