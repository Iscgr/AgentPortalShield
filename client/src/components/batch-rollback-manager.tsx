
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
import { AlertTriangle, Trash2, Eye, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../lib/currency-formatter';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/utils';

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
        title: "خطا در تأیید",
        description: "متن تأیید صحیح نیست",
        variant: "destructive"
      });
    }
  };

  const previewResult = previewData?.data as RollbackPreview;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            حذف دسته‌جمعی فاکتورها
          </CardTitle>
          <CardDescription>
            حذف فاکتورهای اشتباه با بازگردانی کامل آمار مالی
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-date">تاریخ صدور فاکتورها</Label>
            <Input
              id="target-date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              placeholder="۱۴۰۴/۰۵/۲۶"
              className="max-w-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handlePreview}
              variant="outline"
              disabled={!targetDate || previewLoading}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewLoading ? 'در حال بررسی...' : 'پیش‌نمایش'}
            </Button>

            {previewResult && (
              <Button 
                onClick={handleTestRollback}
                variant="outline"
                disabled={testRollbackMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {testRollbackMutation.isPending ? 'در حال تست...' : 'تست حذف'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* نمایش پیش‌نمایش */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle>گزارش فاکتورهای قابل حذف</CardTitle>
            <CardDescription>
              تاریخ: {targetDate} | تعداد کل: {previewResult.invoices.length} فاکتور
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {previewResult.invoices.length}
                </div>
                <div className="text-sm text-red-600">فاکتور قابل حذف</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">
                  {previewResult.representativeSummary.length}
                </div>
                <div className="text-sm text-orange-600">نماینده متأثر</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(previewResult.totalAmount)}
                </div>
                <div className="text-sm text-blue-600">مجموع مبلغ (تومان)</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">نمایندگان متأثر:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewResult.representativeSummary.map((rep) => (
                  <div key={rep.representativeId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{rep.representativeName}</span>
                      <Badge variant="outline" className="ml-2">
                        {rep.invoiceCount} فاکتور
                      </Badge>
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-red-600">
                        -{formatCurrency(rep.totalAmount)} تومان
                      </div>
                      <div className="text-xs text-gray-500">
                        بدهی فعلی: {formatCurrency(rep.currentDebt)} تومان
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!showConfirmation && (
              <Button 
                onClick={() => setShowConfirmation(true)}
                variant="destructive"
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                شروع فرآیند حذف
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* تأیید حذف */}
      {showConfirmation && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              تأیید حذف دسته‌جمعی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                این عمل غیرقابل بازگشت است! تمام فاکتورهای با تاریخ {targetDate} حذف خواهند شد.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                برای تأیید، متن زیر را وارد کنید:
                <code className="bg-gray-100 px-2 py-1 rounded ml-2">
                  DELETE_INVOICES_{targetDate}
                </code>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`DELETE_INVOICES_${targetDate}`}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleExecuteRollback}
                variant="destructive"
                disabled={confirmationText !== `DELETE_INVOICES_${targetDate}` || executeRollbackMutation.isPending}
              >
                {executeRollbackMutation.isPending ? 'در حال حذف...' : 'تأیید و حذف'}
              </Button>
              <Button 
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationText('');
                }}
                variant="outline"
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نمایش نتیجه تست */}
      {testRollbackMutation.data && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">نتیجه تست</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>✅ تست موفق - {testRollbackMutation.data.data.deletedInvoices} فاکتور برای حذف شناسایی شد</div>
              <div>📊 {testRollbackMutation.data.data.affectedRepresentatives} نماینده متأثر خواهند شد</div>
              
              {testRollbackMutation.data.data.warnings.length > 0 && (
                <div className="mt-2">
                  <strong>هشدارها:</strong>
                  <ul className="list-disc list-inside text-yellow-600">
                    {testRollbackMutation.data.data.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
