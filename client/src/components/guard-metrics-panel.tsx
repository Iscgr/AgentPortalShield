import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface GuardMetricsSnapshot {
  counters: Record<string, number>;
  recent: { type: string; timestamp: number; context?: any }[];
}

interface GuardMetricsApiResponse extends GuardMetricsSnapshot {
  persistence?: {
    state: string;
    summary?: {
      lastHour: Record<string, number>;
      lastDay: Record<string, number>;
    } | null;
  };
}

// کوچک نگه داشتن اندازه نمایش برای جلوگیری از سنگینی UI
const MAX_RECENT = 25;

export const GuardMetricsPanel: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<GuardMetricsApiResponse>({
    queryKey: ['/api/allocations/guard-metrics'],
    queryFn: async () => {
      const res:any = await apiRequest('/allocations/guard-metrics');
      // پاسخ جدید: { success, data: snapshot, persistence }
      if (res?.data && res?.persistence) {
        return { ...res.data, persistence: res.persistence };
      }
      return res?.data || res;
    },
    refetchInterval: 30000, // هر ۳۰ ثانیه بروزرسانی خودکار سبک
    staleTime: 15000
  });

  const countersEntries = React.useMemo(() => {
    if (!data) return [] as [string, number][];
    return Object.entries(data.counters).sort((a,b) => b[1]-a[1]);
  }, [data]);

  return (
    <Card className="border-purple-300/60 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <ShieldAlert className="w-4 h-4 ml-2 text-purple-600 dark:text-purple-300" />
          متریک‌های نگهبان تخصیص (Slice 5/6)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ml-1 ${isFetching ? 'animate-spin' : ''}`} />
          بروزرسانی
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {error && (
          <div className="text-red-600 text-xs">خطا در دریافت متریک‌ها</div>
        )}
        {(!isLoading && data) && (
          <>
            {countersEntries.length === 0 && (
              <div className="text-xs text-green-600 bg-green-100/70 dark:bg-green-900/30 p-2 rounded">
                هنوز هیچ تخلفی ثبت نشده است.
              </div>
            )}
            {countersEntries.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2">شمارنده‌ها</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countersEntries.map(([k,v]) => (
                    <div key={k} className="p-2 rounded border bg-white/60 dark:bg-white/5 text-xs flex flex-col">
                      <span className="font-mono truncate" title={k}>{k}</span>
                      <span className="mt-1 font-bold text-purple-700 dark:text-purple-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mt-4 mb-2">
                <div className="text-xs font-semibold">آخرین رخدادها (حداکثر {MAX_RECENT})</div>
                {data.recent.length > MAX_RECENT && (
                  <div className="text-[10px] text-gray-500">نمایش {MAX_RECENT} مورد از {data.recent.length}</div>
                )}
              </div>
              <div className="max-h-60 overflow-auto rounded border bg-white/50 dark:bg-white/5 divide-y">
                {data.recent.slice(-MAX_RECENT).reverse().map((r, idx) => (
                  <div key={idx} className="p-2 text-[11px] flex justify-between items-center">
                    <span className="font-mono truncate" title={r.type}>{r.type}</span>
                    <span className="text-gray-500 ltr:font-mono" dir="ltr">{new Date(r.timestamp).toLocaleTimeString('fa-IR')}</span>
                  </div>
                ))}
                {data.recent.length === 0 && (
                  <div className="p-2 text-xs text-gray-500 text-center">موردی ثبت نشده</div>
                )}
              </div>
            </div>
            <div className="space-y-3 pt-2 border-t">
              {data.persistence && data.persistence.state !== 'off' && (
                <div className="text-[10px] text-purple-700 dark:text-purple-300">
                  حالت Persistence: {data.persistence.state === 'shadow' ? 'Shadow (ثبت اما نمایش summary محدود)' : data.persistence.state === 'enforce' ? 'Enforce (نمایش summary)' : data.persistence.state}
                </div>
              )}
              {data.persistence?.state === 'enforce' && data.persistence?.summary && (
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-2 rounded bg-white/50 dark:bg-white/5 border">
                    <div className="text-[11px] font-semibold mb-1">۱ ساعت اخیر</div>
                    <div className="space-y-1 max-h-36 overflow-auto">
                      {Object.entries(data.persistence.summary.lastHour).length === 0 && (
                        <div className="text-[10px] text-gray-400">خالی</div>
                      )}
                      {Object.entries(data.persistence.summary.lastHour).map(([k,v]) => (
                        <div key={k} className="flex justify-between text-[11px]"><span className="truncate" title={k}>{k}</span><span className="font-mono">{v}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white/50 dark:bg-white/5 border">
                    <div className="text-[11px] font-semibold mb-1">۲۴ ساعت اخیر</div>
                    <div className="space-y-1 max-h-36 overflow-auto">
                      {Object.entries(data.persistence.summary.lastDay).length === 0 && (
                        <div className="text-[10px] text-gray-400">خالی</div>
                      )}
                      {Object.entries(data.persistence.summary.lastDay).map(([k,v]) => (
                        <div key={k} className="flex justify-between text-[11px]"><span className="truncate" title={k}>{k}</span><span className="font-mono">{v}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="text-[10px] text-gray-400">
                در حالت off فقط داده در حافظه؛ shadow ذخیره در DB بدون summary؛ enforce شامل summary.
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GuardMetricsPanel;
