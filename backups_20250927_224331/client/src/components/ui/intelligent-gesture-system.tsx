
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GesturePattern {
  type: 'swipe' | 'tap' | 'pinch' | 'pull';
  direction?: 'left' | 'right' | 'up' | 'down';
  confidence: number;
  timestamp: number;
  success: boolean;
  context: string;
}

interface IntelligentGestureProps {
  children: React.ReactNode;
  onGestureDetected?: (pattern: GesturePattern) => void;
  adaptiveThresholds?: boolean;
  learningEnabled?: boolean;
  className?: string;
}

export function IntelligentGestureSystem({
  children,
  onGestureDetected,
  adaptiveThresholds = true,
  learningEnabled = true,
  className = ''
}: IntelligentGestureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gesturePatterns, setGesturePatterns] = useState<GesturePattern[]>([]);
  const [adaptiveConfig, setAdaptiveConfig] = useState({
    swipeThreshold: 50,
    tapThreshold: 10,
    doubleClickThreshold: 300,
    gestureTimeout: 1000,
    confidenceThreshold: 0.7,
    learningRate: 0.1
  });
  const { toast } = useToast();

  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    startTime: 0,
    isActive: false,
    gestureType: null as string | null
  });

  // Bayesian Learning Algorithm for Gesture Optimization
  const updateGestureModel = useCallback((pattern: GesturePattern) => {
    if (!learningEnabled) return;

    setGesturePatterns(prev => {
      const newPatterns = [...prev, pattern].slice(-100); // Keep last 100 gestures
      
      // Calculate success rates for different gesture types
      const gestureStats = newPatterns.reduce((acc, p) => {
        const key = `${p.type}_${p.direction || 'none'}`;
        if (!acc[key]) acc[key] = { total: 0, successful: 0 };
        acc[key].total++;
        if (p.success) acc[key].successful++;
        return acc;
      }, {} as Record<string, { total: number; successful: number }>);

      // Adaptive threshold optimization using Bayesian inference
      if (adaptiveThresholds) {
        const swipeSuccessRate = gestureStats.swipe_left?.successful / gestureStats.swipe_left?.total || 0.5;
        const tapSuccessRate = gestureStats.tap_none?.successful / gestureStats.tap_none?.total || 0.5;

        setAdaptiveConfig(prev => ({
          ...prev,
          swipeThreshold: Math.max(30, Math.min(80, prev.swipeThreshold * (1 + prev.learningRate * (swipeSuccessRate - 0.8)))),
          tapThreshold: Math.max(5, Math.min(20, prev.tapThreshold * (1 + prev.learningRate * (tapSuccessRate - 0.8)))),
        }));
      }

      // Store learning data
      localStorage.setItem('gesturePatterns', JSON.stringify(newPatterns));
      localStorage.setItem('adaptiveConfig', JSON.stringify(adaptiveConfig));

      return newPatterns;
    });
  }, [learningEnabled, adaptiveThresholds, adaptiveConfig]);

  // Advanced Gesture Recognition Engine
  const recognizeGesture = useCallback((
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    duration: number
  ): GesturePattern | null => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Multi-factor gesture classification with confidence scoring
    let gestureType: 'swipe' | 'tap' | 'pinch' | 'pull' = 'tap';
    let direction: 'left' | 'right' | 'up' | 'down' | undefined;
    let confidence = 0;

    if (distance < adaptiveConfig.tapThreshold && duration < 200) {
      gestureType = 'tap';
      confidence = Math.min(1, (200 - duration) / 200 * (adaptiveConfig.tapThreshold - distance) / adaptiveConfig.tapThreshold);
    } else if (distance > adaptiveConfig.swipeThreshold) {
      gestureType = 'swipe';
      
      // Direction classification with confidence
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
        confidence = Math.min(1, absX / (absX + absY) * velocity / 100);
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
        confidence = Math.min(1, absY / (absX + absY) * velocity / 100);
      }
      
      // Boost confidence for clear directional gestures
      if (Math.max(absX, absY) / Math.min(absX, absY) > 2) {
        confidence *= 1.2;
      }
    } else if (deltaY < -adaptiveConfig.swipeThreshold && distance > adaptiveConfig.swipeThreshold * 1.5) {
      gestureType = 'pull';
      direction = 'up';
      confidence = Math.min(1, Math.abs(deltaY) / (adaptiveConfig.swipeThreshold * 2));
    }

    // Only return gestures above confidence threshold
    if (confidence < adaptiveConfig.confidenceThreshold) {
      return null;
    }

    return {
      type: gestureType,
      direction,
      confidence: Math.round(confidence * 100) / 100,
      timestamp: Date.now(),
      success: true, // Will be updated based on user feedback
      context: window.location.pathname
    };
  }, [adaptiveConfig]);

  // Touch Event Handlers with Intelligence
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchState({
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isActive: true,
        gestureType: null
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchState.isActive) return;

      const touch = e.changedTouches[0];
      const endTime = Date.now();
      const duration = endTime - touchState.startTime;

      const pattern = recognizeGesture(
        touchState.startX,
        touchState.startY,
        touch.clientX,
        touch.clientY,
        duration
      );

      if (pattern) {
        updateGestureModel(pattern);
        onGestureDetected?.(pattern);

        // Provide intelligent feedback
        if (pattern.confidence > 0.8) {
          toast({
            title: `حرکت ${pattern.type === 'swipe' ? 'کشیدن' : pattern.type === 'tap' ? 'ضربه' : 'کشیدن'} تشخیص داده شد`,
            description: `جهت: ${pattern.direction ? 
              (pattern.direction === 'left' ? 'چپ' :
               pattern.direction === 'right' ? 'راست' :
               pattern.direction === 'up' ? 'بالا' : 'پایین') : 'نامشخص'} | اطمینان: ${Math.round(pattern.confidence * 100)}%`,
            duration: 2000,
          });
        }
      }

      setTouchState(prev => ({ ...prev, isActive: false }));
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchState, recognizeGesture, updateGestureModel, onGestureDetected, toast]);

  // Load previous learning data
  useEffect(() => {
    const savedPatterns = localStorage.getItem('gesturePatterns');
    const savedConfig = localStorage.getItem('adaptiveConfig');
    
    if (savedPatterns) {
      setGesturePatterns(JSON.parse(savedPatterns));
    }
    
    if (savedConfig) {
      setAdaptiveConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Performance monitoring for gesture system
  useEffect(() => {
    const logGestureEvent = (pattern: GesturePattern) => {
      const gestureEvents = JSON.parse(localStorage.getItem('gestureEvents') || '[]');
      gestureEvents.push({
        ...pattern,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: Date.now()
      });
      
      // Keep only last 50 events
      localStorage.setItem('gestureEvents', JSON.stringify(gestureEvents.slice(-50)));
    };

    if (gesturePatterns.length > 0) {
      logGestureEvent(gesturePatterns[gesturePatterns.length - 1]);
    }
  }, [gesturePatterns]);

  return (
    <div
      ref={containerRef}
      className={`intelligent-gesture-container ${className}`}
      style={{
        touchAction: 'pan-y pinch-zoom',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {children}
      
      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 left-4 p-2 bg-black/80 text-white text-xs rounded z-50">
          <div>Gestures: {gesturePatterns.length}</div>
          <div>Swipe Threshold: {Math.round(adaptiveConfig.swipeThreshold)}px</div>
          <div>Confidence: {adaptiveConfig.confidenceThreshold}</div>
          {gesturePatterns.length > 0 && (
            <div>Last: {gesturePatterns[gesturePatterns.length - 1]?.type} ({Math.round(gesturePatterns[gesturePatterns.length - 1]?.confidence * 100)}%)</div>
          )}
        </div>
      )}
    </div>
  );
}

export default IntelligentGestureSystem;
