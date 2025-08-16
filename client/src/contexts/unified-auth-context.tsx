
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface UnifiedUser {
  id: number;
  username: string;
  role: string;
  panelType: 'ADMIN_PANEL' | 'CRM_PANEL';
  permissions?: string[];
  hasFullAccess?: boolean;
  authenticated?: boolean;
}

interface UnifiedAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UnifiedUser | null;
  userType: 'ADMIN' | 'CRM' | null;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  loginMutation: any;
  adminLoginMutation: any;
  crmLoginMutation: any;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [userType, setUserType] = useState<'ADMIN' | 'CRM' | null>(null);
  const [, setLocation] = useLocation();

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('🔐 SHERLOCK v1.0: Admin Login Request:', credentials);
      const response = await apiRequest('/api/auth/login', { 
        method: 'POST', 
        data: credentials 
      });
      console.log('✅ SHERLOCK v1.0: Admin Login Success:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('🔐 SHERLOCK v1.0: Admin Auth Success - Setting state');
      setIsAuthenticated(true);
      setUser({
        ...data.user,
        panelType: 'ADMIN_PANEL',
        authenticated: true
      });
      setUserType('ADMIN');
      queryClient.invalidateQueries();
      setTimeout(() => {
        console.log('🔐 SHERLOCK v1.0: Redirecting to admin dashboard');
        setLocation('/dashboard');
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ SHERLOCK v1.0: Admin login error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
    }
  });

  // CRM login mutation
  const crmLoginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('🔐 SHERLOCK v1.0: CRM Login Request:', credentials);
      const response = await apiRequest('/api/crm/auth/login', {
        method: 'POST',
        data: credentials
      });
      console.log('✅ SHERLOCK v1.0: CRM Login Success:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('🔐 SHERLOCK v1.0: CRM Auth Success - Setting state');
      setIsAuthenticated(true);
      setUser({
        ...data.user,
        panelType: 'CRM_PANEL',
        authenticated: true
      });
      setUserType('CRM');
      queryClient.invalidateQueries();
      setTimeout(() => {
        console.log('🔐 SHERLOCK v1.0: Redirecting to CRM dashboard');
        setLocation('/crm');
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ SHERLOCK v1.0: CRM login error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
    }
  });

  // Unified login mutation (for backward compatibility)
  const loginMutation = adminLoginMutation;

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Try admin auth first
      const adminResponse = await fetch("/api/auth/check", { 
        credentials: "include",
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        setIsAuthenticated(true);
        setUser({
          ...adminData.user,
          panelType: 'ADMIN_PANEL',
          authenticated: true
        });
        setUserType('ADMIN');
        console.log('🔐 SHERLOCK v1.0: Admin auth check successful:', adminData);
        return;
      }

      // Try CRM auth if admin fails
      const crmResponse = await fetch('/api/crm/auth/user', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (crmResponse.ok) {
        const crmData = await crmResponse.json();
        setIsAuthenticated(true);
        setUser({
          ...crmData,
          panelType: 'CRM_PANEL',
          authenticated: true
        });
        setUserType('CRM');
        console.log('🔐 SHERLOCK v1.0: CRM auth check successful:', crmData);
        return;
      }

      // Both failed
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
      console.log('❌ SHERLOCK v1.0: Auth check failed for both admin and CRM');
      
    } catch (error) {
      console.error('❌ SHERLOCK v1.0: Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      if (userType === 'ADMIN') {
        await fetch("/api/auth/logout", { 
          method: "POST", 
          credentials: "include" 
        });
      } else if (userType === 'CRM') {
        await fetch("/api/crm/auth/logout", { 
          method: "POST", 
          credentials: "include" 
        });
      }
    } catch (error) {
      console.error('❌ SHERLOCK v1.0: Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
      setLocation('/auth');
    }
  };

  // Check authentication on mount and setup periodic checks
  useEffect(() => {
    checkAuth();
    
    // Set up periodic auth check (every 5 minutes)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkAuth();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <UnifiedAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        userType,
        login,
        logout,
        checkAuth,
        loginMutation,
        adminLoginMutation,
        crmLoginMutation,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider");
  }
  return context;
}

// Export unified auth as default
export const useAuth = useUnifiedAuth;

export default UnifiedAuthContext;
