
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Optimize scrolling for mobile
      document.documentElement.style.scrollBehavior = 'smooth';
      document.documentElement.style.webkitOverflowScrolling = 'touch';
      
      // Add mobile-specific classes for performance
      document.body.classList.add('mobile-optimized');
      
      // Enhanced mobile optimizations
      const style = document.createElement('style');
      style.textContent = `
        @media (hover: none) and (pointer: coarse) {
          /* Touch-friendly hover states */
          .admin-glass-card:hover,
          .stat-card:hover,
          .clay-card:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
            transition: all 0.2s ease !important;
          }
          
          .admin-nav-item:hover,
          .clay-nav-item:hover {
            transform: translateX(-2px) !important;
            background: rgba(30, 41, 59, 0.4) !important;
            transition: all 0.2s ease !important;
          }
          
          /* Larger touch targets */
          button, .button, a[role="button"] {
            min-height: 44px !important;
            min-width: 44px !important;
            padding: 12px 16px !important;
          }
          
          /* Improved form inputs */
          input, textarea, select {
            min-height: 44px !important;
            font-size: 16px !important; /* Prevents zoom on iOS */
            padding: 12px !important;
          }
          
          /* Better spacing for mobile */
          .grid {
            gap: 0.75rem !important;
          }
          
          /* Optimize animations */
          * {
            will-change: auto !important;
          }
          
          /* Reduce motion sensitivity */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        }
        
        /* Viewport optimizations */
        @media screen and (max-width: 768px) {
          .container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          
          /* Better text readability */
          body {
            font-size: 16px !important;
            line-height: 1.5 !important;
          }
          
          /* Optimize for small screens */
          .text-sm {
            font-size: 0.875rem !important;
          }
          
          .text-xs {
            font-size: 0.75rem !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Add meta viewport optimization
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');

      return () => {
        if (style.parentNode) {
          document.head.removeChild(style);
        }
      };
    } else {
      document.body.classList.remove('mobile-optimized');
      document.documentElement.style.scrollBehavior = '';
      document.documentElement.style.webkitOverflowScrolling = '';
    }
  }, [isMobile]);

  return {
    isMobile,
    shouldReduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    shouldDisableAnimations: false,
    touchOptimized: isMobile,
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
}
