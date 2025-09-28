
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Activity, Database, Clock, TrendingUp } from 'lucide-react';

interface AdminPerformanceMetrics {
  queryCount: number;
  avgResponseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  dbConnections: number;
  lastFinancialSync: string;
}

export function AdminPerformanceMonitor() {
  const [metrics, setMetrics] = useState<AdminPerformanceMetrics>({
    queryCount: 0,
    avgResponseTime: 0,
    memoryUsage: 260,
    cacheHitRate: 85,
    dbConnections: 5,
    lastFinancialSync: new Date().toISOString()
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/unified-financial/monitoring-status');
          const data = await response.json();
          
          setMetrics(prev => ({
            ...prev,
            queryCount: data.queryCount || 0,
            avgResponseTime: data.avgResponseTime || 0,
            memoryUsage: Math.round(data.memoryUsage || 260),
            cacheHitRate: data.cacheHitRate || 85,
            lastFinancialSync: data.lastSync || new Date().toISOString()
          }));
        } catch (error) {
          console.error('Admin monitoring error:', error);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const getPerformanceColor = (value: number, threshold: number, reverse = false) => {
    if (reverse) {
      return value <= threshold ? 'text-green-600' : 'text-red-600';
    }
    return value >= threshold ? 'text-green-600' : 'text-yellow-600';
  };

  return (
    <Card className="admin-performance-monitor">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 space-x-reverse">
          <Activity className="w-5 h-5" />
          <span>نظارت عملکرد پنل ادمین</span>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 rounded text-sm ${
              isMonitoring 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isMonitoring ? 'فعال' : 'غیرفعال'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Database className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium">کوئری DB</div>
              <div className={`text-lg font-bold ${getPerformanceColor(metrics.queryCount, 100, true)}`}>
                {metrics.queryCount}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Clock className="w-4 h-4 text-orange-600" />
            <div>
              <div className="text-sm font-medium">زمان پاسخ</div>
              <div className={`text-lg font-bold ${getPerformanceColor(metrics.avgResponseTime, 500, true)}`}>
                {metrics.avgResponseTime}ms
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <div>
              <div className="text-sm font-medium">Cache Hit</div>
              <div className={`text-lg font-bold ${getPerformanceColor(metrics.cacheHitRate, 80)}`}>
                {metrics.cacheHitRate}%
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Activity className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-medium">حافظه</div>
              <div className={`text-lg font-bold ${getPerformanceColor(metrics.memoryUsage, 400, true)}`}>
                {metrics.memoryUsage}MB
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              آخرین همگام‌سازی مالی
            </span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {new Date(metrics.lastFinancialSync).toLocaleString('fa-IR')}
          </div>
        </div>

        {metrics.queryCount > 100 && (
          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-sm text-yellow-800">
              ⚠️ تعداد کوئری بالا - بررسی cache optimization توصیه می‌شود
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
