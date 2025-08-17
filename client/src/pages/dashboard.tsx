import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  FileText,
  Upload,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceUpload from "@/components/invoice-upload";
import AiChat from "@/components/ai-chat";
import DebtorRepresentativesCard from "@/components/debtor-representatives-card";
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

// SHERLOCK v1.0: Define interface for financial health data
interface FinancialHealthData {
  healthScore: number;
  activeDebtors: number;
  totalCredit: number;
  overdueAmount: number;
  recommendations: string[];
}

// SHERLOCK v1.0: UnifiedStatCard component (assuming this exists elsewhere in the project)
// This is a placeholder for the purpose of this example.
function UnifiedStatCard({ title, value, icon, trend, loading }: { title: string; value: any; icon: string; trend?: "up" | "down"; loading?: boolean }) {
  if (loading) {
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

  const getTrendColor = () => {
    if (trend === "up") return "text-green-400";
    if (trend === "down") return "text-red-400";
    return "text-gray-300";
  };

  return (
    <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">{title}</p>
            <p className="text-2xl font-bold text-white mt-2">
              {value !== undefined ? toPersianDigits(value.toString()) : "-"}
            </p>
            {trend && (
              <p className={`text-sm ${getTrendColor()} mt-1`}>
                {trend === "up" && "افزایش"}
                {trend === "down" && "کاهش"}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl">{icon}</span>
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

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/unified-statistics/global"],
    queryFn: () => apiRequest("/api/unified-statistics/global"),
    select: (response: any) => {
      console.log('📊 SHERLOCK v26.1: Dashboard data received:', response);

      // Handle different response structures
      if (response.success && response.data) {
        return response.data;
      } else if (response.data) {
        return response.data;
      } else {
        return response;
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  const { data: telegramConfig } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"],
    select: (data: any) => data?.value || null
  });

  // SHERLOCK v1.0: Financial health data
  const { data: financialHealth, isLoading: healthLoading } = useQuery<FinancialHealthData>({
    queryKey: ["/api/unified-financial/health"],
    queryFn: async () => await apiRequest("/api/unified-financial/health"),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });

  // Activity Logs Query
  const { data: activityLogs = [], isLoading: isLoadingActivityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/activity-logs");
        console.log('📋 Activity logs response:', response);
        
        // Handle different response structures
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('Unexpected activity logs format:', response);
          return [];
        }
      } catch (error) {
        console.warn("Activity logs not available:", error);
        return [];
      }
    },
    enabled: true,
    staleTime: 30000,
  });

  // Financial Summary Query
  const { data: financialSummary, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["/api/unified-financial/batch-calculate"],
    queryFn: async () => {
      const response = await apiRequest("/api/unified-financial/batch-calculate");
      return response;
    },
    enabled: true,
    staleTime: 60000,
  });

  // Representatives Query  
  const { data: representativesData, isLoading: isLoadingReps } = useQuery({
    queryKey: ["/api/representatives"],
    queryFn: async () => {
      const response = await apiRequest("/api/representatives");
      return response;
    },
    enabled: true,
    staleTime: 30000,
  });

  console.log('🔍 SHERLOCK v26.1: Dashboard render state:', { 
    isLoading, 
    hasError: !!error, 
    hasData: !!dashboardData,
    dataKeys: dashboardData ? Object.keys(dashboardData) : []
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800">🔄 در حال بارگذاری اطلاعات داشبورد...</p>
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

  if (error) {
    console.error('❌ Dashboard error:', error);
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-semibold mb-2">❌ خطا در بارگذاری داده‌ها</h3>
          <p className="text-red-600 text-sm mb-4">
            {(error as any)?.message || 'خطای ناشناخته در دریافت اطلاعات'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            🔄 تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-yellow-800 font-semibold mb-2">⚠️ هیچ داده‌ای یافت نشد</h3>
          <p className="text-yellow-600 text-sm mb-4">
            ممکن است سیستم نیاز به راه‌اندازی اولیه داشته باشد
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            🔄 بازخوانی صفحه
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="کل درآمدها"
          value={formatCurrency(dashboardData.totalRevenue || 0)}
          subtitle="مبلغ پرداخت شده - تومان"
          icon={TrendingUp}
          colorClass="text-green-600"
          onClick={() => window.location.href = '/invoices'}
        />

        <StatCard
          title="مطالبات معوق"
          value={formatCurrency(dashboardData.totalDebt || 0)}
          subtitle="مانده بدهی - تومان"
          icon={AlertTriangle}
          colorClass="text-red-600"
          onClick={() => window.location.href = '/invoices'}
        />

        <StatCard
          title="نمایندگان فعال"
          value={toPersianDigits((dashboardData.activeRepresentatives || 0).toString())}
          subtitle="آخرین آپلود فایل ریزجزئیات"
          icon={Users}
          colorClass="text-blue-600"
          onClick={() => window.location.href = '/representatives'}
        />

        <StatCard
          title="فاکتورهای ارسال نشده"
          value={toPersianDigits((dashboardData.unsentTelegramInvoices || 0).toString())}
          subtitle="نیازمند ارسال به تلگرام"
          icon={FileText}
          colorClass="text-orange-600"
          onClick={() => window.location.href = '/invoices'}
        />
      </div>

      {/* SHERLOCK v1.0: Financial Health Card */}
      {financialHealth && (
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <span className="text-2xl">🏥</span>
                سلامت مالی سیستم - SHERLOCK v1.0
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    financialHealth.healthScore >= 80 ? 'text-green-400' :
                    financialHealth.healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {toPersianDigits(financialHealth.healthScore.toString())}%
                  </div>
                  <div className="text-gray-300 text-sm">امتیاز سلامت</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {toPersianDigits(financialHealth.activeDebtors.toString())}
                  </div>
                  <div className="text-gray-300 text-sm">بدهکار فعال</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(financialHealth.totalCredit)}
                  </div>
                  <div className="text-gray-300 text-sm">کل اعتبار</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {formatCurrency(financialHealth.overdueAmount)}
                  </div>
                  <div className="text-gray-300 text-sm">سررسید گذشته</div>
                </div>
              </div>

              {financialHealth.recommendations.length > 0 && (
                <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-300/20">
                  <h4 className="text-blue-200 font-semibold mb-2">💡 توصیه‌های سیستم:</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {financialHealth.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Invoice Generation Section */}
        <div className="lg:col-span-2">
          <InvoiceUpload />
        </div>

        {/* Placeholder for future widgets */}
        <div className="space-y-6">
          {/* Future dashboard widgets can be added here */}
        </div>
      </div>

      {/* SHERLOCK v10.0 NEW COMPONENT: Debtor Representatives Table */}
      <DebtorRepresentativesCard />
    </div>
  );
}