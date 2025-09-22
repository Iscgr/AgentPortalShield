
import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Printer,
  Calendar,
  Filter,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  CheckSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { toPersianDigits } from '@/lib/persian-date';

interface ExportConfig {
  type: 'FINANCIAL' | 'REPRESENTATIVES' | 'INVOICES' | 'PAYMENTS' | 'ANALYTICS' | 'CUSTOM';
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  dateRange: {
    from: string;
    to: string;
  };
  filters: {
    representatives?: number[];
    status?: string[];
    categories?: string[];
  };
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeCharts: boolean;
  includeSummary: boolean;
  customQuery?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Partial<ExportConfig>;
  isBuiltIn: boolean;
}

const builtInTemplates: ReportTemplate[] = [
  {
    id: 'financial-summary',
    name: 'گزارش خلاصه مالی',
    description: 'خلاصه وضعیت مالی تمام نمایندگان',
    type: 'FINANCIAL',
    config: {
      type: 'FINANCIAL',
      format: 'PDF',
      includeCharts: true,
      includeSummary: true,
      columns: ['representative', 'totalSales', 'totalDebt', 'paymentRatio', 'debtLevel']
    },
    isBuiltIn: true
  },
  {
    id: 'invoices-detailed',
    name: 'گزارش تفصیلی فاکتورها',
    description: 'جزئیات کامل تمام فاکتورها',
    type: 'INVOICES',
    config: {
      type: 'INVOICES',
      format: 'EXCEL',
      includeCharts: false,
      includeSummary: true,
      columns: ['invoiceNumber', 'representativeName', 'amount', 'status', 'issueDate', 'dueDate']
    },
    isBuiltIn: true
  },
  {
    id: 'representatives-performance',
    name: 'گزارش عملکرد نمایندگان',
    description: 'تحلیل عملکرد و رتبه‌بندی نمایندگان',
    type: 'REPRESENTATIVES',
    config: {
      type: 'REPRESENTATIVES',
      format: 'PDF',
      includeCharts: true,
      includeSummary: true,
      columns: ['name', 'code', 'totalSales', 'invoiceCount', 'paymentRatio', 'debtLevel']
    },
    isBuiltIn: true
  },
  {
    id: 'payments-analysis',
    name: 'تحلیل پرداخت‌ها',
    description: 'بررسی الگوهای پرداخت و تخصیص',
    type: 'PAYMENTS',
    config: {
      type: 'PAYMENTS',
      format: 'EXCEL',
      includeCharts: true,
      includeSummary: true,
      columns: ['representativeName', 'amount', 'paymentDate', 'isAllocated', 'description']
    },
    isBuiltIn: true
  }
];

export function AdvancedExportEngine() {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'FINANCIAL',
    format: 'PDF',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    filters: {},
    columns: [],
    includeCharts: true,
    includeSummary: true
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customTemplates, setCustomTemplates] = useState<ReportTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch available data for filters
  const { data: representatives } = useQuery({
    queryKey: ['/api/representatives'],
    queryFn: () => apiRequest('/api/representatives')
  });

  const exportMutation = useMutation({
    mutationFn: async (config: ExportConfig) => {
      setIsGenerating(true);
      const response = await apiRequest('/api/export/generate', {
        method: 'POST',
        data: config
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "گزارش آماده شد",
          description: `گزارش ${data.filename} با موفقیت تولید و دانلود شد`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تولید گزارش",
        description: error.message || 'لطفاً دوباره تلاش کنید',
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const availableColumns = {
    FINANCIAL: [
      { id: 'representative', label: 'نماینده' },
      { id: 'totalSales', label: 'فروش کل' },
      { id: 'totalDebt', label: 'بدهی کل' },
      { id: 'totalPaid', label: 'پرداخت شده' },
      { id: 'paymentRatio', label: 'نسبت پرداخت' },
      { id: 'debtLevel', label: 'سطح بدهی' },
      { id: 'lastTransaction', label: 'آخرین تراکنش' }
    ],
    REPRESENTATIVES: [
      { id: 'name', label: 'نام فروشگاه' },
      { id: 'code', label: 'کد نماینده' },
      { id: 'ownerName', label: 'صاحب فروشگاه' },
      { id: 'phone', label: 'تلفن' },
      { id: 'isActive', label: 'وضعیت' },
      { id: 'totalSales', label: 'فروش کل' },
      { id: 'invoiceCount', label: 'تعداد فاکتور' },
      { id: 'createdAt', label: 'تاریخ ایجاد' }
    ],
    INVOICES: [
      { id: 'invoiceNumber', label: 'شماره فاکتور' },
      { id: 'representativeName', label: 'نماینده' },
      { id: 'amount', label: 'مبلغ' },
      { id: 'status', label: 'وضعیت' },
      { id: 'issueDate', label: 'تاریخ صدور' },
      { id: 'dueDate', label: 'سررسید' },
      { id: 'sentToTelegram', label: 'ارسال به تلگرام' }
    ],
    PAYMENTS: [
      { id: 'representativeName', label: 'نماینده' },
      { id: 'amount', label: 'مبلغ' },
      { id: 'paymentDate', label: 'تاریخ پرداخت' },
      { id: 'isAllocated', label: 'تخصیص یافته' },
      { id: 'description', label: 'توضیحات' },
      { id: 'invoiceId', label: 'شماره فاکتور مرتبط' }
    ],
    ANALYTICS: [
      { id: 'metric', label: 'متریک' },
      { id: 'value', label: 'مقدار' },
      { id: 'trend', label: 'روند' },
      { id: 'period', label: 'دوره' }
    ],
    CUSTOM: []
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = [...builtInTemplates, ...customTemplates].find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setExportConfig(prev => ({ ...prev, ...template.config }));
    }
  };

  const handleGenerate = () => {
    if (!exportConfig.columns.length) {
      toast({
        title: "خطا در تنظیمات",
        description: "لطفاً حداقل یک ستون برای گزارش انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    exportMutation.mutate(exportConfig);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return <FileText className="w-4 h-4" />;
      case 'EXCEL': return <FileSpreadsheet className="w-4 h-4" />;
      case 'CSV': return <File className="w-4 h-4" />;
      case 'JSON': return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Download className="w-8 h-8 mr-3 text-blue-600" />
            موتور گزارش‌گیری پیشرفته
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تولید گزارش‌های تخصصی و قابل تنظیم از داده‌های سیستم
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">قالب‌های آماده</TabsTrigger>
          <TabsTrigger value="custom">گزارش سفارشی</TabsTrigger>
          <TabsTrigger value="scheduled">گزارش‌های زمان‌بندی شده</TabsTrigger>
          <TabsTrigger value="history">سابقه گزارش‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builtInTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {getFormatIcon(template.config.format || 'PDF')}
                      <h3 className="font-semibold">{template.name}</h3>
                    </div>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {template.config.includeCharts && <BarChart3 className="w-4 h-4 text-blue-600" />}
                      {template.config.includeSummary && <CheckSquare className="w-4 h-4 text-green-600" />}
                    </div>
                    <Button
                      onClick={() => {
                        handleTemplateSelect(template.id);
                        handleGenerate();
                      }}
                      disabled={isGenerating}
                      size="sm"
                    >
                      {isGenerating ? 'در حال تولید...' : 'تولید گزارش'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>تنظیمات کلی</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع گزارش</Label>
                      <Select
                        value={exportConfig.type}
                        onValueChange={(value: any) => 
                          setExportConfig(prev => ({ ...prev, type: value, columns: [] }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FINANCIAL">مالی</SelectItem>
                          <SelectItem value="REPRESENTATIVES">نمایندگان</SelectItem>
                          <SelectItem value="INVOICES">فاکتورها</SelectItem>
                          <SelectItem value="PAYMENTS">پرداخت‌ها</SelectItem>
                          <SelectItem value="ANALYTICS">تحلیلی</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>فرمت خروجی</Label>
                      <Select
                        value={exportConfig.format}
                        onValueChange={(value: any) => 
                          setExportConfig(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="EXCEL">Excel</SelectItem>
                          <SelectItem value="CSV">CSV</SelectItem>
                          <SelectItem value="JSON">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>از تاریخ</Label>
                      <Input
                        type="date"
                        value={exportConfig.dateRange.from}
                        onChange={(e) => 
                          setExportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, from: e.target.value }
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>تا تاریخ</Label>
                      <Input
                        type="date"
                        value={exportConfig.dateRange.to}
                        onChange={(e) => 
                          setExportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, to: e.target.value }
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        checked={exportConfig.includeCharts}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includeCharts: !!checked }))
                        }
                      />
                      <Label>شامل نمودارها</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        checked={exportConfig.includeSummary}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includeSummary: !!checked }))
                        }
                      />
                      <Label>شامل خلاصه</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>انتخاب ستون‌ها</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {availableColumns[exportConfig.type]?.map((column) => (
                      <div key={column.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          checked={exportConfig.columns.includes(column.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setExportConfig(prev => ({
                                ...prev,
                                columns: [...prev.columns, column.id]
                              }));
                            } else {
                              setExportConfig(prev => ({
                                ...prev,
                                columns: prev.columns.filter(c => c !== column.id)
                              }));
                            }
                          }}
                        />
                        <Label>{column.label}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {representatives && representatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>فیلتر نمایندگان</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {representatives.slice(0, 12).map((rep: any) => (
                        <div key={rep.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            checked={exportConfig.filters.representatives?.includes(rep.id) || false}
                            onCheckedChange={(checked) => {
                              const current = exportConfig.filters.representatives || [];
                              if (checked) {
                                setExportConfig(prev => ({
                                  ...prev,
                                  filters: {
                                    ...prev.filters,
                                    representatives: [...current, rep.id]
                                  }
                                }));
                              } else {
                                setExportConfig(prev => ({
                                  ...prev,
                                  filters: {
                                    ...prev.filters,
                                    representatives: current.filter(id => id !== rep.id)
                                  }
                                }));
                              }
                            }}
                          />
                          <Label className="text-sm">{rep.name}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    پیش‌نمایش تنظیمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">نوع:</span>
                      <Badge>{exportConfig.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">فرمت:</span>
                      <Badge variant="outline">
                        {getFormatIcon(exportConfig.format)}
                        <span className="mr-1">{exportConfig.format}</span>
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ستون‌ها:</span>
                      <Badge variant="secondary">
                        {toPersianDigits(exportConfig.columns.length.toString())}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">فیلترها:</span>
                      <Badge variant="secondary">
                        {toPersianDigits((exportConfig.filters.representatives?.length || 0).toString())}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !exportConfig.columns.length}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        در حال تولید...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        تولید گزارش
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ستون‌های انتخاب شده</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exportConfig.columns.map((columnId, index) => {
                      const column = availableColumns[exportConfig.type]?.find(c => c.id === columnId);
                      return (
                        <div key={columnId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm">{column?.label}</span>
                          <span className="text-xs text-gray-500">
                            {toPersianDigits((index + 1).toString())}
                          </span>
                        </div>
                      );
                    })}
                    {exportConfig.columns.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        هیچ ستونی انتخاب نشده
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">قابلیت زمان‌بندی گزارش‌ها</h3>
              <p className="text-gray-500">این قابلیت در نسخه‌های آینده اضافه خواهد شد</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">سابقه گزارش‌ها</h3>
              <p className="text-gray-500">سابقه گزارش‌های تولید شده در اینجا نمایش داده خواهد شد</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdvancedExportEngine;
