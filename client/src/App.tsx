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
import AllocationManagement from "@/pages/allocation-management";

function AuthenticatedRouter() {
  const { isAuthenticated: adminAuthenticated, isLoading: adminIsLoading, user: adminUser } = useUnifiedAuth(); // Use unified auth hook
  const [location] = useLocation();

  const isPublicPortal = /^\/portal\/[^\/]+\/?$|^\/representative\/[^\/]+\/?$/.test(location);

  if (isPublicPortal) {
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

  if (!adminAuthenticated) {
    if (location === "/admin-login") {
      return <AdminLogin onLoginSuccess={() => {}} />;
    }
    return <UnifiedAuth />;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/representatives" component={Representatives} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/invoice-management" component={InvoiceManagement} />
        <Route path="/sales-partners" component={SalesPartners} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin-login">
          <AdminLogin onLoginSuccess={() => {
            console.log('Admin login successful');
          }} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobile } = useMobileOptimizations();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-panel-background dark">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div className="main-content lg:mr-80 mr-0 relative z-10">
        <Header onMenuClick={toggleSidebar} />
        <main className="p-4 lg:p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { isMobile } = useMobileOptimizations();

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

export default App;