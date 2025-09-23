
/**
 * ATOMOS v3.0: PAYMENT ALLOCATION PAGE
 * 🎯 صفحه کاملاً جدید تخصیص پرداخت با رابط کاربری پاک
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Target, Zap, DollarSign, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import axios from '@/lib/axios';

interface Payment {
  id: number;
  representativeId: number;
  amount: string;
  paymentDate: string;
  description: string;
  isAllocated: boolean;
  createdAt: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  currentlyPaid: number;
  remainingAmount: number;
  status: string;
  issueDate: string;
}

interface Representative {
  id: number;
  name: string;
  code: string;
}

export default function PaymentAllocationV3() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepresentative, setSelectedRepresentative] = useState<number | null>(null);
  const [unallocatedPayments, setUnallocatedPayments] = useState<Payment[]>([]);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Manual allocation form
  const [manualForm, setManualForm] = useState({
    invoiceId: '',
    amount: '',
    reason: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadRepresentatives();
  }, []);

  useEffect(() => {
    if (selectedRepresentative) {
      loadRepresentativeData();
    }
  }, [selectedRepresentative]);

  const loadRepresentatives = async () => {
    try {
      const response = await axios.get('/api/representatives');
      setRepresentatives(response.data.data || []);
    } catch (error) {
      console.error('Error loading representatives:', error);
      toast({
        title: "خطا",
        description: "خطا در بارگذاری نمایندگان",
        variant: "destructive"
      });
    }
  };

  const loadRepresentativeData = async () => {
    if (!selectedRepresentative) return;
    
    setLoading(true);
    try {
      const [paymentsResponse, invoicesResponse] = await Promise.all([
        axios.get(`/api/payment-allocation-v3/unallocated-payments/${selectedRepresentative}`),
        axios.get(`/api/payment-allocation-v3/available-invoices/${selectedRepresentative}`)
      ]);

      setUnallocatedPayments(paymentsResponse.data.data || []);
      setAvailableInvoices(invoicesResponse.data.data || []);
    } catch (error) {
      console.error('Error loading representative data:', error);
      toast({
        title: "خطا",
        description: "خطا در بارگذاری اطلاعات نماینده",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleAutoAllocation = async (paymentId: number) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/payment-allocation-v3/auto-allocate', {
        paymentId,
        reason: 'تخصیص خودکار از رابط کاربری v3.0'
      });

      if (response.data.success) {
        toast({
          title: "✅ تخصیص خودکار موفق",
          description: response.data.message
        });
        
        // Reload data
        await loadRepresentativeData();
      } else {
        throw new Error(response.data.errors?.[0] || 'خطا در تخصیص خودکار');
      }
    } catch (error: any) {
      console.error('Auto allocation error:', error);
      toast({
        title: "❌ خطا در تخصیص خودکار",
        description: error.response?.data?.error || error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleManualAllocation = async () => {
    if (!selectedPayment || !manualForm.invoiceId || !manualForm.amount) {
      toast({
        title: "خطای ورودی",
        description: "لطفاً تمام فیلدها را پر کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/payment-allocation-v3/manual-allocate', {
        paymentId: selectedPayment.id,
        invoiceId: parseInt(manualForm.invoiceId),
        amount: parseFloat(manualForm.amount),
        reason: manualForm.reason || 'تخصیص دستی از رابط کاربری v3.0'
      });

      if (response.data.success) {
        toast({
          title: "✅ تخصیص دستی موفق",
          description: response.data.message
        });
        
        // Reset form and reload data
        setSelectedPayment(null);
        setManualForm({ invoiceId: '', amount: '', reason: '' });
        await loadRepresentativeData();
      } else {
        throw new Error(response.data.errors?.[0] || 'خطا در تخصیص دستی');
      }
    } catch (error: any) {
      console.error('Manual allocation error:', error);
      toast({
        title: "❌ خطا در تخصیص دستی",
        description: error.response?.data?.error || error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('fa-IR').format(Number(amount)) + ' تومان';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">پرداخت شده</Badge>;
      case 'partial':
        return <Badge variant="secondary">پرداخت جزئی</Badge>;
      case 'overdue':
        return <Badge variant="destructive">معوق</Badge>;
      default:
        return <Badge variant="outline">پرداخت نشده</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">سیستم تخصیص پرداخت v3.0</h1>
          <p className="text-muted-foreground mt-2">ATOMOS Protocol - معماری کاملاً بازطراحی شده</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-green-600 font-medium">ATOMOS v3.0 Active</div>
        </div>
      </div>

      {/* Representative Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            انتخاب نماینده
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="representative-select">نماینده</Label>
              <Select 
                value={selectedRepresentative?.toString() || ''} 
                onValueChange={(value) => setSelectedRepresentative(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="نماینده را انتخاب کنید..." />
                </SelectTrigger>
                <SelectContent>
                  {representatives.map(rep => (
                    <SelectItem key={rep.id} value={rep.id.toString()}>
                      {rep.name} ({rep.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={loadRepresentativeData}
                disabled={!selectedRepresentative || loading}
                className="w-full"
              >
                بارگذاری اطلاعات
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRepresentative && (
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">پرداخت‌های تخصیص نیافته</TabsTrigger>
            <TabsTrigger value="invoices">فاکتورهای قابل تخصیص</TabsTrigger>
          </TabsList>

          {/* Unallocated Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  پرداخت‌های تخصیص نیافته ({unallocatedPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">در حال بارگذاری...</div>
                ) : unallocatedPayments.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      همه پرداخت‌ها تخصیص یافته‌اند! 🎉
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {unallocatedPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">پرداخت #{payment.id}</div>
                          <div className="text-sm text-gray-500">
                            تاریخ: {payment.paymentDate}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.description}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAutoAllocation(payment.id)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Zap className="w-4 h-4 mr-1" />
                              تخصیص خودکار
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setManualForm({ 
                                  invoiceId: '', 
                                  amount: payment.amount, 
                                  reason: '' 
                                });
                              }}
                            >
                              تخصیص دستی
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Allocation Form */}
            {selectedPayment && (
              <Card>
                <CardHeader>
                  <CardTitle>تخصیص دستی پرداخت #{selectedPayment.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoice-select">فاکتور مقصد</Label>
                      <Select 
                        value={manualForm.invoiceId} 
                        onValueChange={(value) => setManualForm(prev => ({...prev, invoiceId: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="فاکتور را انتخاب کنید..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInvoices.map(invoice => (
                            <SelectItem key={invoice.id} value={invoice.id.toString()}>
                              {invoice.invoiceNumber} - باقیمانده: {formatCurrency(invoice.remainingAmount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount-input">مبلغ تخصیص</Label>
                      <Input
                        id="amount-input"
                        type="number"
                        value={manualForm.amount}
                        onChange={(e) => setManualForm(prev => ({...prev, amount: e.target.value}))}
                        placeholder="مبلغ تخصیص"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reason-input">دلیل (اختیاری)</Label>
                    <Input
                      id="reason-input"
                      value={manualForm.reason}
                      onChange={(e) => setManualForm(prev => ({...prev, reason: e.target.value}))}
                      placeholder="دلیل این تخصیص"
                    />
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <Button onClick={handleManualAllocation} disabled={loading}>
                      {loading ? 'در حال تخصیص...' : 'تخصیص دستی'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedPayment(null)}
                    >
                      انصراف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Available Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  فاکتورهای قابل تخصیص ({availableInvoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">در حال بارگذاری...</div>
                ) : availableInvoices.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      هیچ فاکتور قابل تخصیصی برای این نماینده وجود ندارد
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {availableInvoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">فاکتور {invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">
                            تاریخ صدور: {invoice.issueDate}
                          </div>
                          <div className="text-sm">
                            مبلغ کل: {formatCurrency(invoice.amount)} | 
                            پرداخت شده: {formatCurrency(invoice.currentlyPaid)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="text-left">
                            <div className="text-lg font-bold text-red-600">
                              باقیمانده: {formatCurrency(invoice.remainingAmount)}
                            </div>
                            {getStatusBadge(invoice.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
