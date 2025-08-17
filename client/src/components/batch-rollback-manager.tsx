/**
 * SHERLOCK v32.0: BATCH ROLLBACK MANAGER UI
 * رابط کاربری حذف دسته‌جمعی فاکتورها
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { AlertTriangle, Trash2, Eye, CheckCircle, RotateCcw, Calendar } from 'lucide-react';
import { formatForCRM } from '../lib/currency-formatter';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

interface RollbackPreview {
  invoices: Array<{
    id: number;
    representativeId: number;
    amount: string;
    issueDate: string;
    createdAt: string;
  }>;
  representativeSummary: Array<{
    representativeId: number;
    representativeName: string;
    invoiceCount: number;
    totalAmount: number;
    currentDebt: number;
  }>;
  totalAmount: number;
}

export function BatchRollbackManager() {
  const [targetDate, setTargetDate] = useState('۱۴۰۴/۰۵/۲۶');
  const [confirmationText, setConfirmationText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  // دریافت پیش‌نمایش فاکتورهای قابل حذف
  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ['rollback-preview', targetDate],
    queryFn: () => apiRequest(`/api/batch-rollback/preview/${encodeURIComponent(targetDate)}`),
    enabled: false
  });

  // تست حذف دسته‌جمعی
  const testRollbackMutation = useMutation({
    mutationFn: () => apiRequest(`/api/batch-rollback/test/${encodeURIComponent(targetDate)}`, {
      method: 'POST'
    }),
    onSuccess: (data) => {
      toast({
        title: "تست موفق",
        description: `${data.data.deletedInvoices} فاکتور برای حذف شناسایی شد`
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تست",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // اجرای واقعی حذف
  const executeRollbackMutation = useMutation({
    mutationFn: () => apiRequest(`/api/batch-rollback/execute/${encodeURIComponent(targetDate)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmDelete: true,
        userConfirmation: `DELETE_INVOICES_${targetDate}`
      })
    }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "حذف موفق",
          description: `${data.data.deletedInvoices} فاکتور حذف شد و آمار مالی بازگردانی شد`
        });
        setShowConfirmation(false);
        setConfirmationText('');
        refetchPreview();
      } else {
        toast({
          title: "خطا در حذف",
          description: data.data.errors?.join(', ') || 'خطای نامشخص',
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در حذف",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePreview = () => {
    refetchPreview();
  };

  const handleTestRollback = () => {
    testRollbackMutation.mutate();
  };

  const handleExecuteRollback = () => {
    if (confirmationText === `DELETE_INVOICES_${targetDate}`) {
      executeRollbackMutation.mutate();
    } else {
      toast({
        title: "خطای تأیید",
        description: `لطفاً عبارت DELETE_INVOICES_${targetDate} را دقیقاً وارد کنید`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* بخش ورودی تاریخ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 ml-2" />
            انتخاب تاریخ صدور فاکتور
          </CardTitle>
          <CardDescription>
            تاریخ صدور فاکتورهایی که می‌خواهید حذف کنید را وارد کنید
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="targetDate">تاریخ صدور (به فرمت شمسی)</Label>
            <Input
              id="targetDate"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="۱۴۰۴/۰۵/۲۶"
              className="max-w-xs"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              مثال: ۱۴۰۴/۰۵/۲۶ (برای ۲۶ مرداد ۱۴۰۴)
            </p>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <Button 
              onClick={handlePreview}
              disabled={previewLoading || !targetDate}
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewLoading ? "در حال بارگذاری..." : "پیش‌نمایش فاکتورها"}
            </Button>

            <Button 
              onClick={handleTestRollback}
              disabled={testRollbackMutation.isPending || !targetDate}
              variant="secondary"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {testRollbackMutation.isPending ? "در حال تست..." : "تست حذف"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* بخش پیش‌نمایش */}
      {previewData?.success && (
        <Card>
          <CardHeader>
            <CardTitle>پیش‌نمایش فاکتورهای قابل حذف</CardTitle>
            <CardDescription>
              فاکتورهای صادر شده در تاریخ {targetDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {previewData.data.invoices?.length || 0}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    تعداد فاکتور
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {previewData.data.representativeSummary?.length || 0}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    نماینده متأثر
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatForCRM(previewData.data.totalAmount || 0)}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200">
                    مجموع مبلغ
                  </div>
                </div>
              </div>

              {previewData.data.representativeSummary?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">نمایندگان متأثر:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {previewData.data.representativeSummary.map((rep: any) => (
                        <div key={rep.representativeId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                          <div>
                            <span className="font-medium">{rep.representativeName}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                              ({rep.invoiceCount} فاکتور)
                            </span>
                          </div>
                          <div className="text-sm">
                            <Badge variant="outline">
                              {formatForCRM(rep.totalAmount)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* بخش تأیید حذف */}
      {previewData?.success && previewData.data.invoices?.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              تأیید حذف دسته‌جمعی
            </CardTitle>
            <CardDescription>
              برای اجرای عملیات حذف، عبارت تأیید را وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>هشدار:</strong> این عملیات غیرقابل برگشت است و تمام فاکتورهای انتخاب شده را حذف می‌کند.
                آمار مالی نمایندگان نیز به حالت قبل از صدور این فاکتورها بازگردانده خواهد شد.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="confirmation">
                برای تأیید، عبارت زیر را دقیقاً وارد کنید:
              </Label>
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
                DELETE_INVOICES_{targetDate}
              </div>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`DELETE_INVOICES_${targetDate}`}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationText('');
                }}
              >
                انصراف
              </Button>

              <Button 
                onClick={handleExecuteRollback}
                disabled={
                  executeRollbackMutation.isPending || 
                  confirmationText !== `DELETE_INVOICES_${targetDate}`
                }
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {executeRollbackMutation.isPending ? "در حال حذف..." : "حذف قطعی فاکتورها"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}