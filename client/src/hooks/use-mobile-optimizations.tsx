
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // 🎯 SHERLOCK v33.0: Enhanced mobile optimizations
      
      // Optimize scrolling performance
      document.documentElement.style.scrollBehavior = 'smooth';
      document.documentElement.style.webkitOverflowScrolling = 'touch';
      
      // Reduce animation complexity for mobile
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      document.documentElement.style.setProperty('--transition-timing', 'ease-out');
      
      // Enable hardware acceleration for key elements
      const style = document.createElement('style');
      style.textContent = `
        /* 🎯 SHERLOCK v33.0: Mobile-First Optimizations */
        @media (max-width: 768px) {
          .representatives-table,
          .invoice-table,
          .dashboard-grid {
            transform: translateZ(0);
            will-change: scroll-position;
          }
          
          /* Responsive grid improvements */
          .grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
          
          /* Touch-friendly buttons */
          button, .button, [role="button"] {
            min-height: 48px !important;
            min-width: 48px !important;
            padding: 12px 16px !important;
            font-size: 16px !important;
          }
          
          /* Form optimizations */
          input, textarea, select {
            min-height: 48px !important;
            font-size: 16px !important;
            padding: 12px !important;
            border-radius: 8px !important;
          }
          
          /* Table responsiveness */
          table {
            font-size: 14px !important;
          }
          
          td, th {
            padding: 8px 4px !important;
            min-width: 80px !important;
          }
          
          /* Card layouts */
          .card {
            margin: 0.5rem !important;
            border-radius: 12px !important;
          }
          
          /* Navigation optimizations */
          .sidebar {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
          }
          
          /* Performance optimizations */
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
          }
          
          input, textarea {
            -webkit-user-select: text;
            user-select: text;
          }
        }
        
        /* Touch device specific */
        @media (hover: none) and (pointer: coarse) {
          .hover-effects:hover {
            transform: scale(1.02) !important;
            transition: transform 0.1s ease !important;
          }
        }
        
        /* Reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      
      document.head.appendChild(style);
      document.body.classList.add('mobile-optimized');

      // Optimize viewport
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.head.appendChild(viewport);
      }
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
      );

      // Add mobile-specific performance monitoring
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.duration > 100) {
            console.warn(`🐌 SHERLOCK v33.0: Slow mobile operation: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });
      
      if (typeof PerformanceObserver !== 'undefined') {
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      }

      return () => {
        if (style.parentNode) {
          document.head.removeChild(style);
        }
        observer.disconnect?.();
      };
    } else {
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
