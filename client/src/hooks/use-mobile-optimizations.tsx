
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // ✅ Essential mobile optimizations only
      
      // Optimize viewport and scrolling
      document.documentElement.style.scrollBehavior = 'smooth';
      document.documentElement.style.webkitOverflowScrolling = 'touch';
      
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

      // Essential mobile layout optimizations
      const style = document.createElement('style');
      style.textContent = `
        /* ✅ Essential Mobile Layout Optimizations */
        @media (max-width: 768px) {
          /* Responsive grid improvements */
          .grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          
          /* Touch-friendly interactive elements */
          button, .button, [role="button"] {
            min-height: 44px !important;
            min-width: 44px !important;
            padding: 10px 16px !important;
            font-size: 16px !important;
          }
          
          /* Form optimizations */
          input, textarea, select {
            min-height: 44px !important;
            font-size: 16px !important;
            padding: 10px 12px !important;
          }
          
          /* Card and container spacing */
          .stat-card, .admin-glass-card, .clay-card {
            margin: 0.5rem 0 !important;
            padding: 1rem !important;
          }
          
          /* Text readability */
          h1 { font-size: 1.5rem !important; }
          h2 { font-size: 1.25rem !important; }
          h3 { font-size: 1.125rem !important; }
          
          /* Table responsiveness */
          .table-responsive {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          /* Container padding */
          .container, .main-content {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
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
            `;
      
      document.head.appendChild(style);
      document.body.classList.add('mobile-optimized');

      return () => {
        if (style.parentNode) {
          document.head.removeChild(style);
        }
        document.body.classList.remove('mobile-optimized');
      };
    }
  }, [isMobile]);

  return {
    isMobile,
    touchOptimized: isMobile
  };
}
