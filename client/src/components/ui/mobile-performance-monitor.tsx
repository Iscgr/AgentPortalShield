
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Wifi, Battery, Smartphone } from 'lucide-react';

export function MobilePerformanceMonitor() {
  const [performanceData, setPerformanceData] = useState({
    loadTime: 0,
    networkSpeed: 'unknown',
    memoryUsage: 0,
    batteryLevel: 0,
    isOnline: navigator.onLine,
    deviceType: 'unknown'
  });

  useEffect(() => {
    // Measure page load performance
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      
      setPerformanceData(prev => ({
        ...prev,
        loadTime: Math.round(loadTime)
      }));
    };

    // Detect network connection
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setPerformanceData(prev => ({
          ...prev,
          networkSpeed: connection.effectiveType || 'unknown'
        }));
      }
    };

    // Monitor memory usage (if available)
    const updateMemoryInfo = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        setPerformanceData(prev => ({
          ...prev,
          memoryUsage: Math.round(usage)
        }));
      }
    };

    // Monitor battery (if available)
    const updateBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setPerformanceData(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }));
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };

    // Detect device type
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent;
      let deviceType = 'desktop';
      
      if (/Android/i.test(userAgent)) {
        deviceType = 'android';
      } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = 'ios';
      } else if (window.matchMedia('(max-width: 768px)').matches) {
        deviceType = 'mobile';
      }
      
      setPerformanceData(prev => ({
        ...prev,
        deviceType
      }));
    };

    // Monitor online status
    const handleOnline = () => setPerformanceData(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPerformanceData(prev => ({ ...prev, isOnline: false }));

    // Initial measurements
    setTimeout(measurePerformance, 1000);
    updateNetworkInfo();
    updateMemoryInfo();
    updateBatteryInfo();
    detectDeviceType();

    // Set up periodic updates
    const interval = setInterval(() => {
      updateMemoryInfo();
      updateNetworkInfo();
    }, 5000);

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPerformanceColor = (value: number, type: 'load' | 'memory') => {
    if (type === 'load') {
      if (value < 1000) return 'bg-green-500';
      if (value < 3000) return 'bg-yellow-500';
      return 'bg-red-500';
    } else {
      if (value < 50) return 'bg-green-500';
      if (value < 80) return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  const getNetworkIcon = () => {
    switch (performanceData.networkSpeed) {
      case '4g':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case '3g':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case '2g':
        return <Wifi className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card className="mobile-performance-monitor">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 space-x-reverse text-sm">
          <Activity className="w-4 h-4" />
          <span>عملکرد موبایل</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Smartphone className="w-4 h-4" />
            <span className="text-sm">دستگاه:</span>
          </div>
          <Badge variant={performanceData.deviceType === 'android' || performanceData.deviceType === 'ios' ? 'default' : 'secondary'}>
            {performanceData.deviceType === 'android' ? 'اندروید' :
             performanceData.deviceType === 'ios' ? 'iOS' :
             performanceData.deviceType === 'mobile' ? 'موبایل' : 'دسکتاپ'}
          </Badge>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            {getNetworkIcon()}
            <span className="text-sm">شبکه:</span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Badge variant={performanceData.isOnline ? 'default' : 'destructive'}>
              {performanceData.isOnline ? 'آنلاین' : 'آفلاین'}
            </Badge>
            {performanceData.networkSpeed !== 'unknown' && (
              <Badge variant="outline">
                {performanceData.networkSpeed.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Load Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">زمان بارگذاری:</span>
            <Badge className={getPerformanceColor(performanceData.loadTime, 'load')}>
              {performanceData.loadTime}ms
            </Badge>
          </div>
          <Progress 
            value={Math.min((performanceData.loadTime / 5000) * 100, 100)} 
            className="h-2"
          />
        </div>

        {/* Memory Usage */}
        {performanceData.memoryUsage > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">استفاده از حافظه:</span>
              <Badge className={getPerformanceColor(performanceData.memoryUsage, 'memory')}>
                {performanceData.memoryUsage}%
              </Badge>
            </div>
            <Progress value={performanceData.memoryUsage} className="h-2" />
          </div>
        )}

        {/* Battery Level */}
        {performanceData.batteryLevel > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Battery className="w-4 h-4" />
              <span className="text-sm">باتری:</span>
            </div>
            <Badge variant={performanceData.batteryLevel > 20 ? 'default' : 'destructive'}>
              {performanceData.batteryLevel}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MobilePerformanceMonitor;
