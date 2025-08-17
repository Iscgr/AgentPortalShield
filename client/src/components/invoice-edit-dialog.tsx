import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Plus, Trash2, Save, AlertTriangle, History, DollarSign, Clock, User, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useCrmAuth } from "@/hooks/use-crm-auth";
import { apiRequest } from "@/lib/queryClient";

interface EditableUsageRecord {
  id: string;
  admin_username: string;
  event_timestamp: string;
  event_type: 'CREATE' | 'RENEWAL' | 'DELETE';
  description: string;
  amount: number;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  status: string;
  usageData?: any;
}

interface InvoiceEditDialogProps {
  invoice: Invoice;
  representativeCode: string;
  onEditComplete?: () => void;
}

export default function InvoiceEditDialog({
  invoice,
  representativeCode,
  onEditComplete
}: InvoiceEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editableRecords, setEditableRecords] = useState<EditableUsageRecord[]>([]);
  const [editReason, setEditReason] = useState("");
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [activeTab, setActiveTab] = useState("edit");
  const [isInitialized, setIsInitialized] = useState(false);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for session monitoring
  const [sessionHealthy, setSessionHealthy] = useState(true);
  const [sessionCheckInterval, setSessionCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // SHERLOCK v1.0: UNIFIED AUTHENTICATION SYSTEM
  const adminAuth = useAuth();
  const crmAuth = useCrmAuth();

  // Determine authentication status
  const isAuthenticated = adminAuth.isAuthenticated || crmAuth.isAuthenticated;
  const currentUser = adminAuth.isAuthenticated ? adminAuth.user : crmAuth.user;
  const currentUsername = currentUser?.username || 'unknown';

  // Authentication check with proper error handling
  if (!isAuthenticated || !currentUser) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled>
            <Edit3 className="w-4 h-4 mr-2" />
            ویرایش ریز جزئیات (نیاز به ورود مجدد)
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">خطای احراز هویت</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-gray-600 mb-4">جلسه شما منقضی شده است</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              رفرش صفحه و ورود مجدد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Generate unique ID for new records
  const generateId = () => `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Session health check function
  const checkSessionHealth = async () => {
    try {
      const endpoint = adminAuth.isAuthenticated ? '/api/auth/check' : '/api/crm/auth/user';
      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      setSessionHealthy(response.ok);
      return response.ok;
    } catch (error) {
      console.error('Session health check failed:', error);
      setSessionHealthy(false);
      return false;
    }
  };

  // Start session monitoring when dialog opens
  useEffect(() => {
    if (isOpen && editMode) {
      checkSessionHealth();

      const interval = setInterval(() => {
        checkSessionHealth();
      }, 2 * 60 * 1000); // Every 2 minutes

      setSessionCheckInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isOpen, editMode]);

  // Calculate total amount from records
  const calculateTotalAmount = (records: EditableUsageRecord[]) => {
    return records
      .filter(record => !record.isDeleted)
      .reduce((sum, record) => sum + (record.amount || 0), 0);
  };

  // Fetch invoice usage details
  const { data: usageDetails, isLoading } = useQuery({
    queryKey: [`/api/invoices/${invoice.id}/usage-details`],
    enabled: isOpen
  });

  // Fetch edit history
  const { data: editHistory } = useQuery({
    queryKey: [`/api/invoices/${invoice.id}/edit-history`],
    enabled: isOpen && activeTab === "history"
  });

  // Fetch financial transactions
  const { data: financialTransactions } = useQuery({
    queryKey: [`/api/financial/transactions`],
    enabled: isOpen && activeTab === "transactions"
  });

  // Edit mutation with enhanced error handling
  const editMutation = useMutation({
    mutationFn: async (editData: any) => {
      setIsProcessing(true);

      // Enhanced session validation before save
      const isSessionValid = await checkSessionHealth();
      if (!isSessionValid) {
        throw new Error("جلسه منقضی شده است. لطفاً صفحه را بازخوانی کنید و مجدداً وارد شوید.");
      }

      const response = await apiRequest('/api/invoices/edit', {
        method: 'POST',
        data: editData
      });

      return response;
    },
    onSuccess: async (data) => {
      const transactionId = data.transactionId;
      const editId = data.editId;
      const amountDifference = calculatedAmount - originalAmount;

      console.log(`✅ SHERLOCK v1.0: Invoice edit successful - Transaction: ${transactionId}, Edit: ${editId}, Amount difference: ${amountDifference}`);

      // COMPREHENSIVE: Invalidate all related financial data
      await Promise.all([
        // Invoice-specific data
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoice.id}/usage-details`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoice.id}/edit-history`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] }),

        // Representative financial data
        queryClient.invalidateQueries({ queryKey: ['/api/representatives'] }),
        queryClient.invalidateQueries({ queryKey: [`/api/representatives/${representativeCode}`] }),

        // Global dashboard and statistics
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/unified-financial/summary'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/unified-financial/debtors'] }),

        // Payment-related data (for debt calculations)
        queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
      ]);

      // SHERLOCK v1.0: Additional financial synchronization if amount changed
      if (Math.abs(amountDifference) > 0) {
        try {
          console.log(`💰 SHERLOCK v1.0: Triggering financial sync for amount change: ${amountDifference} تومان`);

          // Force representative financial recalculation
          await apiRequest(`/api/unified-financial/representative/${representativeCode}/sync`, {
            method: 'POST',
            data: {
              reason: 'invoice_edit',
              invoiceId: invoice.id,
              amountChange: amountDifference,
              timestamp: new Date().toISOString()
            }
          });

          console.log(`✅ SHERLOCK v1.0: Financial synchronization completed for representative ${representativeCode}`);
        } catch (syncError) {
          console.warn('⚠️ Financial sync warning (non-critical):', syncError);
        }
      }

      setIsProcessing(false);
      setEditMode(false);
      setIsOpen(false);

      if (onEditComplete) {
        onEditComplete();
      }

      toast({
        title: "ویرایش موفق",
        description: `فاکتور ${invoice.invoiceNumber} با موفقیت ویرایش شد${amountDifference !== 0 ? ' - آمار مالی بروزرسانی گردید' : ''}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      console.error('Invoice edit error:', error);

      const errorMessage = error?.message || error?.response?.data?.error || 'خطای ناشناخته در ویرایش فاکتور';

      if (errorMessage.includes('جلسه منقضی')) {
        toast({
          title: "جلسه منقضی شده",
          description: "لطفاً صفحه را بازخوانی کرده و مجدداً وارد شوید",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              رفرش صفحه
            </Button>
          )
        });
      } else {
        toast({
          title: "خطا در ویرایش فاکتور",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });

  // Initialize editable records when usage details are loaded
  useEffect(() => {
    if ((usageDetails as any)?.records && Array.isArray((usageDetails as any).records) && !isInitialized && !editMode) {
      const records = ((usageDetails as any).records as any[]).map((record: any) => ({
        id: generateId(),
        admin_username: record.admin_username || '',
        event_timestamp: record.event_timestamp || '',
        event_type: record.event_type || 'CREATE',
        description: record.description || '',
        amount: parseFloat(record.amount || '0'),
        isNew: false,
        isModified: false,
        isDeleted: false
      }));

      const initialAmount = calculateTotalAmount(records);
      setEditableRecords(records);
      setCalculatedAmount(initialAmount);
      setOriginalAmount(parseFloat(invoice.amount));
      setIsInitialized(true);

      console.log(`🧮 SHERLOCK v1.0: Initialized invoice edit - Original: ${invoice.amount}, Calculated: ${initialAmount}`);
    }
  }, [usageDetails, isInitialized, editMode, invoice.amount]);

  // Reset initialization when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      setEditMode(false);
      setEditReason("");
      setActiveTab("edit");
      setSessionHealthy(true);
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
    }
  }, [isOpen, sessionCheckInterval]);

  // Add new record
  const addNewRecord = () => {
    const newRecord: EditableUsageRecord = {
      id: generateId(),
      admin_username: currentUsername,
      event_timestamp: new Date().toISOString(),
      event_type: 'CREATE',
      description: '',
      amount: 0,
      isNew: true,
      isModified: false,
      isDeleted: false
    };

    setEditableRecords(prev => [...prev, newRecord]);
  };

  // Update record
  const updateRecord = (id: string, field: keyof EditableUsageRecord, value: any) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updated = { ...record, [field]: value, isModified: !record.isNew };
        return updated;
      }
      return record;
    }));
  };

  // Delete record
  const deleteRecord = (id: string) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        return { ...record, isDeleted: true };
      }
      return record;
    }));
  };

  // Restore deleted record
  const restoreRecord = (id: string) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        return { ...record, isDeleted: false };
      }
      return record;
    }));
  };

  // Update calculated amount when records change
  useEffect(() => {
    const newAmount = calculateTotalAmount(editableRecords);
    setCalculatedAmount(newAmount);

    // SHERLOCK v1.0: Auto-sync total amount with usage details
    // Update the invoice amount in parent state if callback is available
    if (typeof onEditComplete === 'function' && newAmount !== originalAmount) {
      console.log(`💰 SHERLOCK v1.0: Auto-calculated amount changed from ${originalAmount} to ${newAmount}`);
    }
  }, [editableRecords, originalAmount, onEditComplete]);

  // Start editing
  const startEditing = () => {
    if (!sessionHealthy) {
      toast({
        title: "خطای جلسه",
        description: "جلسه نامعتبر است. لطفاً صفحه را بازخوانی کنید.",
        variant: "destructive"
      });
      return;
    }
    setEditMode(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditMode(false);
    setEditReason("");
    // Reset records to original state
    if ((usageDetails as any)?.records) {
      const records = ((usageDetails as any).records as any[]).map((record: any) => ({
        id: generateId(),
        admin_username: record.admin_username || '',
        event_timestamp: record.event_timestamp || '',
        event_type: record.event_type || 'CREATE',
        description: record.description || '',
        amount: parseFloat(record.amount || '0'),
        isNew: false,
        isModified: false,
        isDeleted: false
      }));
      setEditableRecords(records);
    }
  };

  // Save changes with comprehensive financial sync
  const saveChanges = async () => {
    if (!editReason.trim()) {
      toast({
        title: "خطای اعتبارسنجی",
        description: "لطفاً دلیل ویرایش را وارد کنید",
        variant: "destructive"
      });
      return;
    }

    if (!sessionHealthy) {
      toast({
        title: "خطای جلسه",
        description: "جلسه منقضی شده است. لطفاً صفحه را بازخوانی کنید.",
        variant: "destructive"
      });
      return;
    }

    const activeRecords = editableRecords.filter(record => !record.isDeleted);

    if (activeRecords.length === 0) {
      toast({
        title: "خطای اعتبارسنجی",
        description: "حداقل یک رکورد باید وجود داشته باشد",
        variant: "destructive"
      });
      return;
    }

    const invalidRecords = activeRecords.filter(record =>
      !record.description.trim() || record.amount <= 0
    );

    if (invalidRecords.length > 0) {
      toast({
        title: "خطای اعتبارسنجی",
        description: "همه رکوردها باید توضیحات و مبلغ معتبر داشته باشند",
        variant: "destructive"
      });
      return;
    }

    // SHERLOCK v1.0: Enhanced edit data with representative info for financial sync
    const editData = {
      invoiceId: invoice.id,
      representativeCode: representativeCode, // Add representative context
      originalUsageData: (usageDetails as any)?.usageData || {},
      editedUsageData: {
        type: 'edited',
        description: `فاکتور ویرایش شده - ${editReason}`,
        records: activeRecords.map(record => ({
          admin_username: record.admin_username,
          event_timestamp: record.event_timestamp,
          event_type: record.event_type,
          description: record.description,
          amount: record.amount.toString()
        })),
        totalRecords: activeRecords.length,
        usage_amount: calculatedAmount
      },
      editType: 'MANUAL_EDIT',
      editReason: editReason,
      originalAmount: parseFloat(invoice.amount),
      editedAmount: calculatedAmount,
      editedBy: currentUsername,
      // SHERLOCK v1.0: Add financial synchronization flags
      requiresFinancialSync: calculatedAmount !== parseFloat(invoice.amount),
      amountDifference: calculatedAmount - parseFloat(invoice.amount)
    };

    console.log(`💰 SHERLOCK v1.0: Invoice edit initiated - Amount change: ${editData.amountDifference} تومان`);
    editMutation.mutate(editData);
  };

  const getRecordBadgeColor = (record: EditableUsageRecord) => {
    if (record.isDeleted) return "destructive";
    if (record.isNew) return "default";
    if (record.isModified) return "secondary";
    return "outline";
  };

  const getRecordBadgeText = (record: EditableUsageRecord) => {
    if (record.isDeleted) return "حذف شده";
    if (record.isNew) return "جدید";
    if (record.isModified) return "ویرایش شده";
    return "اصلی";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit3 className="w-4 h-4 mr-2" />
          ویرایش ریز جزئیات
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            ویرایش جزئیات فاکتور {invoice.invoiceNumber}
            {!sessionHealthy && (
              <Badge variant="destructive" className="ml-2">
                جلسه نامعتبر
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">ویرایش جزئیات</TabsTrigger>
            <TabsTrigger value="history">تاریخچه ویرایش</TabsTrigger>
            <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            {/* Session Status Alert */}
            {!sessionHealthy && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  جلسه شما منقضی شده است. لطفاً صفحه را بازخوانی کنید و مجدداً وارد شوید.
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}>
                    رفرش صفحه
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Invoice Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  اطلاعات فاکتور
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">کد نماینده: {representativeCode}</Badge>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status === 'paid' ? 'پرداخت شده' :
                       invoice.status === 'partial' ? 'پرداخت جزئی' : 'پرداخت نشده'}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">مبلغ اصلی</Label>
                    <p className="font-semibold">{originalAmount.toLocaleString()} تومان</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">مبلغ محاسبه شده</Label>
                    <p className="font-semibold text-blue-600">{calculatedAmount.toLocaleString()} تومان</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">تاریخ صدور</Label>
                    <p className="font-semibold">{invoice.issueDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">تفاوت</Label>
                    <p className={`font-semibold ${calculatedAmount !== originalAmount ? 'text-orange-600' : 'text-green-600'}`}>
                      {(calculatedAmount - originalAmount).toLocaleString()} تومان
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Controls */}
            {!editMode ? (
              <div className="flex justify-between items-center">
                <Button onClick={startEditing} disabled={!sessionHealthy}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  شروع ویرایش
                </Button>
                <div className="text-sm text-gray-500">
                  کاربر فعال: {currentUsername}
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>دلیل ویرایش</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="لطفاً دلیل ویرایش این فاکتور را شرح دهید..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            )}

            {/* Records List */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">در حال بارگذاری جزئیات...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {editableRecords.map((record, index) => (
                  <Card key={record.id} className={`${record.isDeleted ? 'opacity-50 bg-gray-50' : ''}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={getRecordBadgeColor(record)}>
                            {getRecordBadgeText(record)}
                          </Badge>
                          <span className="text-sm text-gray-500">رکورد #{index + 1}</span>
                        </div>

                        {editMode && (
                          <div className="flex gap-2">
                            {record.isDeleted ? (
                              <Button size="sm" variant="outline" onClick={() => restoreRecord(record.id)}>
                                بازیابی
                              </Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => deleteRecord(record.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor={`username-${record.id}`}>کاربر</Label>
                          <Input
                            id={`username-${record.id}`}
                            value={record.admin_username}
                            onChange={(e) => updateRecord(record.id, 'admin_username', e.target.value)}
                            disabled={!editMode || record.isDeleted}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`timestamp-${record.id}`}>زمان</Label>
                          <Input
                            id={`timestamp-${record.id}`}
                            type="datetime-local"
                            value={record.event_timestamp ? new Date(record.event_timestamp).toISOString().slice(0, 16) : ''}
                            onChange={(e) => updateRecord(record.id, 'event_timestamp', new Date(e.target.value).toISOString())}
                            disabled={!editMode || record.isDeleted}
                          />
                        </div>

                        <div>
                          <Label htmlFor={`type-${record.id}`}>نوع رویداد</Label>
                          <Select
                            value={record.event_type}
                            onValueChange={(value) => updateRecord(record.id, 'event_type', value as any)}
                            disabled={!editMode || record.isDeleted}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CREATE">ایجاد</SelectItem>
                              <SelectItem value="RENEWAL">تمدید</SelectItem>
                              <SelectItem value="DELETE">حذف</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`amount-${record.id}`}>مبلغ (تومان)</Label>
                          <Input
                            id={`amount-${record.id}`}
                            type="number"
                            step="1000"
                            min="0"
                            value={record.amount}
                            onChange={(e) => updateRecord(record.id, 'amount', parseFloat(e.target.value) || 0)}
                            disabled={!editMode || record.isDeleted}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label htmlFor={`description-${record.id}`}>توضیحات</Label>
                        <Textarea
                          id={`description-${record.id}`}
                          value={record.description}
                          onChange={(e) => updateRecord(record.id, 'description', e.target.value)}
                          disabled={!editMode || record.isDeleted}
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {editMode && (
                  <Button onClick={addNewRecord} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    افزودن رکورد جدید
                  </Button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {editMode && (
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button onClick={cancelEditing} variant="outline">
                    انصراف
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  {/* SHERLOCK v1.0: Enhanced amount display with change indicator */}
                  <div className="text-sm text-gray-600 flex flex-col items-end">
                    <div>مجموع فعلی: {calculatedAmount.toLocaleString()} تومان</div>
                    {calculatedAmount !== originalAmount && (
                      <div className={`text-xs font-medium ${calculatedAmount > originalAmount ? 'text-green-600' : 'text-red-600'}`}>
                        {calculatedAmount > originalAmount ? '↗️' : '↘️'} تغییر: {Math.abs(calculatedAmount - originalAmount).toLocaleString()} تومان
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={saveChanges}
                    disabled={isProcessing || !sessionHealthy}
                    className="min-w-[120px]"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        ذخیره تغییرات
                        {calculatedAmount !== originalAmount && (
                          <span className="mr-1 text-xs">({calculatedAmount > originalAmount ? '+' : ''}{(calculatedAmount - originalAmount).toLocaleString()})</span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  تاریخچه ویرایش فاکتور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editHistory && editHistory.length > 0 ? (
                  <div className="space-y-4">
                    {editHistory.map((edit: any, index: number) => (
                      <div key={edit.id} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{edit.editedBy}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(edit.timestamp).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{edit.editReason}</p>
                        <div className="text-sm text-gray-600">
                          <span>مبلغ: {edit.originalAmount} ← {edit.editedAmount} تومان</span>
                          <span className="mx-2">|</span>
                          <span>نوع: {edit.editType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>هیچ تاریخچه ویرایشی یافت نشد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  تراکنش‌های مالی مرتبط
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financialTransactions && financialTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {financialTransactions.slice(0, 10).map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-500">
                            تاریخ: {new Date(transaction.timestamp).toLocaleString('fa-IR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{transaction.amount?.toLocaleString()} تومان</div>
                          <Badge variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>هیچ تراکنش مالی یافت نشد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}