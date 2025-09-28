
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Wrench,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";

interface DebtVerificationResult {
  representativeId: number;
  representativeName: string;
  representativeCode: string;
  storedDebt: number;
  calculatedDebt: number;
  discrepancy: number;
  discrepancyPercentage: number;
  isConsistent: boolean;
  status: 'CONSISTENT' | 'INCONSISTENT' | 'ERROR';
  lastCalculation?: string;
  error?: string;
}

interface VerificationSummary {
  totalRepresentatives: number;
  consistentCount: number;
  inconsistentCount: number;
  errorCount: number;
  consistencyRate: number;
  totalDiscrepancy: number;
  averageDiscrepancy: number;
  totalCalculatedDebt?: number;
  totalStoredDebt?: number;
  debtDifferenceAmount?: number;
  verificationDuration: number;
}

export default function DebtVerificationPanel() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch verification data
  const { data: verificationData, isLoading, error, refetch } = useQuery({
    queryKey: ['debt-verification'],
    queryFn: async () => {
      const response = await apiRequest('/api/debt-verification/verify-debt-column-consistency');
      return response;
    },
    enabled: false, // Don't auto-run on mount
    retry: 1
  });

  // Auto-fix mutation
  const autoFixMutation = useMutation({
    mutationFn: async (representativeIds?: number[]) => {
      return apiRequest('/api/debt-verification/fix-debt-inconsistencies', {
        method: 'POST',
        data: representativeIds ? { representativeIds } : {}
      });
    },
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "بدهی‌های ناسازگار اصلاح شدند"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در اصلاح بدهی‌ها",
        variant: "destructive"
      });
    }
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await refetch();
      toast({
        title: "تکمیل بررسی",
        description: "بررسی انطباق ستون بدهی انجام شد"
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در بررسی بدهی‌ها",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAutoFix = () => {
    setIsFixing(true);
    autoFixMutation.mutate(undefined);
    setIsFixing(false);
  };

  const handleFixSpecific = (representativeIds: number[]) => {
    autoFixMutation.mutate(representativeIds);
  };

  const getStatusBadge = (status: string, isConsistent: boolean) => {
    if (status === 'ERROR') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          خطا
        </Badge>
      );
    }
    
    if (isConsistent) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          سازگار
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        ناسازگار
      </Badge>
    );
  };

  const getDiscrepancyIndicator = (discrepancy: number) => {
    if (discrepancy > 500000) {
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    } else if (discrepancy > 100000) {
      return <TrendingUp className="w-4 h-4 text-orange-600" />;
    }
    return <TrendingDown className="w-4 h-4 text-green-600" />;
  };

  const summary: VerificationSummary = verificationData?.summary;
  const topInconsistencies: DebtVerificationResult[] = verificationData?.topInconsistencies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🔍 بررسی انطباق ستون بدهی
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            SHERLOCK v32.0 - تایید انطباق مقادیر ستون بدهی با محاسبات استاندارد
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={isVerifying || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                در حال بررسی...
              </>
            ) : (
              <>
                <Info className="w-4 h-4 mr-2" />
                شروع بررسی
              </>
            )}
          </Button>
          {verificationData && summary?.inconsistentCount > 0 && (
            <Button
              onClick={handleAutoFix}
              disabled={isFixing || autoFixMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFixing || autoFixMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  در حال اصلاح...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  اصلاح خودکار
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="space-y-4">
          {/* First Row - Basic Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">کل نمایندگان</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {toPersianDigits(summary.totalRepresentatives.toString())}
                    </p>
                  </div>
                  <Info className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">سازگار</p>
                    <p className="text-2xl font-bold text-green-600">
                      {toPersianDigits(summary.consistentCount.toString())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {toPersianDigits(summary.consistencyRate.toString())}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ناسازگار</p>
                    <p className="text-2xl font-bold text-red-600">
                      {toPersianDigits(summary.inconsistentCount.toString())}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">کل اختلاف</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(summary.totalDiscrepancy)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ SHERLOCK v32.0: Second Row - Total Debt Calculations */}
          {summary.totalCalculatedDebt !== undefined && summary.totalStoredDebt !== undefined && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        💰 مجموع بدهی محاسبه شده
                      </p>
                      <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        {formatCurrency(summary.totalCalculatedDebt)}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        (از موتور مالی استاندارد)
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        🗃️ مجموع بدهی ذخیره شده
                      </p>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        {formatCurrency(summary.totalStoredDebt)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        (در ستون بدهی جدول)
                      </p>
                    </div>
                    <Info className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-r border-2 ${
                summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 
                  ? 'from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 border-red-300 dark:border-red-700'
                  : 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-300 dark:border-green-700'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 ? '⚠️' : '✅'} اختلاف کل
                      </p>
                      <p className={`text-xl font-bold ${
                        summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 
                          ? 'text-red-800 dark:text-red-200' 
                          : 'text-green-800 dark:text-green-200'
                      }`}>
                        {formatCurrency(summary.debtDifferenceAmount || 0)}
                      </p>
                      <p className={`text-xs ${
                        summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 
                          ? 'نیاز به اصلاح دارد' 
                          : 'مطابقت کامل دارد'}
                      </p>
                    </div>
                    {summary.debtDifferenceAmount && summary.debtDifferenceAmount > 1000 ? (
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Inconsistencies Table */}
      {topInconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              نمایندگان با بیشترین اختلاف بدهی ({topInconsistencies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نماینده</TableHead>
                    <TableHead>کد</TableHead>
                    <TableHead>بدهی ذخیره شده</TableHead>
                    <TableHead>بدهی محاسبه شده</TableHead>
                    <TableHead>اختلاف</TableHead>
                    <TableHead>درصد اختلاف</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topInconsistencies.map((result) => (
                    <TableRow key={result.representativeId}>
                      <TableCell className="font-medium">
                        {result.representativeName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.representativeCode}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(result.storedDebt)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(result.calculatedDebt)}
                      </TableCell>
                      <TableCell className="font-mono flex items-center gap-1">
                        {getDiscrepancyIndicator(result.discrepancy)}
                        {formatCurrency(result.discrepancy)}
                      </TableCell>
                      <TableCell>
                        {toPersianDigits(result.discrepancyPercentage.toFixed(1))}%
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(result.status, result.isConsistent)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFixSpecific([result.representativeId])}
                          disabled={autoFixMutation.isPending}
                        >
                          <Wrench className="w-3 h-3 mr-1" />
                          اصلاح
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {verificationData?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">پیشنهادات سیستم</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {verificationData.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">در حال بررسی انطباق بدهی‌ها...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-4">خطا در بررسی بدهی‌ها</p>
            <Button onClick={handleVerify} variant="outline">
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!isLoading && !error && !verificationData && (
        <Card>
          <CardContent className="p-8 text-center">
            <Info className="w-8 h-8 mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 mb-4">برای شروع بررسی انطباق، دکمه "شروع بررسی" را کلیک کنید</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
