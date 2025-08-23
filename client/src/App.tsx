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
import MobileOptimizationPanel from "@/components/ui/mobile-optimization-panel";
import MobileGestureHandler from "@/components/ui/mobile-gesture-handler";
import IntelligentGestureSystem from "@/components/ui/intelligent-gesture-system";


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
            <div className="min-h-screen clay-background relative flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">بارگذاری پنل CRM مدرن...</p>
                <p className="text-blue-200 text-sm mt-2">معماری یکپارچه جدید</p>
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


function AuthenticatedRouter() {
  const { isAuthenticated: adminAuthenticated, isLoading: adminIsLoading, user: adminUser } = useUnifiedAuth(); // Use unified auth hook
  const [location] = useLocation();

  // ✅ SHERLOCK v32.1: بهبود تشخیص پرتال عمومی با regex دقیق
  const isPublicPortal = /^\/portal\/[^\/]+\/?$|^\/representative\/[^\/]+\/?$/.test(location);

  const isCrmRoute = location.startsWith('/crm');

  if (isPublicPortal) {
    // 🔒 SECURITY: Completely isolated public portal - no admin access
    return (
      <div className="dark public-portal-isolated">
        <Switch>
          <Route path="/portal/:publicId" component={Portal} />
          <Route path="/representative/:publicId" component={Portal} />
          <Route path="/portal/*">
            {() => (
              <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 text-6xl mb-4">⚠</div>
                  <h1 className="text-2xl font-bold mb-2">پورتال یافت نشد</h1>
                  <p className="text-gray-400">
                    لینک پورتال نامعتبر است. لطفاً لینک صحیح را از مدیر سیستم دریافت کنید.
                  </p>
                </div>
              </div>
            )}
          </Route>
          <Route path="/representative/*">
            {() => (
              <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 text-6xl mb-4">⚠</div>
                  <h1 className="text-2xl font-bold mb-2">پورتال یافت نشد</h1>
                  <p className="text-gray-400">
                    لینک پورتال نامعتبر است. لطفاً لینک صحیح را از مدیر سیستم دریافت کنید.
                  </p>
                </div>
              </div>
            )}
          </Route>
        </Switch>
      </div>
    );
  }

  // SHERLOCK v3.0 FIX: Always require login for CRM routes
  if (isCrmRoute) {
    // 🔒 SECURITY: CRM routes are protected by unified auth
    return <CrmProtectedRoutes />;
  }

  // Show loading state while checking authentication
  if (adminIsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    );
  }

  // SHERLOCK v3.0 FIX: Show unified auth for non-authenticated users  
  if (!adminAuthenticated) {
    return <UnifiedAuth />;
  }

  // Show admin panel if authenticated
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/representatives" component={Representatives} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/invoice-management" component={InvoiceManagement} />
        <Route path="/sales-partners" component={SalesPartners} />
        <Route path="/financial-integrity" component={FinancialIntegrityPage} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobile } = useMobileOptimizations();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleRefresh = async () => {
    // Simulate refresh - reload page data
    window.location.reload();
  };

  const handleSwipeLeft = () => {
    if (isMobile) {
      setIsSidebarOpen(true);
    }
  };

  const handleSwipeRight = () => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="admin-panel-background dark">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div className="main-content lg:mr-80 mr-0 relative z-10">
        <Header onMenuClick={toggleSidebar} />
        
        {/* Mobile-specific components - Collapsible and conditional */}
        {isMobile && (
          <MobileOptimizationPanel />
        )}
        
        {/* Mobile Optimization Panel - Non-blocking overlay */}
        <MobileOptimizationPanel />
        
        <IntelligentGestureSystem
          adaptiveThresholds={true}
          learningEnabled={true}
          onGestureDetected={(pattern) => {
            // Handle intelligent gestures
            if (pattern.type === 'swipe') {
              if (pattern.direction === 'left') handleSwipeLeft();
              if (pattern.direction === 'right') handleSwipeRight();
            } else if (pattern.type === 'pull') {
              handleRefresh();
            }
          }}
          className="min-h-screen"
        >
          <MobileGestureHandler
            enablePullToRefresh={isMobile}
            onPullToRefresh={handleRefresh}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            className="min-h-screen"
          >
            <main className="p-4 lg:p-6 relative z-10">
              {children}
            </main>
          </MobileGestureHandler>
        </IntelligentGestureSystem>
      </div>
    </div>
  );
}

function App() {
  const { isMobile, shouldReduceMotion } = useMobileOptimizations();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UnifiedAuthProvider>
          <Router>
            <div className={`min-h-screen bg-background ${isMobile ? 'mobile-optimized' : ''} ${shouldReduceMotion ? 'reduce-motion' : ''}`}>
              <AuthenticatedRouter />
            </div>
          </Router>
        </UnifiedAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;