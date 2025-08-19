
import { useState, useEffect } from 'react';

interface MobileCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasReducedMotion: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function useMobileDetection(): MobileCapabilities {
  const [capabilities, setCapabilities] = useState<MobileCapabilities>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    isIOS: false,
    isAndroid: false,
    hasReducedMotion: false,
    orientation: 'landscape',
    screenSize: 'lg'
  });

  useEffect(() => {
    const detectCapabilities = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Screen size detection
      const screenSize = width < 480 ? 'xs' : 
                        width < 768 ? 'sm' : 
                        width < 1024 ? 'md' : 
                        width < 1280 ? 'lg' : 'xl';
      
      // Device type detection
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      // Touch capability
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // OS detection
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      
      // Motion preference
      const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Orientation
      const orientation = height > width ? 'portrait' : 'landscape';
      
      setCapabilities({
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        isIOS,
        isAndroid,
        hasReducedMotion,
        orientation,
        screenSize
      });
    };

    // Initial detection
    detectCapabilities();

    // Listen for changes
    const handleResize = () => detectCapabilities();
    const handleOrientationChange = () => setTimeout(detectCapabilities, 100);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return capabilities;
}
