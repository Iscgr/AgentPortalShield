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

// SHERLOCK v26.0: SIMPLIFIED NO-VALIDATION MIDDLEWARE
// Simple pass-through middleware that allows all requests
export const unifiedAuthMiddleware = (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  // No validation - just pass through
  console.log('🔓 SHERLOCK v26.0: Pass-through auth middleware - no validation');
  next();
};

// Enhanced auth middleware for invoice editing - also simplified
export const enhancedUnifiedAuthMiddleware = (req: UnifiedAuthRequest, res: Response, next: NextFunction) => {
  // No validation - just pass through
  console.log('🔓 SHERLOCK v26.0: Enhanced pass-through auth middleware - no validation');
  next();
};

export default { unifiedAuthMiddleware, enhancedUnifiedAuthMiddleware };