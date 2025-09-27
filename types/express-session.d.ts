/**
 * Enhanced session interface for MarFaNet application
 * This provides complete typing for session objects used throughout the application
 */
declare namespace Express {
  interface Session {
    authenticated?: boolean;
    userId?: string;
    username?: string;
    userType?: string;
    userRole?: string;
    organizationId?: string;
    organizationName?: string;
    permissions?: string[];
    adminAuthenticated?: boolean;
    loginAttempts?: number;
    lastLoginAttempt?: number;
    userSettings?: {
      theme?: string;
      language?: string;
      notifications?: boolean;
      [key: string]: any;
    };
    workspace?: {
      id?: string;
      name?: string;
      settings?: any;
      [key: string]: any;
    };
    csrfToken?: string;
    [key: string]: any;
  }
}

declare namespace Express {
  interface Request {
    session: Session;
    sessionID: string;
    user?: {
      id: string;
      username: string;
      role: string;
      permissions: string[];
      [key: string]: any;
    };
  }
}