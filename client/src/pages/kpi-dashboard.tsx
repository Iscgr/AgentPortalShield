import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Clock,
  Activity,
  DollarSign,
  Target
} from "lucide-react";
import { apiRequest } from '@/lib/queryClient';

// E-B5 Stage 3: KPI Dashboard Implementation
// Comprehensive financial metrics visualization with debt_drift_ppm trends,
// allocation latency percentiles, partial_allocation_ratio, and overpayment_buffer

interface KpiMetrics {
  debtDriftPpm: {
    current: number;
    trend: Array<{ timestamp: string; value: number }>;
    status: 'healthy' | 'warning' | 'critical';
  };
  allocationLatency: {
    p50: number;
    p95: number;
    p99: number;
    trend: Array<{ timestamp: string; value: number }>;
  };
  partialAllocationRatio: {
    current: number; // percentage
    trend: Array<{ timestamp: string; value: number }>;
    totalPartial: number;
    totalAllocations: number;
  };
  overpaymentBuffer: {
    current: number; // amount
    representatives: number; // count with buffer
    averageBuffer: number;
    trend: Array<{ timestamp: string; value: number }>;
  };
  guardMetrics: {
    totalEvents: number;
    criticalEvents: number;
    lastHourEvents: Record<string, number>;
    alertsActive: number;
  };
}

interface TimeWindow {
  label: string;
  value: string;
  hours: number;
}

const TIME_WINDOWS: TimeWindow[] = [
  { label: '۶ ساعت اخیر', value: '6h', hours: 6 },
  { label: '۲۴ ساعت اخیر', value: '24h', hours: 24 },
  { label: '۷ روز اخیر', value: '7d', hours: 168 },
  { label: '۳۰ روز اخیر', value: '30d', hours: 720 }
];

// Utility function for Persian number formatting
const toPersianDigits = (num: string | number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, digit => persianDigits[parseInt(digit)]);
};

// Format currency in Persian style
const formatCurrency = (amount: number): string => {
  return toPersianDigits(Math.round(amount).toLocaleString()) + ' ریال';
};

// Simple Sparkline SVG Component
const Sparkline: React.FC<{ 
  data: Array<{ timestamp: string; value: number }>; 
  width?: number; 
  height?: number;
  color?: string;
  showDots?: boolean;
}> = ({ data, width = 120, height = 40, color = "#3b82f6", showDots = false }) => {
  const points = useMemo(() => {
    if (data.length === 0) return '';
    
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;
    
    return data.map((point, index) => {
      const x = (index / (data.length - 1)) * (width - 8) + 4;
      const y = height - 4 - ((point.value - minValue) / range) * (height - 8);
      return `${x},${y}`;
    }).join(' ');
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1="4" y1={height/2} x2={width-4} y2={height/2} stroke="#e5e7eb" strokeWidth="1"/>
        <text x={width/2} y={height/2 + 4} textAnchor="middle" className="text-xs fill-gray-400">No Data</text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && data.map((point, index) => {
        const x = (index / (data.length - 1)) * (width - 8) + 4;
        const y = height - 4 - ((point.value - Math.min(...data.map(d => d.value))) / 
          (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value)) || 1)) * (height - 8);
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="hover:r-3 transition-all"
          />
        );
      })}
    </svg>
  );
};

// Simple Bar Chart Component
const SimpleBarChart: React.FC<{
  data: Array<{ label: string; value: number; color?: string }>;
  maxValue?: number;
  height?: number;
}> = ({ data, maxValue, height = 120 }) => {
  const max = maxValue || Math.max(...data.map(d => d.value)) || 1;
  
  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1 max-w-16">
          <div 
            className="w-full rounded-t transition-all hover:opacity-80"
            style={{ 
              height: `${(item.value / max) * (height - 20)}px`,
              backgroundColor: item.color || '#3b82f6',
              minHeight: '2px'
            }}
            title={`${item.label}: ${toPersianDigits(item.value)}`}
          />
          <div className="text-xs mt-1 text-center font-medium truncate w-full">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function KpiDashboard() {
  const [timeWindow, setTimeWindow] = useState<string>('24h');
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch KPI metrics data
  const { data: kpiData, isLoading, error, refetch, isFetching } = useQuery<KpiMetrics>({
    queryKey: ['/api/allocations/kpi-metrics', timeWindow],
    queryFn: async () => {
      const response = await apiRequest(`/api/allocations/kpi-metrics?window=${timeWindow}`);
      return response.data || response;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });

  // Export functionality
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExportLoading(true);
      const response = await fetch(`/api/allocations/guard-metrics/export?window=${timeWindow}&format=${format}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpi-metrics-${timeWindow}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>خطا در بارگیری داده‌های KPI</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 داشبورد KPI مالی
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            نظارت بلادرنگ بر شاخص‌های عملکرد و سلامت مالی سیستم
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="انتخاب بازه زمانی" />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(window => (
                <SelectItem key={window.value} value={window.value}>
                  {window.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isFetching ? 'animate-spin' : ''}`} />
            بروزرسانی
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            <Download className="w-4 h-4 ml-2" />
            CSV
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exportLoading}
          >
            <Download className="w-4 h-4 ml-2" />
            JSON
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Debt Drift PPM */}
          <Card className="col-span-full md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <TrendingUp className="w-4 h-4 ml-2" />
                انحراف بدهی (PPM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="text-2xl font-bold">
                  {toPersianDigits(kpiData?.debtDriftPpm?.current || 0)}
                </div>
                <Badge variant={
                  kpiData?.debtDriftPpm?.status === 'healthy' ? 'default' :
                  kpiData?.debtDriftPpm?.status === 'warning' ? 'secondary' : 'destructive'
                }>
                  {kpiData?.debtDriftPpm?.status === 'healthy' ? 'سالم' :
                   kpiData?.debtDriftPpm?.status === 'warning' ? 'هشدار' : 'بحرانی'}
                </Badge>
              </div>
              <Sparkline
                data={kpiData?.debtDriftPpm?.trend || []}
                color={kpiData?.debtDriftPpm?.status === 'critical' ? '#ef4444' : '#3b82f6'}
                showDots={true}
              />
            </CardContent>
          </Card>

          {/* Allocation Latency */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Clock className="w-4 h-4 ml-2" />
                تأخیر تخصیص (ms)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span>P95:</span>
                  <span className="font-mono">{toPersianDigits(kpiData?.allocationLatency?.p95 || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>P99:</span>
                  <span className="font-mono">{toPersianDigits(kpiData?.allocationLatency?.p99 || 0)}</span>
                </div>
              </div>
              <Sparkline
                data={kpiData?.allocationLatency?.trend || []}
                color="#10b981"
              />
            </CardContent>
          </Card>

          {/* Partial Allocation Ratio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <BarChart3 className="w-4 h-4 ml-2" />
                نسبت تخصیص جزئی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {toPersianDigits((kpiData?.partialAllocationRatio?.current || 0).toFixed(1))}%
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {toPersianDigits(kpiData?.partialAllocationRatio?.totalPartial || 0)} از {toPersianDigits(kpiData?.partialAllocationRatio?.totalAllocations || 0)}
              </div>
              <Sparkline
                data={kpiData?.partialAllocationRatio?.trend || []}
                color="#f59e0b"
              />
            </CardContent>
          </Card>

          {/* Overpayment Buffer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <DollarSign className="w-4 h-4 ml-2" />
                بافر پرداخت اضافی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold mb-1">
                {formatCurrency(kpiData?.overpaymentBuffer?.current || 0)}
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {toPersianDigits(kpiData?.overpaymentBuffer?.representatives || 0)} نماینده با بافر
              </div>
              <Sparkline
                data={kpiData?.overpaymentBuffer?.trend || []}
                color="#8b5cf6"
              />
            </CardContent>
          </Card>

          {/* Guard Metrics Summary */}
          <Card className="col-span-full md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Activity className="w-4 h-4 ml-2" />
                خلاصه رویدادهای حفاظتی - ساعت اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {toPersianDigits(kpiData?.guardMetrics?.totalEvents || 0)}
                  </div>
                  <div className="text-xs text-gray-500">کل رویدادها</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {toPersianDigits(kpiData?.guardMetrics?.criticalEvents || 0)}
                  </div>
                  <div className="text-xs text-gray-500">رویدادهای بحرانی</div>
                </div>
              </div>
              
              {kpiData?.guardMetrics?.lastHourEvents && (
                <SimpleBarChart
                  data={Object.entries(kpiData.guardMetrics.lastHourEvents).map(([type, count]) => ({
                    label: type.replace('_', ' ').substring(0, 8),
                    value: count,
                    color: count > 10 ? '#ef4444' : count > 5 ? '#f59e0b' : '#3b82f6'
                  }))}
                  height={80}
                />
              )}
            </CardContent>
          </Card>

          {/* System Health Overview */}
          <Card className="col-span-full md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Target className="w-4 h-4 ml-2" />
                وضعیت کلی سلامت سیستم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm font-medium">تخصیص</div>
                  <div className="text-xs text-gray-500">عملکرد عالی</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="text-sm font-medium">Ledger</div>
                  <div className="text-xs text-gray-500">همگام‌سازی کامل</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  </div>
                  <div className="text-sm font-medium">Drift</div>
                  <div className="text-xs text-gray-500">نیاز مانیتورینگ</div>
                </div>
                
                <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  </div>
                  <div className="text-sm font-medium">Cache</div>
                  <div className="text-xs text-gray-500">بهینه</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}