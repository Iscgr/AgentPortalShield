import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Users, FileText, DollarSign, CreditCard } from 'lucide-react';
import { UnifiedStatCard, UnifiedStatCardSkeleton, UnifiedStatGrid } from '@/components/unified-stat-card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * FinancialSummaryPanel
 * نسخه اولیه ریفکتور کارت‌های خلاصه مالی جهت جلوگیری از چندین کوئری تکراری،
 * استفاده از یک منبع داده واحد و محاسبه‌ی مشتقات با useMemo.
 * تمرکز: کاهش رندرهای غیرضروری، جداسازی مسئولیت از صفحه داشبورد.
 */
export const FinancialSummaryPanel = React.memo(function FinancialSummaryPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['financial-summary-v1'],
    queryFn: () => apiRequest('/dashboard'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    select: (raw: any) => {
      const summary = raw?.data?.summary || raw?.summary || raw?.value || raw;
      const representatives = raw?.data?.representatives || {};
      const invoices = raw?.data?.invoices || {};
      return {
        totalRevenue: parseFloat(summary?.totalSystemPaid || '0') || 0,
        totalDebt: parseFloat(summary?.totalSystemDebt || summary?.totalDebt || '0') || 0,
        totalCredit: parseFloat(summary?.totalCredit || '0') || 0,
        totalOutstanding: parseFloat(summary?.totalOutstanding || '0') || 0,
        totalRepresentatives: parseInt(summary?.totalRepresentatives || representatives?.total || '0') || 0,
        activeRepresentatives: parseInt(summary?.activeRepresentatives || representatives?.active || '0') || 0,
        overdueInvoices: parseInt(summary?.overdueInvoices || invoices?.overdue || '0') || 0,
        paidInvoices: parseInt(summary?.paidInvoices || invoices?.paid || '0') || 0,
        unpaidInvoices: parseInt(summary?.unpaidInvoices || invoices?.unpaid || '0') || 0,
        systemIntegrityScore: parseInt(summary?.systemIntegrityScore || '0') || 0,
        cacheStatus: summary?.cacheStatus || 'UNKNOWN',
        lastUpdated: summary?.lastUpdated || new Date().toISOString()
      };
    }
  });

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'totalRevenue',
        title: 'کل دریافت‌ها',
        value: data.totalRevenue,
        icon: DollarSign,
        color: 'green' as const,
        format: 'currency' as const,
        subtitle: 'تجمع پرداخت ثبت‌شده'
      },
      {
        key: 'totalDebt',
        title: 'کل بدهی سیستم',
        value: data.totalDebt,
        icon: CreditCard,
        color: 'red' as const,
        format: 'currency' as const,
        subtitle: 'پس از کسر پرداخت‌ها'
      },
      {
        key: 'overdueInvoices',
        title: 'فاکتورهای معوق',
        value: data.overdueInvoices,
        icon: AlertTriangle,
        color: data.overdueInvoices > 0 ? 'orange' as const : 'green' as const,
        format: 'number' as const,
        subtitle: data.overdueInvoices > 0 ? 'نیاز به پیگیری' : 'بدون تأخیر'
      },
      {
        key: 'activeRepresentatives',
        title: 'نمایندگان فعال',
        value: data.activeRepresentatives,
        icon: Users,
        color: 'blue' as const,
        format: 'number' as const,
        subtitle: `کل: ${data.totalRepresentatives}`
      },
      {
        key: 'systemIntegrityScore',
        title: 'امتیاز سلامت',
        value: data.systemIntegrityScore,
        icon: TrendingUp,
        color: 'purple' as const,
        format: 'number' as const,
        subtitle: data.cacheStatus === 'HEALTHY' ? 'کش پایدار' : 'بازبینی کش'
      }
    ];
  }, [data]);

  if (isLoading) {
    return (
      <section aria-label="خلاصه مالی" className="space-y-4">
        <UnifiedStatGrid columns={5}>
          {Array.from({ length: 5 }).map((_, i) => <UnifiedStatCardSkeleton key={i} size="md" />)}
        </UnifiedStatGrid>
      </section>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-red-500 border border-red-300 rounded p-3 bg-red-50 dark:bg-red-900/20" role="alert">
        خطا در دریافت خلاصه مالی
      </div>
    );
  }

  return (
    <section aria-label="خلاصه مالی" className="space-y-4">
      <UnifiedStatGrid columns={5}>
        {cards.map(card => (
          <UnifiedStatCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            colorScheme={card.color}
            format={card.format as any}
            subtitle={card.subtitle}
            size="md"
          />
        ))}
      </UnifiedStatGrid>
      <p className="text-xs text-muted-foreground text-right" dir="rtl">آخرین بروزرسانی: {new Date(data.lastUpdated).toLocaleString('fa-IR')}</p>
    </section>
  );
});

export default FinancialSummaryPanel;
