
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Plus, Trash2, Save, AlertTriangle, History, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * UNIFIED INVOICE EDIT CONTRACT - NEXUS PROTOCOL
 */
interface StandardizedEditableRecord {
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

interface UnifiedInvoiceEditRequest {
  invoiceId: number;
  representativeCode: string;
  editReason: string;
  originalAmount: number;
  editedAmount: number;
  editedBy: string;
  records: StandardizedEditableRecord[];
  requiresFinancialSync: boolean;
}

interface UnifiedInvoiceEditResponse {
  success: boolean;
  transactionId: string;
  editId: string;
  amountDifference: number;
  syncResults: {
    representativeSync: boolean;
    cacheInvalidation: boolean;
    financialIntegrity: boolean;
  };
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  status: string;
  usageData?: any;
}

interface UnifiedInvoiceEditProps {
  invoice: Invoice;
  representativeCode: string;
  onEditComplete?: () => void;
}

/**
 * DA VINCI v300.0 - UNIFIED INVOICE EDIT SYSTEM
 * Single point of truth for invoice editing operations
 */
export default function UnifiedInvoiceEditSystem({
  invoice,
  representativeCode,
  onEditComplete
}: UnifiedInvoiceEditProps) {
  // ✅ UNIFIED STATE MANAGEMENT
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editableRecords, setEditableRecords] = useState<StandardizedEditableRecord[]>([]);
  const [editReason, setEditReason] = useState("");
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionHealthy, setSessionHealthy] = useState(true);
  const [activeTab, setActiveTab] = useState("edit");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ UNIFIED AUTHENTICATION CHECK
  const checkAuthenticationStatus = async (): Promise<boolean> => {
    try {
      const [adminCheck, crmCheck] = await Promise.all([
        fetch('/api/auth/check', { credentials: 'include' }),
        fetch('/api/crm/auth/user', { credentials: 'include' })
      ]);

      const isAuthenticated = adminCheck.ok || crmCheck.ok;
      setSessionHealthy(isAuthenticated);
      return isAuthenticated;
    } catch (error) {
      console.error('Authentication check failed:', error);
      setSessionHealthy(false);
      return false;
    }
  };

  // ✅ STANDARDIZED AMOUNT CALCULATION
  const calculateTotalAmount = (records: StandardizedEditableRecord[]): number => {
    return records
      .filter(record => !record.isDeleted)
      .reduce((sum, record) => sum + (record.amount || 0), 0);
  };

  // ✅ UNIFIED DATA FETCHING
  const { data: usageDetails, isLoading } = useQuery({
    queryKey: [`/api/invoices/${invoice.id}/usage-details`],
    enabled: isOpen,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0   // Don't cache
  });

  const { data: editHistory } = useQuery({
    queryKey: [`/api/invoices/${invoice.id}/edit-history`],
    enabled: isOpen && activeTab === "history",
    staleTime: 30000 // 30 seconds cache for history
  });

  // ✅ UNIFIED EDIT MUTATION WITH COMPLETE SYNC
  const editMutation = useMutation({
    mutationFn: async (editData: UnifiedInvoiceEditRequest): Promise<UnifiedInvoiceEditResponse> => {
      setIsProcessing(true);

      // Pre-edit validation
      const isAuthenticated = await checkAuthenticationStatus();
      if (!isAuthenticated) {
        throw new Error("جلسه منقضی شده است. لطفاً صفحه را بازخوانی کنید.");
      }

      // Single unified endpoint for all invoice edits
      const response = await apiRequest('/api/invoices/unified-edit', {
        method: 'POST',
        data: editData
      });

      return response;
    },
    onSuccess: async (result: UnifiedInvoiceEditResponse) => {
      console.log(`✅ UNIFIED EDIT SUCCESS: Transaction ${result.transactionId}`);

      // ✅ COMPREHENSIVE CACHE INVALIDATION
      const invalidationPromises = [
        // Invoice-specific
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoice.id}/usage-details`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoice.id}/edit-history`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/invoices'] }),

        // Representative-specific
        queryClient.invalidateQueries({ queryKey: ['/api/representatives'] }),
        queryClient.invalidateQueries({ queryKey: [`/api/representatives/${representativeCode}`] }),

        // Global financial data
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/unified-financial/summary'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/unified-financial/debtors'] })
      ];

      await Promise.all(invalidationPromises);

      setIsProcessing(false);
      setEditMode(false);
      setIsOpen(false);

      if (onEditComplete) {
        onEditComplete();
      }

      toast({
        title: "ویرایش موفق",
        description: `فاکتور ${invoice.invoiceNumber} با موفقیت ویرایش شد - آمار مالی همگام‌سازی شد`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      console.error('Unified edit error:', error);

      const errorMessage = error?.message || 'خطای ناشناخته در ویرایش فاکتور';

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

  // ✅ RECORD MANAGEMENT
  const generateId = () => `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addNewRecord = () => {
    const newRecord: StandardizedEditableRecord = {
      id: generateId(),
      admin_username: 'current_user', // Will be determined by backend
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

  const updateRecord = (id: string, field: keyof StandardizedEditableRecord, value: any) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        const updated = { ...record, [field]: value, isModified: !record.isNew };
        return updated;
      }
      return record;
    }));
  };

  const deleteRecord = (id: string) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        return { ...record, isDeleted: true };
      }
      return record;
    }));
  };

  const restoreRecord = (id: string) => {
    setEditableRecords(prev => prev.map(record => {
      if (record.id === id) {
        return { ...record, isDeleted: false };
      }
      return record;
    }));
  };

  // ✅ INITIALIZATION
  useEffect(() => {
    if ((usageDetails as any)?.records && Array.isArray((usageDetails as any).records) && !editMode) {
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
    }
  }, [usageDetails, editMode, invoice.amount]);

  // ✅ REAL-TIME AMOUNT CALCULATION
  useEffect(() => {
    const newAmount = calculateTotalAmount(editableRecords);
    setCalculatedAmount(newAmount);
  }, [editableRecords]);

  // ✅ CLEANUP
  useEffect(() => {
    if (!isOpen) {
      setEditMode(false);
      setEditReason("");
      setActiveTab("edit");
      setSessionHealthy(true);
    }
  }, [isOpen]);

  // ✅ EDIT OPERATIONS
  const startEditing = async () => {
    const isAuthenticated = await checkAuthenticationStatus();
    if (!isAuthenticated) {
      toast({
        title: "خطای احراز هویت",
        description: "لطفاً مجدداً وارد شوید",
        variant: "destructive"
      });
      return;
    }
    setEditMode(true);
  };

  const cancelEditing = () => {
    setEditMode(false);
    setEditReason("");
    // Reset to original data
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

  const saveChanges = async () => {
    // ✅ COMPREHENSIVE VALIDATION
    if (!editReason.trim()) {
      toast({
        title: "خطای اعتبارسنجی",
        description: "لطفاً دلیل ویرایش را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    const activeRecords = editableRecords.filter(record => !record.isDeleted);

    if (activeRecords.length === 0) {
      toast({
        title: "خطای اعتبارسنجی",
        description: "حداقل یک رکورد باید وجود داشته باشد",
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    // ✅ UNIFIED EDIT REQUEST
    const editRequest: UnifiedInvoiceEditRequest = {
      invoiceId: invoice.id,
      representativeCode: representativeCode,
      editReason: editReason,
      originalAmount: parseFloat(invoice.amount),
      editedAmount: calculatedAmount,
      editedBy: 'current_user', // Will be determined by backend
      records: activeRecords,
      requiresFinancialSync: calculatedAmount !== parseFloat(invoice.amount)
    };

    console.log(`💰 UNIFIED EDIT: Amount change: ${editRequest.editedAmount - editRequest.originalAmount} تومان`);
    editMutation.mutate(editRequest);
  };

  // ✅ UI HELPER FUNCTIONS
  const getRecordBadgeColor = (record: StandardizedEditableRecord) => {
    if (record.isDeleted) return "destructive";
    if (record.isNew) return "default";
    if (record.isModified) return "secondary";
    return "outline";
  };

  const getRecordBadgeText = (record: StandardizedEditableRecord) => {
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
            ویرایش یکپارچه فاکتور {invoice.invoiceNumber}
            {!sessionHealthy && (
              <Badge variant="destructive" className="ml-2">
                جلسه نامعتبر
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">ویرایش جزئیات</TabsTrigger>
            <TabsTrigger value="history">تاریخچه ویرایش</TabsTrigger>
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
                  سیستم ویرایش یکپارچه فعال
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
                        ذخیره یکپارچه
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
                            <CheckCircle className="w-4 h-4 text-green-500" />
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
