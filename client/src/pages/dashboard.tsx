import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  AlertTriangle,
  Users,
  FileText,
  Upload,
  Bot,
  DollarSign,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceUpload from "@/components/invoice-upload";
import AiChat from "@/components/ai-chat";
// SHERLOCK v10.0 NEW COMPONENT: Debtor Representatives Table (now replaced by OverdueInvoicesCard)
// import DebtorRepresentativesCard from "@/components/debtor-representatives-card";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface DashboardData {
  totalRevenue: number;
  totalDebt: number;
  totalCredit: number;
  totalOutstanding: number;
  totalRepresentatives: number;
  activeRepresentatives: number;
  inactiveRepresentatives: number;
  riskRepresentatives: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  unsentTelegramInvoices: number;
  totalSalesPartners: number;
  activeSalesPartners: number;
  systemIntegrityScore: number;
  lastReconciliationDate: string;
  problematicRepresentativesCount: number;
  responseTime: number;
  cacheStatus: string;
  lastUpdated: string;
}



// Placeholder for UnifiedStatCard - assuming it's defined elsewhere and used for generic stats
function UnifiedStatCard({ title, statKey, endpoint, icon, formatter, color }: { title: string; statKey: keyof DashboardData | 'totalSystemDebt'; endpoint: string; icon: React.ReactNode; formatter: string; color: string }) {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => apiRequest(endpoint),
    select: (data: any) => data?.value || data
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  let displayValue: React.ReactNode = "-";
  const rawValue = dashboardData?.[statKey];

  if (rawValue !== undefined && rawValue !== null) {
    if (formatter === "currency") {
      displayValue = formatCurrency(rawValue as number);
    } else if (formatter === "number") {
      displayValue = toPersianDigits(rawValue.toString());
    } else {
      displayValue = toPersianDigits(rawValue.toString());
    }
  }

  const getTrendColor = () => {
    if (color === "green") return "text-green-400";
    if (color === "red") return "text-red-400";
    if (color === "blue") return "text-blue-400";
    return "text-gray-300";
  };

  return (
    <Card className={`bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">{title}</p>
            <p className="text-2xl font-bold text-white mt-2">{displayValue}</p>
            {/* Trend display can be added here if data is available */}
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = "text-primary",
  onClick
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  colorClass?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`stat-card ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">
              {title}
            </p>
            <p className="text-2xl font-bold text-white mt-2">
              {toPersianDigits(value)}
            </p>
            {subtitle && (
              <p className="text-sm text-blue-300 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return '📄';
      case 'payment_received':
        return '💰';
      case 'telegram_sent':
        return '📱';
      case 'representative_created':
        return '👤';
      default:
        return '📋';
    }
  };

  return (
    <div className="activity-item">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(activity.createdAt).toLocaleString('fa-IR')}
        </p>
      </div>
    </div>
  );
}

// ✅ SHERLOCK v32.0: Enhanced Overdue Invoices Widget - Fixed with Proper Endpoint
const OverdueInvoicesCard = () => {
  const { data: overdueData, isLoading: debtorLoading, error: debtorError } = useQuery({
    queryKey: ["/api/unified-financial/overdue-analysis"],
    queryFn: async () => {
      console.log('🔍 SHERLOCK v32.0: Fetching accurate overdue analysis for dashboard widget...');
      return apiRequest("/api/unified-financial/overdue-analysis");
    },
    select: (response: any) => response?.data || response || {},
    staleTime: 30000,
    refetchInterval: 45000
  });

  if (debtorLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مطالبات معوق</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (debtorError || !overdueData) {
    console.error('🔍 SHERLOCK v32.0: Error in overdue invoices widget:', debtorError);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مطالبات معوق</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">خطا</div>
          <p className="text-xs text-red-500">عدم دسترسی به اطلاعات</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  console.log('🔍 SHERLOCK v32.0: Processing overdue analysis data for widget:', {
    overdueAmount: overdueData?.totals?.totalOverdueAmount || 0,
    overdueCount: overdueData?.representatives?.length || 0,
    dataStructure: overdueData?.totals || 'No totals data'
  });

  // ✅ SHERLOCK v32.0: Use accurate overdue data from dedicated endpoint
  const overdueRepresentatives = overdueData?.representatives || [];
  const totalOverdueAmount = overdueData?.totals?.totalOverdueAmount || 0;
  const overdueInvoicesCount = overdueData?.totals?.overdueInvoicesCount || 0;

  const criticalDebtors = overdueRepresentatives.filter(rep =>
    rep.overdueAmount > 10000000
  );

  console.log('🔍 SHERLOCK v32.0: Overdue analysis complete:', {
    totalOverdue: overdueRepresentatives.length,
    criticalCount: criticalDebtors.length,
    totalAmount: totalOverdueAmount,
    correctedAmount: `${totalOverdueAmount.toLocaleString()} تومان (اصلاح شده)`
  });

  return (
    <Card className={overdueRepresentatives.length > 10 ? "border-red-200 bg-red-50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">مطالبات معوق</CardTitle>
        <AlertTriangle className={`h-4 w-4 ${
          criticalDebtors.length > 0 ? 'text-red-500' :
          overdueRepresentatives.length > 5 ? 'text-orange-500' :
          'text-muted-foreground'
        }`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${
          criticalDebtors.length > 0 ? 'text-red-600' :
          overdueRepresentatives.length > 5 ? 'text-orange-600' :
          overdueRepresentatives.length > 0 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {toPersianDigits(overdueInvoicesCount.toString())}
        </div>
        <p className="text-xs text-muted-foreground">
          مجموع: {formatCurrency(totalOverdueAmount)}
        </p>

        {criticalDebtors.length > 0 && (
          <div className="mt-1">
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              {toPersianDigits(criticalDebtors.length.toString())} مورد بحرانی
            </span>
          </div>
        )}

        <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
          {overdueRepresentatives.slice(0, 4).map((rep, index) => {
            const debt = rep.overdueAmount || 0;
            const isCritical = debt > 10000000;

            return (
              <div key={rep.representativeId || index} className="flex justify-between text-xs">
                <span className="truncate flex items-center">
                  {isCritical && <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>}
                  {rep.representativeName}
                </span>
                <span className={`font-mono ${isCritical ? 'text-red-700 font-bold' : 'text-red-600'}`}>
                  {formatCurrency(debt)}
                </span>
              </div>
            );
          })}
          {overdueRepresentatives.length > 4 && (
            <div className="text-xs text-gray-500 text-center pt-1 border-t">
              و {toPersianDigits((overdueRepresentatives.length - 4).toString())} مورد دیگر...
            </div>
          )}
        </div>

        {overdueRepresentatives.length === 0 && (
          <div className="text-center mt-2">
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              ✅ بدون مطالبات معوق
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function Dashboard() {
  // ✅ EMERGENCY FIX v35.0: Enhanced dashboard query with robust error handling
  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/unified-financial/dashboard-optimized"],
    queryFn: async () => {
      console.log('🎯 PHASE 6B: Fetching optimized dashboard data via service layer...');
      try {
        // Use service layer endpoint instead of direct storage calls
        const response = await apiRequest("/api/unified-financial/dashboard-optimized");
        console.log('✅ PHASE 6B: Service layer response received:', response?.success ? 'Success' : 'Error');
        return response;
      } catch (error) {
        console.error('❌ PHASE 6B: Service layer error:', error);
        throw error;
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 3, // Retry failed requests
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data: any) => {
      try {
        console.log('🔍 EMERGENCY FIX v35.0: Processing dashboard data...', data?.success);

        // Handle both success and error responses gracefully
        if (!data?.success && data?.data) {
          console.warn('⚠️ Dashboard returned error but has fallback data');
        }

        // Extract from the API response structure with multiple fallbacks
        const summary = data?.data?.summary || data?.summary || data?.fallbackData || {};
        const representatives = data?.data?.representatives || {};
        const invoices = data?.data?.invoices || {};

        console.log('🔍 EMERGENCY FIX v35.0: Extracted summary data:', {
          hasSystemDebt: !!summary?.totalSystemDebt,
          hasRepresentatives: !!summary?.totalRepresentatives,
          summaryKeys: Object.keys(summary)
        });

        return {
          totalRevenue: parseFloat(summary?.totalSystemPaid || summary?.totalRevenue || '0'),
          totalDebt: parseFloat(summary?.totalSystemDebt || summary?.totalDebt || '0'),
          totalCredit: parseFloat(summary?.totalCredit || '0'),
          totalOutstanding: parseFloat(summary?.totalOutstanding || '0'),
          totalRepresentatives: parseInt(summary?.totalRepresentatives || representatives?.total || '0'),
          activeRepresentatives: parseInt(summary?.activeRepresentatives || representatives?.active || '0'),
          inactiveRepresentatives: parseInt(summary?.inactiveRepresentatives || representatives?.inactive || '0'),
          riskRepresentatives: parseInt(summary?.riskRepresentatives || summary?.criticalReps || '0'),
          totalInvoices: parseInt(summary?.totalInvoices || invoices?.total || '0'),
          paidInvoices: parseInt(summary?.paidInvoices || invoices?.paid || '0'),
          unpaidInvoices: parseInt(summary?.unpaidInvoices || invoices?.unpaid || '0'),
          overdueInvoices: parseInt(summary?.overdueInvoices || invoices?.overdue || '0'),
          unsentTelegramInvoices: parseInt(summary?.unsentTelegramInvoices || '0'),
          totalSalesPartners: parseInt(summary?.totalSalesPartners || '0'),
          activeSalesPartners: parseInt(summary?.activeSalesPartners || '0'),
          systemIntegrityScore: parseInt(summary?.systemIntegrityScore || summary?.systemAccuracy || '0'),
          lastReconciliationDate: summary?.lastReconciliationDate || summary?.lastCalculationTime || '',
          problematicRepresentativesCount: parseInt(summary?.problematicRepresentativesCount || summary?.criticalReps || '0'),
          responseTime: summary?.responseTime || 0,
          cacheStatus: summary?.cacheStatus || data?.meta?.cacheStatus || 'UNKNOWN',
          lastUpdated: summary?.lastUpdated || summary?.lastCalculationTime || new Date().toISOString()
        };
      } catch (selectError) {
        console.error('❌ Error processing dashboard data:', selectError);
        // Return safe fallback data
        return {
          totalRevenue: 0,
          totalDebt: 0,
          totalCredit: 0,
          totalOutstanding: 0,
          totalRepresentatives: 0,
          activeRepresentatives: 0,
          inactiveRepresentatives: 0,
          riskRepresentatives: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          unpaidInvoices: 0,
          overdueInvoices: 0,
          unsentTelegramInvoices: 0,
          totalSalesPartners: 0,
          activeSalesPartners: 0,
          systemIntegrityScore: 0,
          lastReconciliationDate: '',
          problematicRepresentativesCount: 0,
          responseTime: 0,
          cacheStatus: 'ERROR',
          lastUpdated: new Date().toISOString()
        };
      }
    }
  });

  const { data: telegramConfig } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"],
    select: (data: any) => data?.value || null
  });




  // ✅ EMERGENCY FIX v35.0: Enhanced loading and error states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">در حال بارگذاری اطلاعات داشبورد...</p>
            <p className="text-xs text-gray-400 mt-2">ممکن است تا 45 ثانیه طول بکشد</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Enhanced error handling with retry functionality
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">
                خطا در بارگذاری داشبورد
              </h3>
              <p className="text-red-700 mb-4">
                {error instanceof Error ? error.message : 'خطای ناشناخته در سیستم'}
              </p>
              <div className="space-x-4">
                <Button
                  onClick={() => refetch()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تلاش مجدد
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  بروزرسانی صفحه
                </Button>
              </div>
              <p className="text-xs text-red-600 mt-4">
                اگر مشکل ادامه دارد، لطفاً با پشتیبانی تماس بگیرید
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">
                اطلاعات داشبورد در دسترس نیست
              </h3>
              <p className="text-yellow-700 mb-4">
                سیستم موقتاً قادر به بارگذاری اطلاعات نیست
              </p>
              <Button
                onClick={() => refetch()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                تلاش مجدد
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug: Log processed dashboard data
  console.log('🔍 SHERLOCK v32.2: Final dashboard data:', {
    totalRevenue: dashboardData.totalRevenue,
    totalDebt: dashboardData.totalDebt,
    activeRepresentatives: dashboardData.activeRepresentatives,
    totalRepresentatives: dashboardData.totalRepresentatives
  });

  return (
    <div className="space-y-6">
      {/* File Upload Section - Main Dashboard Content */}
      <div className="max-w-4xl mx-auto">
        <InvoiceUpload />
      </div>

      {/* Payment Section - ATOMOS Enhanced */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            ثبت پرداخت سریع - ATOMOS Enhanced
          </CardTitle>
          <CardDescription>
            ✅ تخصیص خودکار FIFO یا دستی به فاکتور مشخص
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                مبلغ پرداخت
              </label>
              <input
                type="text"
                id="paymentAmount"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="ریال"
              />
            </div>

            <div>
              <label htmlFor="representativeSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                انتخاب نماینده
              </label>
              <select
                id="representativeSelect"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">انتخاب نماینده...</option>
                {dashboardData?.representatives && (
                  <option value="8phone">8phone</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                const amount = (document.getElementById('paymentAmount') as HTMLInputElement)?.value;
                const repCode = (document.getElementById('representativeSelect') as HTMLSelectElement)?.value;
                
                if (!amount || !repCode) {
                  alert('لطفاً مبلغ و نماینده را انتخاب کنید');
                  return;
                }

                try {
                  // First create payment
                  const paymentResponse = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      representativeCode: repCode,
                      amount: amount,
                      paymentDate: new Date().toISOString().split('T')[0],
                      description: 'پرداخت با تخصیص خودکار FIFO'
                    })
                  });

                  if (paymentResponse.ok) {
                    const payment = await paymentResponse.json();
                    
                    // Then auto-allocate using FIFO
                    const allocateResponse = await fetch(`/api/payments/${payment.id}/allocate-auto`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        rules: { method: 'FIFO', allowPartialAllocation: true }
                      })
                    });

                    if (allocateResponse.ok) {
                      alert('✅ پرداخت ثبت و تخصیص خودکار FIFO انجام شد');
                      window.location.reload();
                    } else {
                      alert('❌ خطا در تخصیص خودکار');
                    }
                  } else {
                    alert('❌ خطا در ثبت پرداخت');
                  }
                } catch (error) {
                  console.error('Payment error:', error);
                  alert('❌ خطا در عملیات');
                }
              }}
            >
              تخصیص خودکار (FIFO)
            </Button>
            <Button 
              onClick={() => {
                alert('برای تخصیص دستی، به صفحه نمایندگان مراجعه کنید');
                window.location.href = '/representatives';
              }}
            >
              تخصیص دستی
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Other dashboard components can be added here */}
      {/* <OverdueInvoicesCard /> */}
    </div>
  );
}