
import { Request, Response, NextFunction } from "express";

// Enhanced session interface
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

// SHERLOCK v1.0: UNIFIED AUTHENTICATION MIDDLEWARE
export const unifiedAuthMiddleware = (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  const sessionId = req.sessionID;

  console.log('🔐 SHERLOCK v1.0: Unified Authentication Check:', {
    sessionId,
    path,
    method,
    hasSession: !!req.session,
    timestamp: new Date().toISOString()
  });

  // Check authentication status
  let isAuthenticated = false;
  let userType = null;
  let currentUser = null;

  if (req.session) {
    // Check admin authentication
    if (req.session.authenticated === true || 
        (req.session.user && ['admin', 'ADMIN', 'SUPER_ADMIN'].includes(req.session.user.role))) {
      isAuthenticated = true;
      userType = 'ADMIN';
      currentUser = req.session.user;
    }
    
    // Check CRM authentication
    else if (req.session.crmAuthenticated === true || req.session.crmUser) {
      isAuthenticated = true;
      userType = 'CRM';
      currentUser = req.session.crmUser;
    }
  }

  if (isAuthenticated) {
    try {
      // Extend session with enhanced timeout
      req.session.touch();
      const extendedTimeout = 12 * 60 * 60 * 1000; // 12 hours
      req.session.cookie.maxAge = extendedTimeout;

      // Update last activity
      const now = new Date().toISOString();
      if (currentUser) {
        currentUser.lastActivity = now;
      }
      req.session.lastActivity = now;

      console.log('✅ SHERLOCK v1.0: Authentication Success:', {
        sessionId,
        userType,
        username: currentUser?.username,
        path,
        extendedTimeout: '12 hours',
        timestamp: now
      });

      // Force session save for critical operations
      req.session.save((err: any) => {
        if (err) {
          console.error('⚠️ SHERLOCK v1.0: Session save error:', err);
        } else {
          console.log('✅ SHERLOCK v1.0: Session saved successfully');
        }
        next();
      });

    } catch (sessionError) {
      console.error('⚠️ SHERLOCK v1.0: Session extension error:', sessionError);
      next(); // Continue even if session extension fails
    }
  } else {
    console.log('❌ SHERLOCK v1.0: Authentication Failed:', {
      sessionId,
      path,
      method,
      hasSession: !!req.session,
      adminAuth: req.session?.authenticated,
      crmAuth: req.session?.crmAuthenticated,
      timestamp: new Date().toISOString()
    });

    res.status(401).json({
      error: "جلسه منقضی شده است",
      errorCode: "SESSION_EXPIRED",
      message: "لطفاً صفحه را رفرش کرده و مجدداً وارد شوید",
      path: req.path,
      timestamp: new Date().toISOString(),
      sessionId: req.sessionID,
      recoveryAction: "REFRESH_AND_LOGIN"
    });
  }
};

// Enhanced auth middleware for invoice editing
export const enhancedUnifiedAuthMiddleware = async (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  const sessionId = req.sessionID;

  console.log('🔐 SHERLOCK v1.0: Enhanced Unified Auth Check:', {
    sessionId,
    path,
    method,
    timestamp: new Date().toISOString()
  });

  // Check authentication
  const isAdminAuth = req.session?.authenticated === true;
  const isCrmAuth = req.session?.crmAuthenticated === true;
  const hasValidUser = req.session?.user || req.session?.crmUser;

  if (!isAdminAuth && !isCrmAuth && !hasValidUser) {
    console.log('🚫 SHERLOCK v1.0: Enhanced Auth Failed:', {
      sessionId,
      path,
      method,
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({
      success: false,
      error: "احراز هویت مورد نیاز است",
      code: "AUTH_REQUIRED",
      sessionId: req.sessionID,
      recoveryAction: "REFRESH_AND_LOGIN"
    });
  }

  // Extend session for long operations (12 hours)
  if (req.session) {
    req.session.cookie.maxAge = 12 * 60 * 60 * 1000; // 12 hours
    
    console.log('✅ SHERLOCK v1.0: Enhanced Auth Success:', {
      sessionId,
      userType: isAdminAuth ? 'ADMIN' : 'CRM',
      path,
      extendedTimeout: '12 hours',
      timestamp: new Date().toISOString()
    });

    // Synchronized session persistence
    return new Promise<void>((resolve, reject) => {
      req.session!.save((err) => {
        if (err) {
          console.error('❌ SHERLOCK v1.0: Enhanced session save failed:', err);
          reject(err);
        } else {
          console.log('✅ SHERLOCK v1.0: Enhanced session saved successfully');
          resolve();
        }
      });
    }).then(() => next()).catch(next);
  }

  next();
};

export default { unifiedAuthMiddleware, enhancedUnifiedAuthMiddleware };
