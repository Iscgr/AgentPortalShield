/**
 * Context برای مدیریت احراز هویت یکپارچه
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

interface UnifiedAuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Alias for loading, for backward compatibility
  userType?: string; // نوع کاربر (ADMIN, CRM, etc.)
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | null>(null);

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // بررسی احراز هویت در لود اولیه
    const checkAuth = async () => {
      try {
        // درخواست به API برای بررسی وضعیت احراز هویت
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // پیاده‌سازی لاگین
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      setUser(null);
    }
  };

  return (
    <UnifiedAuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error, 
        login, 
        logout,
        isAuthenticated: !!user,
        isLoading: loading, // اضافه کردن isLoading به عنوان alias برای loading
        userType: user?.role === 'admin' ? 'ADMIN' : user?.role || undefined // تعیین نوع کاربر براساس نقش
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within an UnifiedAuthProvider');
  }
  return context;
}

// برای سازگاری با کد قبلی
export const AuthProvider = UnifiedAuthProvider;
export const useAuth = useUnifiedAuth;
