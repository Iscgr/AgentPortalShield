
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Disable smooth scrolling on mobile for better performance
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Add mobile-specific classes for performance
      document.body.classList.add('mobile-optimized');
      
      // Disable hover effects on mobile
      const style = document.createElement('style');
      style.textContent = `
        @media (hover: none) {
          .admin-glass-card:hover,
          .stat-card:hover,
          .clay-card:hover,
          .admin-nav-item:hover,
          .clay-nav-item:hover {
            transform: none !important;
            box-shadow: inherit !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    } else {
      document.body.classList.remove('mobile-optimized');
      document.documentElement.style.scrollBehavior = '';
    }
  }, [isMobile]);

  return {
    isMobile,
    shouldReduceMotion: isMobile,
    shouldDisableAnimations: isMobile,
    touchOptimized: isMobile
  };
}
