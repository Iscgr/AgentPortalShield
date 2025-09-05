
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface UnifiedUser {
  id: number;
  username: string;
  role: string;
  panelType: 'ADMIN_PANEL';
  permissions?: string[];
  hasFullAccess?: boolean;
  authenticated?: boolean;
}

interface UnifiedAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UnifiedUser | null;
  userType: 'ADMIN' | null;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  loginMutation: any;
  adminLoginMutation: any;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [userType, setUserType] = useState<'ADMIN' | null>(null);
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


  // Unified login mutation (for backward compatibility)
  const loginMutation = adminLoginMutation;

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check actual session status from server
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
        method: 'GET'
      });
      
      if (response.ok) {
        const authData = await response.json();
        if (authData.authenticated) {
          console.log('✅ SHERLOCK v32.3: User is authenticated:', authData.user);
          setIsAuthenticated(true);
          setUser({
            id: authData.user.id,
            username: authData.user.username,
            role: authData.user.role,
            panelType: 'ADMIN_PANEL',
            authenticated: true,
            permissions: authData.user.permissions || ['FULL_ACCESS'],
            hasFullAccess: authData.user.hasFullAccess
          });
          setUserType('ADMIN');
        } else {
          console.log('❌ SHERLOCK v32.3: User not authenticated');
          setIsAuthenticated(false);
          setUser(null);
          setUserType(null);
        }
      } else {
        console.log('❌ SHERLOCK v32.3: Auth check failed');
        setIsAuthenticated(false);
        setUser(null);
        setUserType(null);
      }
      
    } catch (error) {
      console.error('❌ SHERLOCK v32.3: Auth check error:', error);
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
      await fetch("/api/auth/logout", { 
        method: "POST", 
        credentials: "include" 
      });
    } catch (error) {
      console.error('❌ SHERLOCK v1.0: Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setUserType(null);
      setLocation('/auth');
    }
  };

  // Check authentication on mount only - no periodic checks
  useEffect(() => {
    checkAuth();
    // SHERLOCK v26.0: No periodic auth checks - one time setup only
  }, []);

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
