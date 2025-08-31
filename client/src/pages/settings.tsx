import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Save,
  TestTube,
  Bot,
  Send,
  Key,
  MessageSquare,
  Palette,
  Bell,
  Shield,
  FileText,
  Globe,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Database,
  SendToBack,
  Brain,
  CheckSquare,
  Target,
  BarChart,
  Users,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianDigits } from "@/lib/persian-date";
import { FinancialIntegrityDashboard } from '../components/financial-integrity-dashboard';
import { BatchRollbackManager } from '../components/batch-rollback-manager';
import { MultiGroupConfiguration } from '../components/multi-group-configuration';

// Import default template function
const getDefaultTelegramTemplate = () => `📋 فاکتور شماره {invoice_number}

🏪 نماینده: {representative_name}
👤 صاحب فروشگاه: {shop_owner}
📱 شناسه پنل: {panel_id}
💰 مبلغ فاکتور: {amount} تومان
📅 تاریخ صدور: {issue_date}
🔍 وضعیت: {status}

ℹ️ برای مشاهده جزئیات کامل فاکتور، وارد لینک زیر بشوید

{portal_link}

تولید شده توسط سیستم مدیریت مالی 🤖`;

const telegramSettingsSchema = z.object({
  botToken: z.string().min(1, "توکن ربات الزامی است"),
  chatId: z.string().min(1, "شناسه چت الزامی است"),
  template: z.string().min(1, "قالب پیام الزامی است"),
});

const portalSettingsSchema = z.object({
  portalTitle: z.string().min(1, "عنوان پورتال الزامی است"),
  portalDescription: z.string().optional(),
  showOwnerName: z.boolean(),
  showDetailedUsage: z.boolean(),
  customCss: z.string().optional(),
});

const invoiceTemplateSchema = z.object({
  invoiceHeader: z.string().min(1, "سربرگ فاکتور الزامی است"),
  invoiceFooter: z.string().optional(),
  showUsageDetails: z.boolean(),
  usageFormat: z.string().optional(),
  usageTableColumns: z.string().optional(), // Column configuration for usage details table
  showEventTimestamp: z.boolean().default(true),
  showEventType: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  showAdminUsername: z.boolean().default(true),
});



const aiSettingsSchema = z.object({
  xaiApiKey: z.string().min(1, "کلید xAI Grok الزامی است"),
  enableAutoAnalysis: z.boolean(),
  analysisFrequency: z.string(),
  // General AI Settings
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(8000).default(1000),
  defaultModel: z.string().default("grok-code-fast-1"),
  // Cultural Intelligence
  culturalSensitivity: z.number().min(0).max(1).default(0.95),
  religiousSensitivity: z.number().min(0).max(1).default(0.9),
  languageFormality: z.enum(["FORMAL", "RESPECTFUL", "CASUAL"]).default("RESPECTFUL"),
  persianPoetryIntegration: z.boolean().default(true),
  culturalMetaphors: z.boolean().default(true),
  // Behavior Settings
  proactivityLevel: z.number().min(0).max(1).default(0.8),
  confidenceThreshold: z.number().min(0).max(1).default(0.75),
  learningRate: z.number().min(0).max(1).default(0.1),
  creativityLevel: z.number().min(0).max(1).default(0.6),
  riskTolerance: z.number().min(0).max(1).default(0.3),
  // Task Management
  taskGenerationEnabled: z.boolean().default(true),
  autoAssignmentEnabled: z.boolean().default(false),
  intelligentScheduling: z.boolean().default(true),
  maxSuggestions: z.number().min(1).max(20).default(5),
  responseTimeout: z.number().min(5).max(60).default(30),
  // Security
  dataEncryption: z.boolean().default(true),
  accessLogging: z.boolean().default(true),
  // Integrations
  telegramIntegration: z.boolean().default(false),
  xaiIntegration: z.boolean().default(true)
});

const dataResetSchema = z.object({
  representatives: z.boolean().default(false),
  invoices: z.boolean().default(false),
  payments: z.boolean().default(false),
  salesPartners: z.boolean().default(false),
  settings: z.boolean().default(false),
  activityLogs: z.boolean().default(false),
});

type TelegramSettingsData = z.infer<typeof telegramSettingsSchema>;
type DataResetData = z.infer<typeof dataResetSchema>;
type AiSettingsData = z.infer<typeof aiSettingsSchema>;
type PortalSettingsData = z.infer<typeof portalSettingsSchema>;
type InvoiceTemplateData = z.infer<typeof invoiceTemplateSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("telegram");
  const [showDataCounts, setShowDataCounts] = useState(false);
  const [dataCounts, setDataCounts] = useState({
    representatives: 0,
    invoices: 0,
    payments: 0,
    salesPartners: 0,
    settings: 0,
    activityLogs: 0,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: telegramBotToken } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"]
  });

  const { data: telegramChatId } = useQuery({
    queryKey: ["/api/settings/telegram_chat_id"]
  });

  const { data: telegramTemplate } = useQuery({
    queryKey: ["/api/settings/telegram_template"]
  });



  // Fetch invoice template settings
  const { data: showUsageDetails } = useQuery({
    queryKey: ["/api/settings/invoice_show_usage_details"]
  });

  const { data: showEventTimestamp } = useQuery({
    queryKey: ["/api/settings/invoice_show_event_timestamp"]
  });

  const { data: showEventType } = useQuery({
    queryKey: ["/api/settings/invoice_show_event_type"]
  });

  const { data: showDescription } = useQuery({
    queryKey: ["/api/settings/invoice_show_description"]
  });

  const { data: showAdminUsername } = useQuery({
    queryKey: ["/api/settings/invoice_show_admin_username"]
  });

  // Fetch portal settings
  const { data: portalTitle } = useQuery({
    queryKey: ["/api/settings/portal_title"]
  });

  const { data: portalDescription } = useQuery({
    queryKey: ["/api/settings/portal_description"]
  });

  const { data: showOwnerName } = useQuery({
    queryKey: ["/api/settings/portal_show_owner_name"]
  });

  const { data: showDetailedUsage } = useQuery({
    queryKey: ["/api/settings/portal_show_detailed_usage"]
  });

  // Forms
  const telegramForm = useForm<TelegramSettingsData>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      botToken: "",
      chatId: "",
      template: getDefaultTelegramTemplate()
    }
  });

  const invoiceTemplateForm = useForm<InvoiceTemplateData>({
    resolver: zodResolver(invoiceTemplateSchema),
    defaultValues: {
      invoiceHeader: "سیستم مدیریت مالی MarFaNet",
      invoiceFooter: "",
      showUsageDetails: true,
      usageFormat: "table",
      usageTableColumns: "admin_username,event_timestamp,event_type,description,amount",
      showEventTimestamp: true,
      showEventType: true,
      showDescription: true,
      showAdminUsername: true
    }
  });



  const aiForm = useForm<AiSettingsData>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      xaiApiKey: "",
      enableAutoAnalysis: false,
      analysisFrequency: "daily",
      // General AI Settings
      temperature: 0.7,
      maxTokens: 1000,
      defaultModel: "grok-code-fast-1",
      // Cultural Intelligence
      culturalSensitivity: 0.95,
      religiousSensitivity: 0.9,
      languageFormality: "RESPECTFUL",
      persianPoetryIntegration: true,
      culturalMetaphors: true,
      // Behavior Settings
      proactivityLevel: 0.8,
      confidenceThreshold: 0.75,
      learningRate: 0.1,
      creativityLevel: 0.6,
      riskTolerance: 0.3,
      // Task Management
      taskGenerationEnabled: true,
      autoAssignmentEnabled: false,
      intelligentScheduling: true,
      maxSuggestions: 5,
      responseTimeout: 30,
      // Security
      dataEncryption: true,
      accessLogging: true,
      // Integrations
      telegramIntegration: false,
      xaiIntegration: true
    }
  });

  const dataResetForm = useForm<DataResetData>({
    resolver: zodResolver(dataResetSchema),
    defaultValues: {
      representatives: false,
      invoices: false,
      payments: false,
      salesPartners: false,
      settings: false,
      activityLogs: false,
    }
  });

  const portalForm = useForm<PortalSettingsData>({
    resolver: zodResolver(portalSettingsSchema),
    defaultValues: {
      portalTitle: "پرتال عمومی نماینده",
      portalDescription: "مشاهده وضعیت مالی و فاکتورهای شما",
      showOwnerName: true,
      showDetailedUsage: true,
      customCss: ""
    }
  });

  // Update forms when data is loaded
  useEffect(() => {
    if ((telegramBotToken as any)?.value) telegramForm.setValue('botToken', (telegramBotToken as any).value);
    if ((telegramChatId as any)?.value) telegramForm.setValue('chatId', (telegramChatId as any).value);
    if ((telegramTemplate as any)?.value) telegramForm.setValue('template', (telegramTemplate as any).value);

    // Update invoice template form with settings values
    if ((showUsageDetails as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showUsageDetails', (showUsageDetails as any).value === 'true');
    }
    if ((showEventTimestamp as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showEventTimestamp', (showEventTimestamp as any).value === 'true');
    }
    if ((showEventType as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showEventType', (showEventType as any).value === 'true');
    }
    if ((showDescription as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showDescription', (showDescription as any).value === 'true');
    }
    if ((showAdminUsername as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showAdminUsername', (showAdminUsername as any).value === 'true');
    }

    // Update portal form
    if ((portalTitle as any)?.value) portalForm.setValue('portalTitle', (portalTitle as any).value);
    if ((portalDescription as any)?.value) portalForm.setValue('portalDescription', (portalDescription as any).value);
    if ((showOwnerName as any)?.value !== undefined) {
      portalForm.setValue('showOwnerName', (showOwnerName as any).value === 'true');
    }
    if ((showDetailedUsage as any)?.value !== undefined) {
      portalForm.setValue('showDetailedUsage', (showDetailedUsage as any).value === 'true');
    }
  }, [telegramBotToken, telegramChatId, telegramTemplate, showUsageDetails, showEventTimestamp, showEventType, showDescription, showAdminUsername, portalTitle, portalDescription, showOwnerName, showDetailedUsage]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const response = await apiRequest(`/api/settings/${key}`, { method: 'PUT', data: { value } });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "تنظیمات ذخیره شد",
        description: "تغییرات با موفقیت اعمال شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ذخیره تنظیمات",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/telegram/test-connection', { method: 'POST' });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ اتصال تلگرام موفق",
        description: `ربات ${data.botInfo?.username} متصل شد`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطا در اتصال تلگرام",
        description: error.message || "لطفاً تنظیمات را بررسی کنید",
        variant: "destructive",
      });
    }
  });

  const onTelegramSubmit = async (data: TelegramSettingsData) => {
    await updateSettingMutation.mutateAsync({ key: 'telegram_bot_token', value: data.botToken });
    await updateSettingMutation.mutateAsync({ key: 'telegram_chat_id', value: data.chatId });
    await updateSettingMutation.mutateAsync({ key: 'telegram_template', value: data.template });
  };



  // xAI Grok API mutations
  const testGrokConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/settings/xai-grok/test', { method: 'POST' });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "اتصال موفق" : "اتصال ناموفق",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "خطا در تست اتصال",
        description: "لطفاً تنظیمات را بررسی کنید",
        variant: "destructive",
      });
    }
  });

  const testEmployeeGroupMutation = useMutation({
    mutationFn: async (groupType: string) => {
      const response = await apiRequest('/api/telegram/test-employee-groups', {
        method: 'POST',
        data: { groupType }
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ تست گروه کارمندان موفق",
        description: `فرمت پیام ${data.testData?.groupType} تولید شد. ${data.testData?.expectedActions}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطا در تست گروه کارمندان",
        description: error.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  });

  const onAiSubmit = async (data: AiSettingsData) => {
    try {
      // Validate API key format before saving
      if (data.xaiApiKey && !data.xaiApiKey.startsWith('xai-')) {
        toast({
          title: "❌ خطا در کلید API",
          description: "کلید API باید با 'xai-' شروع شود",
          variant: "destructive",
        });
        return;
      }

      // Test API key connection first
      if (data.xaiApiKey) {
        console.log('🔍 Testing XAI API key before saving...');
        const testResult = await testGrokConnectionMutation.mutateAsync();
        if (!testResult.success) {
          toast({
            title: "❌ خطا در تست اتصال",
            description: "کلید API معتبر نیست. لطفاً بررسی کنید",
            variant: "destructive",
          });
          return;
        }
      }

      // Save API key first
      const response = await apiRequest('/api/settings/xai-grok/configure', {
        method: 'POST',
        data: { apiKey: data.xaiApiKey }
      });

      // Save all AI configuration settings
      const settingsToUpdate = [
        { key: 'ai_auto_analysis', value: data.enableAutoAnalysis.toString() },
        { key: 'ai_analysis_frequency', value: data.analysisFrequency },
        { key: 'ai_temperature', value: data.temperature.toString() },
        { key: 'ai_max_tokens', value: data.maxTokens.toString() },
        { key: 'ai_default_model', value: data.defaultModel },
        { key: 'ai_cultural_sensitivity', value: data.culturalSensitivity.toString() },
        { key: 'ai_religious_sensitivity', value: data.religiousSensitivity.toString() },
        { key: 'ai_language_formality', value: data.languageFormality },
        { key: 'ai_persian_poetry', value: data.persianPoetryIntegration.toString() },
        { key: 'ai_cultural_metaphors', value: data.culturalMetaphors.toString() },
        { key: 'ai_proactivity_level', value: data.proactivityLevel.toString() },
        { key: 'ai_confidence_threshold', value: data.confidenceThreshold.toString() },
        { key: 'ai_learning_rate', value: data.learningRate.toString() },
        { key: 'ai_creativity_level', value: data.creativityLevel.toString() },
        { key: 'ai_risk_tolerance', value: data.riskTolerance.toString() },
        { key: 'ai_task_generation', value: data.taskGenerationEnabled.toString() },
        { key: 'ai_auto_assignment', value: data.autoAssignmentEnabled.toString() },
        { key: 'ai_intelligent_scheduling', value: data.intelligentScheduling.toString() },
        { key: 'ai_max_suggestions', value: data.maxSuggestions.toString() },
        { key: 'ai_response_timeout', value: data.responseTimeout.toString() },
        { key: 'ai_data_encryption', value: data.dataEncryption.toString() },
        { key: 'ai_access_logging', value: data.accessLogging.toString() },
        { key: 'ai_telegram_integration', value: data.telegramIntegration.toString() },
        { key: 'ai_xai_integration', value: data.xaiIntegration.toString() }
      ];

      // Update all settings in parallel
      await Promise.all(
        settingsToUpdate.map(setting =>
          updateSettingMutation.mutateAsync({
            key: setting.key,
            value: setting.value
          })
        )
      );

      toast({
        title: "✅ تنظیمات دستیار هوشمند ذخیره شد",
        description: "همه ماژول‌های AI بروزرسانی شدند. سیستم آماده بهره‌برداری است.",
      });
    } catch (error: any) {
      toast({
        title: "❌ خطا در ذخیره تنظیمات",
        description: error.message || "لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
    }
  };

  // Data Reset Functions
  const fetchDataCountsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/data-counts', { method: 'GET' });
      return response;
    },
    onSuccess: (data) => {
      setDataCounts(data);
      setShowDataCounts(true);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در دریافت آمار داده‌ها",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetDataMutation = useMutation({
    mutationFn: async (resetOptions: DataResetData) => {
      const response = await apiRequest('/api/admin/reset-data', { method: 'POST', data: resetOptions });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "بازنشانی اطلاعات موفق",
        description: `${data.deletedCounts?.total || 0} رکورد با موفقیت حذف شد`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-partners"] });
      dataResetForm.reset();
      setShowDataCounts(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در بازنشانی اطلاعات",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onInvoiceTemplateSubmit = async (data: InvoiceTemplateData) => {
    try {
      await updateSettingMutation.mutateAsync({ key: 'invoice_header', value: data.invoiceHeader });
      if (data.invoiceFooter) {
        await updateSettingMutation.mutateAsync({ key: 'invoice_footer', value: data.invoiceFooter });
      }
      await updateSettingMutation.mutateAsync({ key: 'invoice_show_usage_details', value: data.showUsageDetails.toString() });
      await updateSettingMutation.mutateAsync({ key: 'invoice_show_event_timestamp', value: data.showEventTimestamp.toString() });
      await updateSettingMutation.mutateAsync({ key: 'invoice_show_event_type', value: data.showEventType.toString() });
      await updateSettingMutation.mutateAsync({ key: 'invoice_show_description', value: data.showDescription.toString() });
      await updateSettingMutation.mutateAsync({ key: 'invoice_show_admin_username', value: data.showAdminUsername.toString() });
    } catch (error: any) {
      toast({
        title: "خطا در ذخیره تنظیمات قالب فاکتور",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onPortalSubmit = async (data: PortalSettingsData) => {
    try {
      await updateSettingMutation.mutateAsync({ key: 'portal_title', value: data.portalTitle });
      if (data.portalDescription) {
        await updateSettingMutation.mutateAsync({ key: 'portal_description', value: data.portalDescription });
      }
      await updateSettingMutation.mutateAsync({ key: 'portal_show_owner_name', value: data.showOwnerName.toString() });
      await updateSettingMutation.mutateAsync({ key: 'portal_show_detailed_usage', value: data.showDetailedUsage.toString() });
      if (data.customCss) {
        await updateSettingMutation.mutateAsync({ key: 'portal_custom_css', value: data.customCss });
      }
    } catch (error: any) {
      toast({
        title: "خطا در ذخیره تنظیمات پورتال",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onDataResetSubmit = async (data: DataResetData) => {
    const selectedItems = Object.entries(data).filter(([key, value]) => value).map(([key]) => key);

    if (selectedItems.length === 0) {
      toast({
        title: "هیچ موردی انتخاب نشده",
        description: "لطفاً حداقل یک مورد برای بازنشانی انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    await resetDataMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تنظیمات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تنظیمات سیستم، یکپارچگی‌ها و پیکربندی
          </p>
        </div>

        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          نسخه ۱.۰.۰
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="telegram" className="flex items-center">
            <Send className="w-4 h-4 mr-2" />
            تلگرام
          </TabsTrigger>
          <TabsTrigger value="portal" className="flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            پرتال عمومی
          </TabsTrigger>
          <TabsTrigger value="invoice-template" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            قالب فاکتور
          </TabsTrigger>
          <TabsTrigger value="batch-rollback" className="flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            حذف دسته‌جمعی
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center">
            <Bot className="w-4 h-4 mr-2" />
            هوش مصنوعی
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            امنیت
          </TabsTrigger>
          <TabsTrigger value="data-reset" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            بازنشانی داده‌ها
          </TabsTrigger>
        </TabsList>

        {/* Telegram Settings */}
        <TabsContent value="telegram">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 ml-2" />
                  تنظیمات ربات تلگرام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...telegramForm}>
                  <form onSubmit={telegramForm.handleSubmit(onTelegramSubmit)} className="space-y-4">
                    <FormField
                      control={telegramForm.control}
                      name="botToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>توکن ربات تلگرام</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            توکن ربات تلگرام خود را از @BotFather دریافت کنید<br/>
                            <strong>ربات صحیح: @Dsyrhshnmdbot</strong> - اطمینان حاصل کنید توکن مربوط به این ربات باشد
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={telegramForm.control}
                      name="chatId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شناسه چت</FormLabel>
                          <FormControl>
                            <Input placeholder="-1001234567890" {...field} />
                          </FormControl>
                          <FormDescription>
                            شناسه چت یا گروه برای ارسال فاکتورها
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center space-x-4 space-x-reverse pt-4">
                      <Button
                        type="submit"
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testTelegramMutation.mutate()}
                        disabled={testTelegramMutation.isPending || !telegramForm.watch('botToken')}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {testTelegramMutation.isPending ? "در حال تست..." : "تست اتصال"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 ml-2" />
                  قالب پیام تلگرام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...telegramForm}>
                  <form onSubmit={telegramForm.handleSubmit(onTelegramSubmit)} className="space-y-4">
                    <FormField
                      control={telegramForm.control}
                      name="template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>قالب پیام</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="قالب پیام خود را وارد کنید..."
                              rows={12}
                              className="font-mono text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="space-y-1">
                            <div>متغیرهای قابل استفاده:</div>
                            <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              {`{invoice_number}, {representative_name}, {shop_owner}, {panel_id}, {amount}, {issue_date}, {status}, {portal_link}`}
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={updateSettingMutation.isPending}
                        className="w-full"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره قالب پیام"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Multi-Group Configuration */}
            <MultiGroupConfiguration toast={toast} />

            {/* AI Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 ml-2" />
                  وضعیت ادغام هوش مصنوعی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        console.log('🔍 Checking AI status...');
                        const response = await fetch('/api/telegram/ai-status', {
                          method: 'GET',
                          headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                          }
                        });

                        if (!response.ok) {
                          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const result = await response.json();
                        console.log('📊 AI Status result:', result);

                        if (result.success) {
                          const activeFeatures = Object.values(result.ai?.features || {}).filter(Boolean).length;
                          toast({
                            title: "✅ وضعیت AI بررسی شد",
                            description: `اتصال: ${result.ai?.connection || 'نامشخص'} | ویژگی‌ها: ${activeFeatures}/3 فعال`,
                          });
                        } else {
                          throw new Error(result.message || 'خطای نامشخص');
                        }
                      } catch (error: any) {
                        console.error('❌ AI Status Error:', error);
                        toast({
                          title: "❌ خطا در بررسی وضعیت AI",
                          description: error.message || "خطا در اتصال به سرور",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="w-full"
                  >
                    <Bot className="h-4 w-4 ml-2" />
                    بررسی وضعیت هوش مصنوعی
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Portal Settings */}
        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 ml-2" />
                تنظیمات پرتال عمومی نماینده
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...portalForm}>
                <form onSubmit={portalForm.handleSubmit(onPortalSubmit)} className="space-y-6">
                  <FormField
                    control={portalForm.control}
                    name="portalTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان پرتال</FormLabel>
                        <FormControl>
                          <Input placeholder="پرتال عمومی نماینده" {...field} />
                        </FormControl>
                        <FormDescription>
                          عنوان اصلی که در بالای پرتال نمایندگان نمایش داده می‌شود
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={portalForm.control}
                    name="portalDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات پرتال</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="مشاهده وضعیت مالی و فاکتورهای شما"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          توضیحات مختصری که زیر عنوان پرتال نمایش داده می‌شود
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={portalForm.control}
                      name="showOwnerName"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش نام صاحب فروشگاه</FormLabel>
                            <FormDescription>
                              نمایش نام صاحب فروشگاه در پرتال
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={portalForm.control}
                      name="showDetailedUsage"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش جزئیات مصرف</FormLabel>
                            <FormDescription>
                              نمایش جدول ریز جزئیات استفاده
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={portalForm.control}
                    name="customCss"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>استایل سفارشی (CSS)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="/* استایل سفارشی CSS */
.portal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.portal-card {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}"
                            rows={8}
                            className="font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          کدهای CSS سفارشی برای شخصی‌سازی ظاهر پرتال
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={updateSettingMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>پیش‌نمایش پرتال</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {portalForm.watch('portalTitle') || 'پرتال عمومی نماینده'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {portalForm.watch('portalDescription') || 'مشاهده وضعیت مالی و فاکتورهای شما'}
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <span className="text-sm font-medium">موجودی حساب:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">۱,۲۵۰,۰۰۰ تومان</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <span className="text-sm font-medium">فاکتورهای پرداخت شده:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">۱۵ فاکتور</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="text-sm font-medium">فاکتورهای در انتظار:</span>
                      <span className="text-orange-600 dark:text-orange-400 font-bold">۳ فاکتور</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Template Settings */}
        <TabsContent value="invoice-template">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 ml-2" />
                  تنظیمات قالب فاکتور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...invoiceTemplateForm}>
                  <form onSubmit={invoiceTemplateForm.handleSubmit(onInvoiceTemplateSubmit)} className="space-y-4">
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="invoiceHeader"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سربرگ فاکتور</FormLabel>
                          <FormControl>
                            <Input placeholder="سیستم مدیریت مالی MarFaNet" {...field} />
                          </FormControl>
                          <FormDescription>
                            متن سربرگ که در بالای فاکتور نمایش داده می‌شود
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="invoiceFooter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>پاورقی فاکتور</FormLabel>
                          <FormControl>
                            <Textarea placeholder="متن پاورقی اختیاری..." rows={2} {...field} />
                          </FormControl>
                          <FormDescription>
                            متن اختیاری که در پایین فاکتور نمایش داده می‌شود
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showUsageDetails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش جزئیات مصرف</FormLabel>
                            <FormDescription>
                              نمایش جدول ریز جزئیات مصرف در پورتال عمومی
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 ml-2" />
                  تنظیمات نمایش جدول ریز جزئیات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...invoiceTemplateForm}>
                  <div className="space-y-4">
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showAdminUsername"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش نام کاربری ادمین</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              نمایش ستون admin_username در جدول
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showEventTimestamp"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش زمان رویداد</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              نمایش ستون event_timestamp در جدول
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showEventType"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش نوع رویداد</FormLabel>
                            <FormDescription>
                              نمایش ستون event_type در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showDescription"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش توضیحات</FormLabel>
                            <FormDescription>
                              نمایش ستون description در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                    پیش‌نمایش قالب جدول
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-300">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-green-200 dark:border-green-700">
                        <thead className="bg-green-100 dark:bg-green-800">
                          <tr>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">نام کاربری ادمین</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">زمان رویداد</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">نوع رویداد</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">توضیحات</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">مبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">mohamadrzmb</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">2025-07-09 12:53:58</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">CREATE</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">ایجاد کاربر: aghayeyousefi_sh2</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">27000.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        {/* Batch Rollback Settings */}
        <TabsContent value="batch-rollback">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                <RotateCcw className="w-5 h-5 ml-2" />
                حذف دسته‌جمعی فاکتورها با تاریخ صدور
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                حذف تمام فاکتورهای صادر شده در تاریخ مشخص و بازگشت آمار مالی نمایندگان
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 ml-2 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        ⚠️ هشدار: عملیات حساس مالی
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        این عملیات تأثیر مستقیم بر آمار مالی سیستم دارد و غیرقابل برگشت است
                      </p>
                    </div>
                  </div>
                </div>

                <BatchRollbackManager />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai">
          <div className="space-y-6">
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 ml-2" />
                  پیکربندی موتور هوش مصنوعی
                </CardTitle>
                <CardDescription>
                  تنظیمات اتصال و پیکربندی اولیه موتور XAI-Grok
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="space-y-4">
                    <FormField
                      control={aiForm.control}
                      name="xaiApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>کلید API xAI Grok</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="xai-..."
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            کلید API خود را از پلتفرم xAI دریافت کنید
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testGrokConnectionMutation.mutate()}
                        disabled={testGrokConnectionMutation.isPending || !aiForm.watch('xaiApiKey')}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {testGrokConnectionMutation.isPending ? "در حال تست..." : "تست اتصال"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {/* TODO: Direct test */}}
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        تست مستقیم دستیار
                      </Button>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* General AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SettingsIcon className="w-5 h-5 ml-2" />
                  تنظیمات عمومی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aiForm.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>خلاقیت (Temperature): {field.value}</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={2}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            0 = محافظه‌کار، 2 = خلاق
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="maxTokens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حداکثر طول پاسخ</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={100}
                              max={8000}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            تعداد کلمات پاسخ (100-8000)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="defaultModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مدل پیش‌فرض</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grok-code-fast-1">Grok Code Fast (سریع و بهینه)</SelectItem>
                              <SelectItem value="grok-4-0709">Grok-4 (پیشرفته)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="responseTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تایم‌اوت پاسخ: {field.value}s</FormLabel>
                          <FormControl>
                            <Slider
                              min={5}
                              max={60}
                              step={5}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Cultural Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 ml-2" />
                  هوش فرهنگی فارسی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="space-y-4">
                    <FormField
                      control={aiForm.control}
                      name="culturalSensitivity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساسیت فرهنگی: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.05}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            میزان توجه به نکات فرهنگی ایرانی
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="religiousSensitivity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساسیت مذهبی: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.05}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="languageFormality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سطح رسمی بودن زبان</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FORMAL">رسمی</SelectItem>
                              <SelectItem value="RESPECTFUL">محترمانه</SelectItem>
                              <SelectItem value="CASUAL">غیررسمی</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="persianPoetryIntegration"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>استفاده از شعر فارسی</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="culturalMetaphors"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>استعاره‌های فرهنگی</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Behavior Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 ml-2" />
                  تنظیمات رفتاری
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aiForm.control}
                      name="proactivityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سطح پیش‌فعالی: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            میزان ابتکار عمل دستیار
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="confidenceThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>آستانه اطمینان: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.05}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            حداقل اطمینان برای پیشنهاد
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="learningRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نرخ یادگیری: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.05}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="riskTolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تحمل ریسک: {Math.round(field.value * 100)}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={1}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Task Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckSquare className="w-5 h-5 ml-2" />
                  مدیریت وظایف هوشمند
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="taskGenerationEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>تولید خودکار وظایف</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="autoAssignmentEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>تخصیص خودکار</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="intelligentScheduling"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>زمان‌بندی هوشمند</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="enableAutoAnalysis"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>تحلیل خودکار</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={aiForm.control}
                        name="maxSuggestions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>حداکثر پیشنهادات</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiForm.control}
                        name="analysisFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>دوره تحلیل</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">روزانه</SelectItem>
                                <SelectItem value="weekly">هفتگی</SelectItem>
                                <SelectItem value="monthly">ماهانه</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Direct Test Section */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3">
                        تست مستقیم ماژول‌ها
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testEmployeeGroupMutation.mutate('daily-report')}
                          disabled={testEmployeeGroupMutation.isPending}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          تست گزارش روزانه
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testEmployeeGroupMutation.mutate('task-assignment')}
                          disabled={testEmployeeGroupMutation.isPending}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          تست وظیفایف جدید
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testEmployeeGroupMutation.mutate('leave-request')}
                          disabled={testEmployeeGroupMutation.isPending}
                        >
                          <BarChart className="w-4 h-4 mr-2" />
                          تست درخواست مرخصی
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testEmployeeGroupMutation.mutate('technical-report')}
                          disabled={testEmployeeGroupMutation.isPending}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          تست گزارش فنی
                        </Button>
                      </div>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Security & Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 ml-2" />
                  امنیت و ادغام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={aiForm.control}
                      name="dataEncryption"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>رمزنگاری داده‌ها</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="accessLogging"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>لاگ دسترسی‌ها</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="telegramIntegration"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>ادغام تلگرام</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={aiForm.control}
                      name="xaiIntegration"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>ادغام XAI</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </CardContent>
            </Card>

            {/* Status & Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle>وضعیت و قابلیت‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                    قابلیت‌های فعال DA VINCI v6.0 Persian AI Engine
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-800 dark:text-green-300">
                    <div>✓ تحلیل وضعیت مالی فرهنگی</div>
                    <div>✓ پروفایل‌سازی روانشناختی</div>
                    <div>✓ تولید خودکار وظایف</div>
                    <div>✓ تحلیل هوشمند عملکرد</div>
                    <div>✓ گزارشات تحلیلی فارسی</div>
                    <div>✓ سیستم یادگیری مستمر</div>
                    <div>✓ ادغام تلگرام</div>
                    <div>✓ امنیت رمزنگاری شده</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={aiForm.handleSubmit(onAiSubmit)}
                disabled={updateSettingMutation.isPending}
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره همه تنظیمات AI"}
              </Button>
            </div>
          </div>
        </TabsContent>



        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 ml-2" />
                تنظیمات امنیتی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>اعتبارسنجی دو مرحله‌ای</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        فعال‌سازی احراز هویت دو مرحله‌ای برای امنیت بیشتر
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">بک‌آپ خودکار</Label>
                  <select className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <option value="daily">روزانه</option>
                    <option value="weekly">هفتگی</option>
                    <option value="monthly">ماهانه</option>
                    <option value="disabled">غیرفعال</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>لاگ فعالیت‌ها</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ذخیره تمام فعالیت‌های انجام شده در سیستم
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                    تنظیمات پیشرفته امنیتی
                  </h4>
                  <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <div>• رمزگذاری داده‌های حساس با AES-256</div>
                    <div>• محدودیت تلاش ورود ناموفق</div>
                    <div>• نظارت بر دسترسی‌های مشکوک</div>
                    <div>• بک‌آپ رمزگذاری شده</div>
                  </div>
                </div>

                <Button className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  تغییر رمز عبور اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Reset Settings */}
        <TabsContent value="data-reset">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                <Database className="w-5 h-5 ml-2" />
                بازنشانی اطلاعات سیستم
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                حذف انتخابی اطلاعات سیستم با حفظ یکپارچگی داده‌ها
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 ml-2 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        هشدار: عملیات غیرقابل برگشت
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        اطلاعات حذف شده قابل بازیابی نخواهد بود
                      </p>
                    </div>
                  </div>
                </div>

                {!showDataCounts ? (
                  <div className="text-center">
                    <Button
                      onClick={() => fetchDataCountsMutation.mutate()}
                      disabled={fetchDataCountsMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw className="w-4 h-4 ml-2" />
                      {fetchDataCountsMutation.isPending ? "در حال بارگذاری..." : "نمایش آمار اطلاعات موجود"}
                    </Button>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      ابتدا آمار اطلاعات موجود را مشاهده کنید
                    </p>
                  </div>
                ) : (
                  <Form {...dataResetForm}>
                    <form onSubmit={dataResetForm.handleSubmit(onDataResetSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Representatives */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="representatives"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    نمایندگان ({toPersianDigits(dataCounts.representatives.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    حذف تمام اطلاعات نمایندگان و کدهای دسترسی آن‌ها
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Invoices */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="invoices"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    فاکتورها ({toPersianDigits(dataCounts.invoices.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    حذف تمام فاکتورها و جزئیات مصرف مرتبط
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Payments */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="payments"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    پرداخت‌ها ({toPersianDigits(dataCounts.payments.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    حذف تمام رکوردهای پرداخت و تخصیص‌ها
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Sales Partners */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="salesPartners"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    همکاران فروش ({toPersianDigits(dataCounts.salesPartners.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    حذف اطلاعات همکاران فروش و کمیسیون‌ها
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Activity Logs */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="activityLogs"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    گزارش فعالیت‌ها ({toPersianDigits(dataCounts.activityLogs.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    حذف تاریخچه فعالیت‌های سیستم
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Settings */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <FormField
                            control={dataResetForm.control}
                            name="settings"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-medium">
                                    تنظیمات ({toPersianDigits(dataCounts.settings.toString())})
                                  </FormLabel>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    بازگشت تنظیمات به حالت پیش‌فرض
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDataCounts(false);
                            dataResetForm.reset();
                          }}
                        >
                          <RotateCcw className="w-4 h-4 ml-2" />
                          بازگشت
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={resetDataMutation.isPending}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              {resetDataMutation.isPending ? "در حال حذف..." : "بازنشانی انتخاب‌شده"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-red-600">
                                تأیید بازنشانی اطلاعات
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                آیا از حذف اطلاعات انتخاب‌شده اطمینان دارید؟ این عملیات غیرقابل برگشت است و تمام داده‌های مرتبط حذف خواهد شد.

                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    موارد انتخاب‌شده:
                                  </p>
                                  <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                                    {dataResetForm.watch('representatives') && <li>• نمایندگان</li>}
                                    {dataResetForm.watch('invoices') && <li>• فاکتورها</li>}
                                    {dataResetForm.watch('payments') && <li>• پرداخت‌ها</li>}
                                    {dataResetForm.watch('salesPartners') && <li>• همکاران فروش</li>}
                                    {dataResetForm.watch('activityLogs') && <li>• گزارش فعالیت‌ها</li>}
                                    {dataResetForm.watch('settings') && <li>• تنظیمات</li>}
                                  </ul>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={dataResetForm.handleSubmit(onDataResetSubmit)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                تأیید حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}