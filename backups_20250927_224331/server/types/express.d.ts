/**
 * تعریف انواع Session برای Express
 * این فایل Request interface در Express را گسترش می‌دهد
 * تا ویژگی‌های session و sessionID را شامل شود
 */

// import session types
import 'express-session';

// extend Express Request with session
declare global {
  namespace Express {
    interface Request {
      session: import('express-session').Session & {
        authenticated?: boolean;
        userId?: string;
        username?: string;
        userType?: string;
        userRole?: string;
        organizationId?: string;
        organizationName?: string;
        permissions?: string[];
        adminAuthenticated?: boolean;
        userSettings?: {
          [key: string]: any;
        };
        workspace?: {
          [key: string]: any;
        };
        [key: string]: any;
      };
      sessionID: string;
    }

    // add user property to Request
    interface Request {
      user?: {
        id: string;
        username: string;
        [key: string]: any;
      };
    }
  }
}

export {};
