import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Handshake, 
  Settings, 
  Shield,
  LogOut,
  Menu,
  X,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUnifiedAuth } from "@/contexts/unified-auth-context";

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: BarChart3 },
  { name: "KPI مالی", href: "/kpi-dashboard", icon: BarChart3 },
  { name: "نمایندگان", href: "/representatives", icon: Users },
  { name: "فاکتورها", href: "/invoices", icon: FileText },
  { name: "مدیریت فاکتورها", href: "/invoice-management", icon: Edit },
  { name: "همکاران فروش", href: "/sales-partners", icon: Handshake },
  { name: "تنظیمات", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useUnifiedAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "sidebar-nav fixed right-0 top-0 h-screen z-50 w-80 transform transition-all duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground mb-1">MarFaNet</h1>
                <p className="text-sm text-muted-foreground">سیستم مدیریت مالی</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-foreground hover:bg-muted"
              onClick={onToggle}
              aria-label="بستن منوی ناوبری"
              title="بستن منوی ناوبری"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-4 flex-1" aria-label="منوی اصلی ناوبری">
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                             (item.href === "/dashboard" && location === "/");
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-label={`رفتن به صفحه ${item.name}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "unified-nav-item",
                    isActive && "active"
                  )}
                >
                  <item.icon className="ml-3 w-5 h-5" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-border">
          <div className="unified-card p-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">حسابدار اصلی</p>
                <p className="text-xs text-muted-foreground">admin@marfanet.com</p>
              </div>
              <button 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 focus-ring rounded-md p-1"
                onClick={handleLogout}
                aria-label="خروج از سیستم"
                title="خروج از سیستم"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
    </div>
    </>
  );
}
