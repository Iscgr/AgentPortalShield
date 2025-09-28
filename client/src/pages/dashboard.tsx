import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  FileText,
  Upload,
  DollarSign,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceUpload from "@/components/invoice-upload";
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
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest("/api/dashboard"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    select: (data: any) => {
      console.log('🔍 SHERLOCK v32.2: Raw API response structure:', data);
      
      // Extract from the correct API response structure
      const summary = data?.data?.summary || data?.summary || data?.value || data;
      const representatives = data?.data?.representatives || {};
      const invoices = data?.data?.invoices || {};
      
      console.log('🔍 SHERLOCK v32.2: Extracted summary:', summary);
      
      return {
        totalRevenue: parseFloat(summary?.totalSystemPaid || '0'),
        totalDebt: parseFloat(summary?.totalSystemDebt || summary?.totalDebt || '0'),
        totalCredit: parseFloat(summary?.totalCredit || '0'),
        totalOutstanding: parseFloat(summary?.totalOutstanding || '0'),
        totalRepresentatives: parseInt(summary?.totalRepresentatives || representatives?.total || '0'),
        activeRepresentatives: parseInt(summary?.activeRepresentatives || representatives?.active || '0'),
        inactiveRepresentatives: parseInt(summary?.inactiveRepresentatives || representatives?.inactive || '0'),
        riskRepresentatives: parseInt(summary?.riskRepresentatives || '0'),
        totalInvoices: parseInt(summary?.totalInvoices || invoices?.total || '0'),
        paidInvoices: parseInt(summary?.paidInvoices || invoices?.paid || '0'),
        unpaidInvoices: parseInt(summary?.unpaidInvoices || invoices?.unpaid || '0'),
        overdueInvoices: parseInt(summary?.overdueInvoices || invoices?.overdue || '0'),
        unsentTelegramInvoices: parseInt(summary?.unsentTelegramInvoices || '0'),
        totalSalesPartners: parseInt(summary?.totalSalesPartners || '0'),
        activeSalesPartners: parseInt(summary?.activeSalesPartners || '0'),
        systemIntegrityScore: parseInt(summary?.systemIntegrityScore || '0'),
        lastReconciliationDate: summary?.lastReconciliationDate || '',
        problematicRepresentativesCount: parseInt(summary?.problematicRepresentativesCount || '0'),
        responseTime: summary?.responseTime || 0,
        cacheStatus: summary?.cacheStatus || 'UNKNOWN',
        lastUpdated: summary?.lastUpdated || new Date().toISOString()
      };
    }
  });

  const { data: telegramConfig } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"],
    select: (data: any) => data?.value || null
  });

  


  if (isLoading) {
    return (
      <div className="space-y-6">
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

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">خطا در بارگذاری اطلاعات داشبورد</p>
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
    </div>
  );
}