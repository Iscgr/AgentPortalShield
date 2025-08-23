
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Smartphone, 
  Settings,
  X,
  Minimize2
} from 'lucide-react';
import MobilePWAManager from './mobile-pwa-manager';
import MobilePerformanceMonitor from './mobile-performance-monitor';
import AdaptiveMobileManager from './adaptive-mobile-manager';
import { useMobileOptimizations } from '@/hooks/use-mobile-optimizations';

export function MobileOptimizationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const { isMobile } = useMobileOptimizations();

  // Don't render if not mobile
  if (!isMobile || !isVisible) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-30 max-w-sm mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="mobile-pwa-card border border-blue-500/20 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 space-x-reverse text-sm">
                <Smartphone className="w-4 h-4" />
                <span>بهینه‌سازی موبایل</span>
                <Badge variant="outline" className="text-xs">
                  ATOMOS v5.0
                </Badge>
              </CardTitle>
              
              <div className="flex items-center space-x-1 space-x-reverse">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setIsVisible(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {!isMinimized && (
                <>
                  {/* Compact Mobile PWA Manager */}
                  <div className="border rounded-lg p-2">
                    <MobilePWAManager />
                  </div>

                  {/* Compact Performance Monitor */}
                  <div className="border rounded-lg p-2">
                    <MobilePerformanceMonitor />
                  </div>

                  {/* Compact Adaptive Manager */}
                  <div className="border rounded-lg p-2">
                    <AdaptiveMobileManager />
                  </div>
                </>
              )}

              {/* Quick Actions */}
              <div className="flex justify-between items-center pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="flex-1 mr-2"
                >
                  <Settings className="w-3 h-3 ml-1" />
                  {isMinimized ? 'نمایش جزئیات' : 'کاهش جزئیات'}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="text-red-500 hover:text-red-700"
                >
                  بستن
                </Button>
              </div>

              {/* Restoration Button (Hidden by default, shows when closed) */}
              {!isVisible && (
                <div className="fixed bottom-4 right-4 z-40">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setIsVisible(true)}
                    className="shadow-lg"
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Floating restore button when panel is hidden */}
      {!isVisible && (
        <div className="fixed bottom-20 right-4 z-40">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => {
              setIsVisible(true);
              setIsOpen(true);
            }}
            className="shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Smartphone className="w-4 h-4 ml-1" />
            بهینه‌سازی
          </Button>
        </div>
      )}
    </div>
  );
}

export default MobileOptimizationPanel;
