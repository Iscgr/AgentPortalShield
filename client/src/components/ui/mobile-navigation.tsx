"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { useMobileDetection } from "@/hooks/use-mobile-detection"
import { Home, Users, FileText, Settings, BarChart3 } from "lucide-react"
import { useLocation } from "wouter"
interface MobileNavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  isActive?: boolean
}
const mobileNavItems: MobileNavItem[] = [
  { icon: Home, label: "داشبورد", path: "/" },
  { icon: Users, label: "نمایندگان", path: "/representatives" },
  { icon: FileText, label: "فاکتورها", path: "/invoices" },
  { icon: BarChart3, label: "گزارشات", path: "/financial-integrity" },
  { icon: Settings, label: "تنظیمات", path: "/settings" }
]
export function MobileNavigation() {
  const { isMobile } = useMobileDetection()
  const [location, setLocation] = useLocation()
  if (!isMobile) return null
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = location === item.path
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-lg transition-all duration-200",
                "touch-manipulation select-none",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium leading-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
