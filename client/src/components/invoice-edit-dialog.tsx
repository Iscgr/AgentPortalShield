import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  History,
  Calculator,
  RotateCcw,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits, getCurrentPersianDate } from "@/lib/persian-date";

// Generate unique ID for records
const generateId = () => Math.random().toString(36).substring(2, 15);

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
  const { user } = useAuth();

  // ✅ SHERLOCK v24.1: Authentication check
  if (!user || !user.authenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled>
            <Edit3 className="w-4 h-4 mr-2" />
            ویرایش ریز جزئیات (نیاز به ورود مجدد)
          </Button>
        </DialogTrigger>
      </Dialog>
    );
  }

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

  // Edit mutation with financial synchronization
  const editMutation = useMutation({
    mutationFn: async (editData: any) => {
      setIsProcessing(true);
      
      // Ensure session is healthy before attempting to save
      await checkSessionHealth();
      if (!sessionHealthy) {
        throw new Error("جلسه منقضی شده است. لطفاً صفحه را بازخوانی کنید.");
      }
      
      const response = await apiRequest('/api/invoices/edit', { method: 'POST', data: editData });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ذخیره تغییرات');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      const transactionId = data.transactionId;
      const editId = data.editId;
      const amountDifference = calculatedAmount - originalAmount;

      toast({
        title: "فاکتور ویرایش شد",
        description: `تغییرات با موفقیت ذخیره شد | تراکنش: ${transactionId?.slice(-8) || 'نامشخص'} | تفاوت: ${formatCurrency(amountDifference.toString())} تومان`,
      });

      // ✅ SHERLOCK v24.1: Force financial synchronization
      try {
        if (Math.abs(amountDifference) > 0) {
          console.log(`🔄 SHERLOCK v24.1: Synchronizing financial data for representative ${representativeCode}, amount difference: ${amountDifference}`);

          // Force sync representative debt immediately
          await apiRequest(`/api/unified-financial/sync-representative/${representativeCode}`, {
            method: 'POST',
            data: { 
              amountDifference,
              newTotalAmount: calculatedAmount,
              oldTotalAmount: originalAmount,
              invoiceId: invoice.id,
              reason: 'INVOICE_EDIT_SYNC'
            }
          });

          // Force invalidate all financial caches
          queryClient.invalidateQueries({ queryKey: ['/api/unified-financial'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          queryClient.invalidateQueries({ queryKey: [`/api/unified-financial/representative`] });

          console.log(`✅ SHERLOCK v24.1: Financial synchronization completed for representative ${representativeCode}`);
        }
      } catch (syncError) {
        console.warn('⚠️ Financial sync warning (non-critical):', syncError);
      }

      // Mark all records as saved (remove modified/new flags)
      setEditableRecords(prevRecords => 
        prevRecords
          .filter(record => !record.isDeleted)
          .map(record => ({
            ...record,
            isNew: false,
            isModified: false
          }))
      );

      setEditMode(false);
      setEditReason("");
      setIsProcessing(false);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/representatives/${representativeCode}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoice.id}/edit-history`] });

      onEditComplete?.();
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "خطا در ویرایش فاکتور",
        description: error.message || 'خطای ناشناخته در ویرایش فاکتور',
        variant: "destructive",
      });
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
      setOriginalAmount(parseFloat(invoice.amount)); // Store original for comparison
      setIsInitialized(true);

      console.log(`🧮 SHERLOCK v24.1: Initialized invoice edit - Original: ${invoice.amount}, Calculated: ${initialAmount}`);
    }
  }, [usageDetails, isInitialized, editMode, invoice.amount]);

  // Reset initialization when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      setEditMode(false);
      setEditReason("");
      setActiveTab("edit");
      setSessionHealthy(true); // Reset session health on close
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
    }
  }, [isOpen]);

  // Calculate total amount
  const calculateTotalAmount = (records: EditableUsageRecord[]) => {
    return records
      .filter(record => !record.isDeleted)
      .reduce((total, record) => total + (record.amount || 0), 0);
  };

  // Update calculated amount when records change
  useEffect(() => {
    if (editMode) {
      const newAmount = calculateTotalAmount(editableRecords);
      setCalculatedAmount(newAmount);
    }
  }, [editableRecords, editMode]);

  const startEdit = () => {
    setEditMode(true);
    setEditReason("");
    setSessionHealthy(true); // Assume healthy at start of edit

    // Start session monitoring every 30 seconds during edit
    const interval = setInterval(checkSessionHealth, 30000);
    setSessionCheckInterval(interval);

    // Initial session check
    checkSessionHealth();
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditReason("");
    // Reset records to original state from fresh data
    if ((usageDetails as any)?.records && Array.isArray((usageDetails as any).records)) {
      const originalRecords = ((usageDetails as any).records as any[]).map((record: any) => ({
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
      setEditableRecords(originalRecords);
      setCalculatedAmount(calculateTotalAmount(originalRecords));
    }

    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      setSessionCheckInterval(null);
    }
    setSessionHealthy(true); // Reset session health on cancel
  };

  const addNewRecord = () => {
    const newRecord: EditableUsageRecord = {
      id: generateId(),
      admin_username: representativeCode || '',
      event_timestamp: getCurrentPersianDate(),
      event_type: 'CREATE',
      description: '',
      amount: 0,
      isNew: true,
      isModified: false,
      isDeleted: false
    };
    setEditableRecords([...editableRecords, newRecord]);
  };

  const updateRecord = (id: string, field: keyof EditableUsageRecord, value: any) => {
    setEditableRecords(records =>
      records.map(record =>
        record.id === id
          ? { 
              ...record, 
              [field]: value, 
              isModified: !record.isNew ? true : record.isModified 
            }
          : record
      )
    );
  };

  const deleteRecord = (id: string) => {
    setEditableRecords(records =>
      records.map(record =>
        record.id === id
          ? { ...record, isDeleted: true }
          : record
      )
    );
  };

  const restoreRecord = (id: string) => {
    setEditableRecords(records =>
      records.map(record =>
        record.id === id
          ? { ...record, isDeleted: false }
          : record
      )
    );
  };

  const removeNewRecord = (id: string) => {
    setEditableRecords(records => records.filter(record => record.id !== id));
  };

  const validateAndSave = () => {
    const errors: string[] = [];
    const activeRecords = editableRecords.filter(r => !r.isDeleted);

    if (activeRecords.length === 0) {
      errors.push("حداقل یک رکورد فعال باید وجود داشته باشد");
    }

    activeRecords.forEach((record, index) => {
      if (!record.admin_username) {
        errors.push(`رکورد ${index + 1}: نام ادمین الزامی است`);
      }
      if (!record.amount || record.amount <= 0) {
        errors.push(`رکورد ${index + 1}: مبلغ باید بزرگتر از صفر باشد`);
      }
      if (!record.event_timestamp) {
        errors.push(`رکورد ${index + 1}: زمان رویداد الزامی است`);
      }
    });

    if (!editReason.trim()) {
      errors.push("دلیل ویرایش الزامی است");
    }

    if (errors.length > 0) {
      toast({
        title: "خطا در اعتبارسنجی",
        description: errors.join('\n'),
        variant: "destructive",
      });
      return;
    }

    // Prepare edit data
    const editData = {
      invoiceId: invoice.id,
      originalUsageData: (usageDetails as any)?.usageData || {},
      editedUsageData: {
        ...((usageDetails as any)?.usageData || {}),
        records: activeRecords.map(r => ({
          admin_username: r.admin_username,
          event_timestamp: r.event_timestamp,
          event_type: r.event_type,
          description: r.description,
          amount: r.amount
        })),
        totalRecords: activeRecords.length,
        usage_amount: calculatedAmount
      },
      editType: 'MANUAL_EDIT',
      editReason: editReason,
      originalAmount: parseFloat(invoice.amount),
      editedAmount: calculatedAmount,
      editedBy: user.username // Use username from auth context
    };

    editMutation.mutate(editData);
  };

  // Session health monitoring - using the same auth system as invoice edit
  const checkSessionHealth = async () => {
    try {
      // Use the same apiRequest method as the edit mutation to ensure consistency
      const response = await apiRequest('/api/unified-financial/session-health', { 
        method: 'GET' 
      });

      if (response.ok) {
        const result = await response.json();
        setSessionHealthy(result.healthy);
        if (!result.healthy) {
          toast({
            title: "جلسه منقضی شده",
            description: "جلسه شما منقضی شده است. لطفاً صفحه را بازخوانی کنید.",
            variant: "destructive",
          });
          // Clear the interval and prevent further saves
          if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
            setSessionCheckInterval(null);
          }
        }
      } else {
        setSessionHealthy(false);
        toast({
          title: "خطای اتصال",
          description: "اتصال به سرور قطع شده است.",
          variant: "destructive",
        });
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
          setSessionCheckInterval(null);
        }
      }
    } catch (error) {
      console.error('Session health check failed:', error);
      setSessionHealthy(false);
      toast({
        title: "خطای بررسی جلسه",
        description: "خطا در بررسی وضعیت جلسه",
        variant: "destructive",
      });
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        setSessionCheckInterval(null);
      }
    }
  };

  // Simplified session health check - only on critical operations
  useEffect(() => {
    if (isOpen && editMode) {
      // Only check session health when starting edit mode
      checkSessionHealth();
    }
  }, [isOpen, editMode]);

  const getRecordRowClass = (record: EditableUsageRecord) => {
    if (record.isDeleted) return "bg-red-50 dark:bg-red-900/20 opacity-60";
    if (record.isNew) return "bg-green-50 dark:bg-green-900/20";
    if (record.isModified) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "";
  };

  const getRecordBadge = (record: EditableUsageRecord) => {
    if (record.isDeleted) return <Badge variant="destructive">حذف شده</Badge>;
    if (record.isNew) return <Badge variant="default">جدید</Badge>;
    if (record.isModified) return <Badge variant="secondary">ویرایش شده</Badge>;
    return null;
  };

  const handleSave = async () => {
    if (!invoice) return;

    // Check session health before save using the same authentication method
    await checkSessionHealth();
    if (!sessionHealthy) {
      toast({
        title: "جلسه منقضی شده",
        description: "جلسه شما منقضی شده است. لطفاً صفحه را بازخوانی و مجدداً وارد شوید.",
        variant: "destructive",
      });
      return;
    }

    if (!editMode) { // If not in edit mode, just open the dialog
      setIsOpen(true);
      return;
    }

    // Proceed with validation and saving if in edit mode
    validateAndSave();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit3 className="w-4 h-4 mr-2" />
            ویرایش ریز جزئیات
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto rtl">
          <div className="p-8 text-center">در حال بارگذاری...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit3 className="w-4 h-4 mr-2" />
          ویرایش ریز جزئیات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-between">
            <div className="flex items-center gap-2">
              {sessionHealthy ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={sessionHealthy ? "text-green-600" : "text-red-600"}>
                {sessionHealthy ? "متصل" : "قطع شده"}
              </span>
            </div>
            ویرایش فاکتور {invoice?.invoiceNumber || invoice?.id}
          </DialogTitle>
          <DialogDescription>
            نماینده: {representativeCode} | مبلغ فعلی: {formatCurrency(invoice.amount)} تومان
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">ویرایش جزئیات</TabsTrigger>
            <TabsTrigger value="history">تاریخچه تغییرات</TabsTrigger>
            <TabsTrigger value="transactions">تراکنش‌های مالی</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>خلاصه فاکتور</span>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {!editMode ? (
                      <Button onClick={startEdit} disabled={!sessionHealthy}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        شروع ویرایش
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={cancelEdit}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          انصراف
                        </Button>
                        <Button 
                          onClick={handleSave} 
                          disabled={editMutation.isPending || isProcessing || editableRecords.filter(r => !r.isDeleted).length === 0 || !sessionHealthy}
                          className={Math.abs(calculatedAmount - parseFloat(invoice.amount)) > 0.01 ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editMutation.isPending || isProcessing 
                            ? "در حال ذخیره و همگام‌سازی..." 
                            : Math.abs(calculatedAmount - parseFloat(invoice.amount)) > 0.01
                            ? `ذخیره تغییرات (${calculatedAmount > parseFloat(invoice.amount) ? '+' : ''}${formatCurrency((calculatedAmount - parseFloat(invoice.amount)).toString())})`
                            : "ذخیره تغییرات"
                          }
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">مبلغ اصلی فاکتور</p>
                    <p className="text-xl font-bold">{formatCurrency(invoice.amount)} تومان</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {editMode ? 'مبلغ محاسبه شده (زنده)' : 'مبلغ محاسبه شده'}
                      {editMode && <span className="text-xs text-blue-500 mr-2">🔄 Real-time</span>}
                    </p>
                    <p className={`text-xl font-bold transition-colors duration-300 ${
                      Math.abs(calculatedAmount - parseFloat(invoice.amount)) < 0.01
                        ? 'text-green-600 dark:text-green-400' 
                        : editMode
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {formatCurrency(calculatedAmount.toString())} تومان
                    </p>
                    {editMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        تعداد آیتم‌های فعال: {toPersianDigits(editableRecords.filter(r => !r.isDeleted).length.toString())}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">تفاوت مبلغ</p>
                    <p className={`text-xl font-bold transition-colors duration-300 ${
                      Math.abs(calculatedAmount - parseFloat(invoice.amount)) < 0.01
                        ? 'text-gray-600 dark:text-gray-400'
                        : calculatedAmount - parseFloat(invoice.amount) > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {calculatedAmount - parseFloat(invoice.amount) > 0 ? '+' : ''}
                      {formatCurrency((calculatedAmount - parseFloat(invoice.amount)).toString())} تومان
                    </p>
                    {editMode && Math.abs(calculatedAmount - parseFloat(invoice.amount)) > 0.01 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {calculatedAmount > parseFloat(invoice.amount) ? '↗️ افزایش' : '↘️ کاهش'} مبلغ فاکتور
                      </p>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">دلیل ویرایش (الزامی)</label>
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="دلیل ویرایش این فاکتور را وارد کنید..."
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Controls */}
            {editMode && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button onClick={addNewRecord} variant="outline" disabled={!sessionHealthy}>
                  <Plus className="w-4 h-4 mr-2" />
                  افزودن رکورد جدید
                </Button>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  تعداد رکوردهای فعال: {toPersianDigits(editableRecords.filter(r => !r.isDeleted).length.toString())}
                </div>
              </div>
            )}

            {/* Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>ریز جزئیات مصرف</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>نام کاربری ادمین</TableHead>
                      <TableHead>زمان رویداد</TableHead>
                      <TableHead>نوع رویداد</TableHead>
                      <TableHead>توضیحات</TableHead>
                      <TableHead>مبلغ (تومان)</TableHead>
                      {editMode && <TableHead>عملیات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableRecords.map((record) => (
                      <TableRow key={record.id} className={getRecordRowClass(record)}>
                        <TableCell>
                          {getRecordBadge(record)}
                        </TableCell>
                        <TableCell>
                          {editMode && !record.isDeleted ? (
                            <Input
                              value={record.admin_username}
                              onChange={(e) => updateRecord(record.id, 'admin_username', e.target.value)}
                              className="min-w-[120px]"
                            />
                          ) : (
                            record.admin_username
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode && !record.isDeleted ? (
                            <Input
                              value={record.event_timestamp}
                              onChange={(e) => updateRecord(record.id, 'event_timestamp', e.target.value)}
                              placeholder="1404/5/15 14:30:00"
                              className="min-w-[150px]"
                            />
                          ) : (
                            record.event_timestamp
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode && !record.isDeleted ? (
                            <Select
                              value={record.event_type}
                              onValueChange={(value) => updateRecord(record.id, 'event_type', value)}
                            >
                              <SelectTrigger className="min-w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CREATE">CREATE</SelectItem>
                                <SelectItem value="RENEWAL">RENEWAL</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">{record.event_type}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode && !record.isDeleted ? (
                            <Textarea
                              value={record.description}
                              onChange={(e) => updateRecord(record.id, 'description', e.target.value)}
                              className="min-w-[200px] min-h-[60px]"
                              placeholder="توضیحات رویداد..."
                            />
                          ) : (
                            <div className="max-w-[200px] text-sm">{record.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode && !record.isDeleted ? (
                            <Input
                              type="number"
                              value={record.amount}
                              onChange={(e) => updateRecord(record.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="min-w-[120px]"
                            />
                          ) : (
                            <span className="font-medium">
                              {formatCurrency(record.amount.toString())}
                            </span>
                          )}
                        </TableCell>
                        {editMode && (
                          <TableCell>
                            <div className="flex items-center space-x-1 space-x-reverse">
                              {record.isDeleted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => restoreRecord(record.id)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => record.isNew ? removeNewRecord(record.id) : deleteRecord(record.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <History className="w-5 h-5" />
                  <span>تاریخچه ویرایش‌ها</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editHistory && Array.isArray(editHistory) && editHistory.length > 0 ? (
                  <div className="space-y-4">
                    {editHistory.map((edit: any) => (
                      <div key={edit.id} className="border-r-4 border-blue-500 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">ویرایش توسط: {edit.editedBy}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              نوع ویرایش: {edit.editType}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              مبلغ از {formatCurrency(edit.originalAmount)} به {formatCurrency(edit.editedAmount)} تغییر یافت
                            </div>
                            {edit.editReason && (
                              <div className="text-sm text-gray-500 mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <strong>دلیل:</strong> {edit.editReason}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(edit.createdAt).toLocaleString('fa-IR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    هیچ ویرایشی برای این فاکتور ثبت نشده است
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <Calculator className="w-5 h-5" />
                  <span>تراکنش‌های مالی اتمیک</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financialTransactions && Array.isArray(financialTransactions) && financialTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {financialTransactions
                      .filter((tx: any) => tx.relatedEntityId === invoice.id && tx.relatedEntityType === 'invoice')
                      .map((transaction: any) => (
                      <div key={transaction.id} className="border-r-4 border-green-500 pr-4 py-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="font-medium">
                              شناسه تراکنش: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{transaction.transactionId}</code>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              نوع: <Badge variant="outline">{transaction.type}</Badge>
                              وضعیت: <Badge variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}>{transaction.status}</Badge>
                            </div>
                            {transaction.financialImpact && (
                              <div className="text-sm">
                                تأثیر مالی: {transaction.financialImpact.debtChange > 0 ? '+' : ''}{formatCurrency(transaction.financialImpact.debtChange?.toString() || '0')} تومان
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              ایجاد شده توسط: {transaction.initiatedBy}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.completedAt ? new Date(transaction.completedAt).toLocaleString('fa-IR') : 'در حال پردازش'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    هیچ تراکنش مالی برای این فاکتور ثبت نشده است
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