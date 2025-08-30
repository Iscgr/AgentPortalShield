import { Switch, Route, useLocation, Router } from "wouter";
import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnifiedAuthProvider, useUnifiedAuth } from "@/contexts/unified-auth-context";
import { useMobileOptimizations } from "@/hooks/use-mobile-optimizations";

// Layout components
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
// Import MobileNavigation and advanced mobile components
import MobileNavigation from "@/components/layout/mobile-navigation";


// Pages
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import InvoiceManagement from "@/pages/InvoiceManagement";
import Representatives from "@/pages/representatives";
import SalesPartners from "@/pages/sales-partners";
import Settings from "@/pages/settings";
import Portal from "@/pages/portal";
import AdminLogin from "@/pages/admin-login";
import NotFound from "@/pages/not-found";
import UnifiedAuth from "@/pages/unified-auth";
import FinancialIntegrityPage from "@/pages/financial-integrity";

// Lazy load Modern CRM Dashboard with preloading optimization
const ModernCrmDashboard = lazy(() => 
  import('./components/crm/modern-crm-dashboard').then(module => {
    // Preload critical components
    import('./components/crm/workspace/WorkspaceHub');
    return module;
  })
);



// CRM Protected Routes Component
function CrmProtectedRoutes() {
  const { user, isLoading } = useUnifiedAuth(); // Use unified auth hook
  const [, setLocation] = useLocation();

  // Check authentication but don't create infinite loops
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/'); // Redirect to unified auth
    }
  }, [user, isLoading, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">در حال بررسی احراز هویت CRM...</p>
        </div>
      </div>
    );
  }

  // Return null while redirecting
  if (!user) {
    return null;
  }

  // 🔥 NEW: Render Modern CRM Dashboard (Unified Interface)
  return (
    <Switch>
      <Route path="/crm">
        {() => (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">در حال بارگیری داشبورد CRM...</p>
              </div>
            </div>
          }>
            <ModernCrmDashboard />
          </Suspense>
        )}
      </Route>
      <Route path="/crm/:rest*">
        {() => (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">در حال بارگیری داشبورد CRM...</p>
              </div>
            </div>
          }>
            <ModernCrmDashboard />
          </Suspense>
        )}
      </Route>
    </Switch>
  );
}

// Admin Routes Component  
function AdminProtectedRoutes() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const { data: authData } = useQuery({
    queryKey: ['/api/auth/check'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  useEffect(() => {
    if (authData?.isAuthenticated) {
      setIsAdmin(true);
      setIsLoading(false);
    } else {
      setIsAdmin(false);
      setIsLoading(false);
      // Only redirect if on a protected route
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') || currentPath.startsWith('/dashboard') || 
          currentPath.startsWith('/invoices') || currentPath.startsWith('/representatives') ||
          currentPath.startsWith('/financial-integrity')) {
        setLocation('/admin-login');
      }
    }
  }, [authData, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/invoice-management" component={InvoiceManagement} />
            <Route path="/representatives" component={Representatives} />
            <Route path="/sales-partners" component={SalesPartners} />
            <Route path="/settings" component={Settings} />
            <Route path="/financial-integrity" component={FinancialIntegrityPage} />
            <Route path="/admin-login" component={AdminLogin} />
            <Route>
              {() => {
                const [, setLocation] = useLocation();
                useEffect(() => {
                  setLocation('/dashboard');
                }, [setLocation]);
                return null;
              }}
            </Route>
          </Switch>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}

// Main Router Component
function AuthenticatedRouter() {
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <Toaster />
      <Switch>
        {/* Public Portal Route - No Authentication Required */}
        <Route path="/portal/:id?">
          {(params) => (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Portal representativeId={params.id} />
            </div>
          )}
        </Route>

        {/* Unified Authentication Route */}
        <Route path="/">
          {() => <UnifiedAuth />}
        </Route>

        {/* CRM Routes - Uses Unified Auth */}
        <Route path="/crm/:rest*">
          {() => <CrmProtectedRoutes />}
        </Route>

        {/* Admin Routes - Uses Traditional Auth */}
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/dashboard" component={() => <AdminProtectedRoutes />} />
        <Route path="/invoices" component={() => <AdminProtectedRoutes />} />
        <Route path="/invoice-management" component={() => <AdminProtectedRoutes />} />
        <Route path="/representatives" component={() => <AdminProtectedRoutes />} />
        <Route path="/sales-partners" component={() => <AdminProtectedRoutes />} />
        <Route path="/settings" component={() => <AdminProtectedRoutes />} />
        <Route path="/financial-integrity" component={() => <AdminProtectedRoutes />} />

        {/* Catch-all for 404 */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  // Enhanced mobile detection and optimization
  useMobileOptimizations();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UnifiedAuthProvider>
          <Router>
            <div className={`min-h-screen bg-background ${isMobile ? 'mobile-optimized' : ''}`}>
              <AuthenticatedRouter />
            </div>
          </Router>
        </UnifiedAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}