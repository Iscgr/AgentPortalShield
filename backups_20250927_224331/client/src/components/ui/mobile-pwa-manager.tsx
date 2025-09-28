
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Wifi, WifiOff, Smartphone, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PWAManagerProps {
  className?: string;
}

export function MobilePWAManager({ className }: PWAManagerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppChrome = (window.navigator as any).standalone === true;
    setIsInstalled(isInStandaloneMode || isInWebAppChrome);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "نصب موفق",
        description: "MarFaNet CRM با موفقیت نصب شد",
      });
      setIsInstallable(false);
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "اطلاع‌رسانی فعال شد",
          description: "اطلاع‌رسانی‌های مهم دریافت خواهید کرد",
        });
      }
    }
  };

  if (isInstalled) {
    return (
      <Card className={`mobile-pwa-card ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Smartphone className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">نصب شده</span>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isOnline ? 'آنلاین' : 'آفلاین'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mobile-pwa-card ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              {isOnline ? 'متصل' : 'آفلاین'}
            </span>
          </div>
          
          {isInstallable && (
            <Button
              onClick={handleInstallApp}
              size="sm"
              className="flex items-center space-x-1 space-x-reverse"
            >
              <Download className="w-4 h-4" />
              <span>نصب اپ</span>
            </Button>
          )}
        </div>

        {isOnline && (
          <Button
            onClick={requestNotificationPermission}
            variant="outline"
            size="sm"
            className="w-full flex items-center space-x-2 space-x-reverse"
          >
            <Bell className="w-4 h-4" />
            <span>فعال‌سازی اطلاع‌رسانی</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default MobilePWAManager;
