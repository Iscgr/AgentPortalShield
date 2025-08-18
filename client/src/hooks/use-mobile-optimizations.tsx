
import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimizations() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Keep smooth scrolling but optimize
      document.documentElement.style.scrollBehavior = 'smooth';
      
      // Add mobile-specific classes for performance
      document.body.classList.add('mobile-optimized');
      
      // Balanced hover effects for mobile - only disable problematic ones
      const style = document.createElement('style');
      style.textContent = `
        @media (hover: none) and (pointer: coarse) {
          .admin-glass-card:hover,
          .stat-card:hover,
          .clay-card:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
          }
          
          .admin-nav-item:hover,
          .clay-nav-item:hover {
            transform: translateX(-2px) !important;
            background: rgba(30, 41, 59, 0.4) !important;
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
    shouldReduceMotion: false, // Allow motion for better UX
    shouldDisableAnimations: false, // Keep animations for feedback
    touchOptimized: isMobile
  };
}
