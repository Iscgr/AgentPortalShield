
import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GestureHandlerProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullToRefresh?: () => Promise<void>;
  className?: string;
  enablePullToRefresh?: boolean;
}

export function MobileGestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPullToRefresh,
  className = '',
  enablePullToRefresh = false
}: GestureHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const SWIPE_THRESHOLD = 50;
  const PULL_THRESHOLD = 80;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      startY = touch.clientY;
      
      // Check if we're at the top of the scroll container for pull-to-refresh
      if (enablePullToRefresh && container.scrollTop === 0) {
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart) return;

      const touch = e.touches[0];
      currentY = touch.clientY;

      // Handle pull-to-refresh
      if (isPulling && enablePullToRefresh && container.scrollTop === 0) {
        const pullDist = Math.max(0, currentY - startY);
        setPullDistance(pullDist);
        
        if (pullDist > PULL_THRESHOLD) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      // Handle pull-to-refresh
      if (isPulling && enablePullToRefresh && pullDistance > PULL_THRESHOLD && onPullToRefresh) {
        setIsRefreshing(true);
        try {
          await onPullToRefresh();
          toast({
            title: "به‌روزرسانی انجام شد",
            description: "اطلاعات با موفقیت به‌روزرسانی شد",
          });
        } catch (error) {
          toast({
            title: "خطا در به‌روزرسانی",
            description: "لطفاً دوباره تلاش کنید",
            variant: "destructive",
          });
        } finally {
          setIsRefreshing(false);
        }
      }

      // Handle swipe gestures
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      // Reset states
      setTouchStart(null);
      setIsPulling(false);
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, isPulling, pullDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPullToRefresh, enablePullToRefresh, toast]);

  return (
    <div
      ref={containerRef}
      className={`mobile-gesture-container ${className}`}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, 40)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s ease',
      }}
    >
      {/* Pull-to-refresh indicator */}
      {enablePullToRefresh && (isPulling || isRefreshing) && (
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-900 z-10">
          <div className="flex items-center space-x-2 space-x-reverse">
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">در حال به‌روزرسانی...</span>
              </>
            ) : pullDistance > PULL_THRESHOLD ? (
              <span className="text-sm text-green-600">رها کنید تا به‌روزرسانی شود</span>
            ) : (
              <span className="text-sm text-gray-600">برای به‌روزرسانی بکشید</span>
            )}
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

export default MobileGestureHandler;
