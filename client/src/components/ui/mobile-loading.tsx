"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { useMobileDetection } from "@/hooks/use-mobile-detection"
interface MobileLoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}
export function MobileLoading({ 
  size = "md", 
  text = "در حال بارگذاری...",
  className 
}: MobileLoadingProps) {
  const { isMobile } = useMobileDetection()
  const spinnerSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }
  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }
  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-3",
      isMobile && "py-8",
      className
    )}>
      <div 
        className={cn(
          "animate-spin rounded-full border-2 border-primary/20 border-t-primary",
          spinnerSizes[size]
        )}
        aria-hidden="true"
      />
      {text && (
        <p className={cn(
          "text-muted-foreground animate-pulse",
          textSizes[size],
          isMobile && "text-center max-w-[280px]"
        )}>
          {text}
        </p>
      )}
    </div>
  )
}
// Full screen mobile loader for page transitions
export function MobilePageLoader({ text }: { text?: string }) {
  const { isMobile } = useMobileDetection()
  
  if (!isMobile) return null
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <MobileLoading size="lg" text={text} />
    </div>
  )
}
// Skeleton loader optimized for mobile
export function MobileSkeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useMobileDetection()
  
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        isMobile && "h-12", // Larger touch targets on mobile
        className
      )}
      {...props}
    />
  )
}
