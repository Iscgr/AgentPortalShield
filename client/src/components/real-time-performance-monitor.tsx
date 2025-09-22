
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { toPersianDigits } from '@/lib/persian-date';

interface PerformanceMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    uptime: number;
  };
  database: {
    connectionCount: number;
    queryTime: number;
    cacheHitRate: number;
    activeQueries: number;
  };
  application: {
    responseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    activeUsers: number;
  };
  alerts: Array<{
    id: string;
    type: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  trends: {
    last24Hours: Array<{
      timestamp: string;
      cpuUsage: number;
      memoryUsage: number;
      responseTime: number;
    }>;
  };
}

export function RealTimePerformanceMonitor() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: metrics, isLoading, error } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/system/performance-metrics'],
    queryFn: () => apiRequest('/api/system/performance-metrics'),
    refetchInterval: 2000, // هر 2 ثانیه به‌روزرسانی
    onSuccess: () => {
      setLastUpdate(new Date());
      setIsConnected(true);
    },
    onError: () => {
      setIsConnected(false);
    }
  });

  // Simple chart rendering for trends
  useEffect(() => {
    if (metrics?.trends.last24Hours && chartRef.current) {
      const canvas = chartRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw CPU trend line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const points = metrics.trends.last24Hours.slice(-50); // Last 50 points
      points.forEach((point, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - (point.cpuUsage / 100) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw memory trend line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      points.forEach((point, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - (point.memoryUsage / 100) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          خطا در دریافت اطلاعات عملکرد سیستم. اتصال به سرور قطع شده است.
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-100';
    if (value >= thresholds.warning) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (value >= thresholds.warning) return <Clock className="w-4 h-4 text-orange-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Activity className="w-8 h-8 mr-3 text-green-600" />
            نظارت عملکرد لحظه‌ای
          </h1>
          <div className="flex items-center mt-2 space-x-4 space-x-reverse">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'متصل' : 'قطع شده'}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              آخرین به‌روزرسانی: {toPersianDigits(lastUpdate.toLocaleTimeString('fa-IR'))}
            </span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.filter(alert => !alert.resolved).slice(0, 3).map((alert) => (
            <Alert 
              key={alert.id} 
              className={
                alert.type === 'ERROR' ? 'border-red-200 bg-red-50' :
                alert.type === 'WARNING' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }
            >
              {alert.type === 'ERROR' ? <AlertTriangle className="h-4 w-4" /> :
               alert.type === 'WARNING' ? <Clock className="h-4 w-4" /> :
               <CheckCircle className="h-4 w-4" />}
              <AlertDescription className="flex items-center justify-between">
                <span>{alert.message}</span>
                <span className="text-xs">
                  {toPersianDigits(new Date(alert.timestamp).toLocaleTimeString('fa-IR'))}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-blue-600" />
                <span className="font-medium">CPU</span>
              </div>
              {getStatusIcon(metrics.system.cpuUsage, { warning: 70, critical: 90 })}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">استفاده</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.system.cpuUsage.toString())}%
                </span>
              </div>
              <Progress value={metrics.system.cpuUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-green-600" />
                <span className="font-medium">حافظه</span>
              </div>
              {getStatusIcon(metrics.system.memoryUsage, { warning: 80, critical: 95 })}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">استفاده</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.system.memoryUsage.toString())}%
                </span>
              </div>
              <Progress value={metrics.system.memoryUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-purple-600" />
                <span className="font-medium">دیتابیس</span>
              </div>
              {getStatusIcon(metrics.database.queryTime, { warning: 100, critical: 500 })}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">زمان Query</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.database.queryTime.toString())}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">اتصالات فعال</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.database.connectionCount.toString())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Wifi className="w-5 h-5 mr-2 text-orange-600" />
                <span className="font-medium">شبکه</span>
              </div>
              {getStatusIcon(metrics.system.networkLatency, { warning: 100, critical: 300 })}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">تأخیر</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.system.networkLatency.toString())}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">RPS</span>
                <span className="text-sm font-bold">
                  {toPersianDigits(metrics.application.requestsPerSecond.toString())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                زمان پاسخ
              </h3>
              <Badge className={getStatusColor(metrics.application.responseTime, { warning: 500, critical: 1000 })}>
                {toPersianDigits(metrics.application.responseTime.toString())}ms
              </Badge>
            </div>
            <Progress value={Math.min(metrics.application.responseTime / 10, 100)} className="mb-2" />
            <p className="text-sm text-gray-600">
              میانگین زمان پاسخ سرور
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                کاربران فعال
              </h3>
              <Badge className="bg-blue-100 text-blue-800">
                {toPersianDigits(metrics.application.activeUsers.toString())}
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {toPersianDigits(metrics.application.activeUsers.toString())}
              </p>
              <p className="text-sm text-gray-600">کاربر آنلاین</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                نرخ خطا
              </h3>
              <Badge className={getStatusColor(metrics.application.errorRate, { warning: 1, critical: 5 })}>
                {toPersianDigits(metrics.application.errorRate.toFixed(2))}%
              </Badge>
            </div>
            <Progress value={metrics.application.errorRate * 20} className="mb-2" />
            <p className="text-sm text-gray-600">
              درصد درخواست‌های ناموفق
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            نمودار روند عملکرد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={chartRef}
              width={800}
              height={200}
              className="w-full h-48 border rounded"
            />
            <div className="flex items-center justify-center mt-4 space-x-6 space-x-reverse">
              <div className="flex items-center">
                <div className="w-4 h-1 bg-blue-500 mr-2"></div>
                <span className="text-sm">CPU</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-1 bg-green-500 mr-2"></div>
                <span className="text-sm">حافظه</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            آمار دیتابیس
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {toPersianDigits(metrics.database.cacheHitRate.toString())}%
              </p>
              <Progress value={metrics.database.cacheHitRate} className="mt-2" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Query های فعال</p>
              <p className="text-2xl font-bold text-blue-600">
                {toPersianDigits(metrics.database.activeQueries.toString())}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">اتصالات فعال</p>
              <p className="text-2xl font-bold text-purple-600">
                {toPersianDigits(metrics.database.connectionCount.toString())}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">زمان Query میانگین</p>
              <p className="text-2xl font-bold text-orange-600">
                {toPersianDigits(metrics.database.queryTime.toString())}ms
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RealTimePerformanceMonitor;
