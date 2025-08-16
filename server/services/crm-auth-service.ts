// 🔐 CRM Authentication Service - Dual Panel Support
export interface CrmUser {
  username: string;
  role: 'ADMIN' | 'CRM';
  panelType: 'ADMIN_PANEL' | 'CRM_PANEL';
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  actions: string[];
  restrictions: DataRestriction[];
}

export interface DataRestriction {
  field: string;
  accessLevel: 'FULL' | 'LIMITED' | 'NONE';
  condition?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export class CrmAuthService {
  // Predefined users with their credentials and permissions
  private static readonly PREDEFINED_USERS = {
    'mgr': {
      password: '8679',
      role: 'ADMIN' as const,
      panelType: 'ADMIN_PANEL' as const,
      permissions: [
        {
          resource: '*',
          actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          restrictions: []
        }
      ]
    },
    'crm': {
      password: '8679',
      role: 'CRM' as const,
      panelType: 'CRM_PANEL' as const,
      permissions: [
        {
          resource: 'representatives',
          actions: ['READ'],
          restrictions: [
            { field: 'debt_amount', accessLevel: 'FULL' as const },
            { field: 'profile_data', accessLevel: 'FULL' as const },
            { field: 'sales_amount', accessLevel: 'NONE' as const },
            { field: 'financial_details', accessLevel: 'LIMITED' as const, condition: 'debt_only' }
          ]
        },
        {
          resource: 'crm_tasks',
          actions: ['CREATE', 'READ', 'UPDATE'],
          restrictions: []
        },
        {
          resource: 'representative_levels',
          actions: ['READ', 'UPDATE'],
          restrictions: []
        },
        {
          resource: 'ai_insights',
          actions: ['READ'],
          restrictions: []
        }
      ]
    }
  };

  // Session storage for authenticated users
  private static activeSessions = new Map<string, CrmUser>();

  /**
   * Authenticate user with credentials
   */
  static async authenticate(credentials: LoginCredentials): Promise<{ success: boolean; user?: CrmUser; error?: string }> {
    const { username, password } = credentials;

    // Check predefined users
    const userConfig = this.PREDEFINED_USERS[username as keyof typeof this.PREDEFINED_USERS];
    
    if (!userConfig) {
      return {
        success: false,
        error: 'نام کاربری یا رمز عبور اشتباه است'
      };
    }

    if (userConfig.password !== password) {
      return {
        success: false,
        error: 'نام کاربری یا رمز عبور اشتباه است'
      };
    }

    // Create user session
    const user: CrmUser = {
      username,
      role: userConfig.role,
      panelType: userConfig.panelType,
      permissions: userConfig.permissions
    };

    // Generate session ID and store user
    const sessionId = this.generateSessionId();
    this.activeSessions.set(sessionId, user);

    return {
      success: true,
      user: { ...user, sessionId } as any
    };
  }

  /**
   * Get user by session ID
   */
  static getUser(sessionId: string): CrmUser | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: CrmUser, resource: string, action: string): boolean {
    // Admin has all permissions
    if (user.role === 'ADMIN') return true;

    const permission = user.permissions.find(p => 
      p.resource === resource || p.resource === '*'
    );

    return permission ? permission.actions.includes(action) : false;
  }

  /**
   * Get data restrictions for user and resource
   */
  static getDataRestrictions(user: CrmUser, resource: string): DataRestriction[] {
    const permission = user.permissions.find(p => p.resource === resource);
    return permission?.restrictions || [];
  }

  /**
   * Filter data based on user restrictions
   */
  static filterData(user: CrmUser, resource: string, data: any): any {
    if (user.role === 'ADMIN') return data; // Admin sees everything

    const restrictions = this.getDataRestrictions(user, resource);
    if (restrictions.length === 0) return data;

    const filteredData = { ...data };

    restrictions.forEach(restriction => {
      if (restriction.accessLevel === 'NONE') {
        delete filteredData[restriction.field];
      } else if (restriction.accessLevel === 'LIMITED') {
        // Apply specific limitations based on condition
        if (restriction.condition === 'debt_only' && restriction.field === 'financial_details') {
          filteredData[restriction.field] = {
            debtAmount: data[restriction.field]?.debtAmount || 0,
            creditLevel: data[restriction.field]?.creditLevel || 'نامشخص',
            paymentStatus: data[restriction.field]?.paymentStatus || 'نامشخص'
          };
        }
      }
    });

    // Add restriction flag
    filteredData.restrictedData = user.role === 'CRM';

    return filteredData;
  }

  /**
   * Logout user
   */
  static logout(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Date.now().toString();
  }

  /**
   * Get all active sessions (for admin monitoring)
   */
  static getActiveSessions(): Array<{ sessionId: string; user: CrmUser }> {
    return Array.from(this.activeSessions.entries()).map(([sessionId, user]) => ({
      sessionId,
      user
    }));
  }

  /**
   * Validate session and return user
   */
  static validateSession(sessionId: string): CrmUser | null {
    const user = this.activeSessions.get(sessionId);
    if (!user) return null;

    // Session is valid, return user
    return user;
  }

  /**
   * Create middleware for CRM authentication
   */
  static createAuthMiddleware() {
    return (req: any, res: any, next: any) => {
      const sessionId = req.headers['x-session-id'] || req.session?.crmSessionId;
      
      if (!sessionId) {
        return res.status(401).json({ error: 'احراز هویت مورد نیاز است' });
      }

      const user = this.validateSession(sessionId);
      if (!user) {
        return res.status(401).json({ error: 'جلسه نامعتبر است' });
      }

      req.crmUser = user;
      next();
    };
  }

  /**
   * Create role-based access middleware
   */
  static createRoleMiddleware(requiredRole?: 'ADMIN' | 'CRM', requiredPermission?: { resource: string; action: string }) {
    return (req: any, res: any, next: any) => {
      const user = req.crmUser;
      
      if (!user) {
        return res.status(401).json({ error: 'احراز هویت مورد نیاز است' });
      }

      // Check role requirement
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: 'دسترسی کافی ندارید' });
      }

      // Check permission requirement
      if (requiredPermission) {
        const hasAccess = this.hasPermission(user, requiredPermission.resource, requiredPermission.action);
        if (!hasAccess) {
          return res.status(403).json({ error: 'دسترسی به این منبع ندارید' });
        }
      }

      next();
    };
  }
}

export default CrmAuthService;