
/**
 * Simplified mobile optimizations hook
 * Works with the unified CSS system
 */
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Set proper viewport
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
      );

      // Optimize scrolling performance
      document.documentElement.style.scrollBehavior = 'smooth';
      (document.documentElement.style as any).webkitOverflowScrolling = 'touch';
    }
  }, [isMobile]);

  return {
    isMobile,
    touchOptimized: isMobile
  };
}
