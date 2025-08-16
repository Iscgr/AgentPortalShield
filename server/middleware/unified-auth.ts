
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
// 🔧 SHERLOCK v12.0: DEBUG LOGGING SYSTEM FOR SESSION EXPIRY ISSUE
const createDebugLogger = (context: string) => {
  return {
    info: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`🔍 SHERLOCK v12.0 [${context}] ${timestamp}: ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
      const timestamp = new Date().toISOString();
      console.error(`❌ SHERLOCK v12.0 [${context}] ${timestamp}: ${message}`, error || '');
    },
    success: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(`✅ SHERLOCK v12.0 [${context}] ${timestamp}: ${message}`, data || '');
    },
    warning: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.warn(`⚠️ SHERLOCK v12.0 [${context}] ${timestamp}: ${message}`, data || '');
    }
  };
};

export const unifiedAuthMiddleware = (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  const sessionId = req.sessionID;
  const debug = createDebugLogger('UNIFIED_AUTH');

  debug.info('Authentication Check Started', {
    sessionId,
    path,
    method,
    hasSession: !!req.session,
    sessionData: req.session ? {
      authenticated: req.session.authenticated,
      crmAuthenticated: req.session.crmAuthenticated,
      hasUser: !!req.session.user,
      hasCrmUser: !!req.session.crmUser,
      cookieMaxAge: req.session.cookie?.maxAge,
      sessionAge: req.session.cookie ? Date.now() - (req.session.cookie.originalMaxAge || Date.now()) : null
    } : null
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
      debug.info('Authentication Successful - Extending Session', {
        userType,
        username: currentUser?.username,
        path,
        sessionId,
        currentMaxAge: req.session?.cookie?.maxAge
      });

      // Touch session to reset expiry
      req.session.touch();
      const extendedTimeout = 12 * 60 * 60 * 1000; // 12 hours
      req.session.cookie.maxAge = extendedTimeout;
      req.session.cookie.httpOnly = true;
      req.session.cookie.secure = false; // Allow HTTP for development

      // Update last activity
      const now = new Date().toISOString();
      if (currentUser) {
        currentUser.lastActivity = now;
      }
      req.session.lastActivity = now;

      debug.success('Session Extended Successfully', {
        sessionId,
        userType,
        username: currentUser?.username,
        path,
        extendedTimeout: '12 hours',
        newMaxAge: req.session.cookie.maxAge
      });

      // 🛠️ SHERLOCK v12.0: ATOMIC SESSION SAVE WITH RETRY MECHANISM
      const saveSessionWithRetry = (retryCount = 0) => {
        const maxRetries = 3;
        
        debug.info('Attempting Session Save', { attempt: retryCount + 1, maxRetries, sessionId });
        
        req.session!.save((saveError: any) => {
          if (saveError) {
            debug.error('Session Save Failed', { 
              attempt: retryCount + 1, 
              error: saveError.message || saveError,
              sessionId,
              path
            });
            
            if (retryCount < maxRetries - 1) {
              debug.warning('Retrying Session Save', { nextAttempt: retryCount + 2 });
              setTimeout(() => saveSessionWithRetry(retryCount + 1), 100);
            } else {
              debug.error('Session Save Failed After All Retries', { 
                totalAttempts: retryCount + 1,
                finalError: saveError
              });
              // Continue anyway to prevent blocking the request
              next();
            }
          } else {
            debug.success('Session Saved Successfully', { 
              attempt: retryCount + 1,
              sessionId,
              savedMaxAge: req.session?.cookie?.maxAge,
              path
            });
            next();
          }
        });
      };

      // Start session save with retry mechanism
      saveSessionWithRetry();

    } catch (sessionError) {
      debug.error('Session Extension Error', sessionError);
      // Continue even if session extension fails to prevent blocking
      next();
    }
  } else {
    debug.error('Authentication Failed - Session Invalid', {
      sessionId,
      path,
      method,
      hasSession: !!req.session,
      adminAuth: req.session?.authenticated,
      crmAuth: req.session?.crmAuthenticated,
      userExists: !!req.session?.user,
      crmUserExists: !!req.session?.crmUser,
      cookieMaxAge: req.session?.cookie?.maxAge,
      sessionAge: req.session?.cookie ? Date.now() - (req.session.cookie.originalMaxAge || Date.now()) : null
    });

    res.status(401).json({
      error: "جلسه منقضی شده است",
      errorCode: "SESSION_EXPIRED",
      message: "لطفاً صفحه را رفرش کرده و مجدداً وارد شوید",
      path: req.path,
      timestamp: new Date().toISOString(),
      sessionId: req.sessionID,
      recoveryAction: "REFRESH_AND_LOGIN",
      debugInfo: {
        hasSession: !!req.session,
        adminAuth: req.session?.authenticated,
        crmAuth: req.session?.crmAuthenticated
      }
    });
  }
};

// Enhanced auth middleware for invoice editing
export const enhancedUnifiedAuthMiddleware = async (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  const sessionId = req.sessionID;
  const debug = createDebugLogger('ENHANCED_AUTH');

  debug.info('Enhanced Authentication Check Started', {
    sessionId,
    path,
    method,
    hasSession: !!req.session,
    sessionData: req.session ? {
      authenticated: req.session.authenticated,
      crmAuthenticated: req.session.crmAuthenticated,
      hasUser: !!req.session.user,
      hasCrmUser: !!req.session.crmUser,
      cookieMaxAge: req.session.cookie?.maxAge
    } : null
  });

  // Check authentication
  const isAdminAuth = req.session?.authenticated === true;
  const isCrmAuth = req.session?.crmAuthenticated === true;
  const hasValidUser = req.session?.user || req.session?.crmUser;

  if (!isAdminAuth && !isCrmAuth && !hasValidUser) {
    debug.error('Enhanced Authentication Failed', {
      sessionId,
      path,
      method,
      isAdminAuth,
      isCrmAuth,
      hasValidUser,
      sessionExists: !!req.session
    });

    return res.status(401).json({
      success: false,
      error: "احراز هویت مورد نیاز است",
      code: "AUTH_REQUIRED",
      sessionId: req.sessionID,
      recoveryAction: "REFRESH_AND_LOGIN",
      debugInfo: {
        isAdminAuth,
        isCrmAuth,
        hasValidUser
      }
    });
  }

  // Extend session for long operations (12 hours)
  if (req.session) {
    debug.info('Extending Session for Long Operations', {
      currentMaxAge: req.session.cookie.maxAge,
      userType: isAdminAuth ? 'ADMIN' : 'CRM'
    });
    
    req.session.touch();
    req.session.cookie.maxAge = 12 * 60 * 60 * 1000; // 12 hours
    req.session.cookie.httpOnly = true;
    req.session.cookie.secure = false; // Allow HTTP for development
    
    debug.success('Enhanced Auth Success - Session Extended', {
      sessionId,
      userType: isAdminAuth ? 'ADMIN' : 'CRM',
      path,
      extendedTimeout: '12 hours',
      newMaxAge: req.session.cookie.maxAge
    });

    // 🛠️ SHERLOCK v12.0: ENHANCED ATOMIC SESSION SAVE WITH PROMISE
    return new Promise<void>((resolve, reject) => {
      const saveAttempt = (attempt = 1) => {
        debug.info('Enhanced Session Save Attempt', { attempt, maxAttempts: 3, sessionId });
        
        req.session!.save((saveError) => {
          if (saveError) {
            debug.error('Enhanced Session Save Failed', { 
              attempt, 
              error: saveError.message || saveError,
              sessionId,
              path
            });
            
            if (attempt < 3) {
              debug.warning('Retrying Enhanced Session Save', { nextAttempt: attempt + 1 });
              setTimeout(() => saveAttempt(attempt + 1), 100);
            } else {
              debug.error('Enhanced Session Save Failed After All Attempts', {
                totalAttempts: attempt,
                finalError: saveError
              });
              reject(saveError);
            }
          } else {
            debug.success('Enhanced Session Saved Successfully', { 
              attempt,
              sessionId,
              savedMaxAge: req.session?.cookie?.maxAge
            });
            resolve();
          }
        });
      };
      
      saveAttempt();
    }).then(() => next()).catch((error) => {
      debug.error('Enhanced Session Save Promise Failed', error);
      // Continue anyway to prevent blocking critical operations
      next();
    });
  }

  next();
};

export default { unifiedAuthMiddleware, enhancedUnifiedAuthMiddleware };
