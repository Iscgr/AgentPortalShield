
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useMobileDetection } from "@/hooks/use-mobile-detection"

interface MobileFormWrapperProps {
  children: React.ReactNode
  className?: string
  title?: string
  onBack?: () => void
}

export function MobileFormWrapper({ 
  children, 
  className, 
  title,
  onBack 
}: MobileFormWrapperProps) {
  const { isMobile } = useMobileDetection()

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background",
      "flex flex-col h-screen",
      "safe-area-inset-top safe-area-inset-bottom",
      className
    )}>
      {title && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent touch-manipulation"
              aria-label="بازگشت"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="w-10 h-10" /> {/* Spacer for centering */}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </div>
    </div>
  )
}

// Enhanced mobile input component
export const MobileInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  const { isMobile } = useMobileDetection()
  
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isMobile && "min-h-[44px] text-base", // Prevent zoom on iOS
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
MobileInput.displayName = "MobileInput"
