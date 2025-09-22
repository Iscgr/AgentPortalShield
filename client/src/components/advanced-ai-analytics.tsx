
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  TrendingUp,
  Users,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, toPersianDigits } from '@/lib/persian-date';

interface AIInsight {
  type: 'PERFORMANCE' | 'FINANCIAL' | 'BEHAVIORAL' | 'CULTURAL';
  title: string;
  description: string;
  confidence: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionRecommended: string;
  priority: number;
}

interface AIAnalytics {
  overallScore: number;
  insights: AIInsight[];
  trends: {
    communicationQuality: number;
    financialHealth: number;
    systemEfficiency: number;
    culturalAlignment: number;
  };
  predictions: {
    nextMonthRevenue: number;
    riskRepresentatives: number;
    systemOptimization: number;
  };
  learningProgress: {
    totalPatterns: number;
    accuracyImprovement: number;
    culturalUnderstanding: number;
  };
}

export function AdvancedAIAnalytics() {
  const [selectedInsightType, setSelectedInsightType] = useState<string>('ALL');
  const [analysisDepth, setAnalysisDepth] = useState<'BASIC' | 'ADVANCED' | 'DEEP'>('ADVANCED');

  const { data: aiAnalytics, isLoading, error } = useQuery<AIAnalytics>({
    queryKey: ['/api/ai-engine/analytics', { depth: analysisDepth }],
    queryFn: () => apiRequest(`/api/ai-engine/analytics?depth=${analysisDepth}`),
    refetchInterval: 30000,
    staleTime: 20000
  });

  const { data: realTimeMetrics } = useQuery({
    queryKey: ['/api/ai-engine/real-time-metrics'],
    queryFn: () => apiRequest('/api/ai-engine/real-time-metrics'),
    refetchInterval: 5000
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !aiAnalytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">خطا در دریافت تحلیل هوشمند</h3>
          <p className="text-gray-600">لطفاً بعداً دوباره تلاش کنید</p>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'PERFORMANCE': return <TrendingUp className="w-5 h-5" />;
      case 'FINANCIAL': return <DollarSign className="w-5 h-5" />;
      case 'BEHAVIORAL': return <Users className="w-5 h-5" />;
      case 'CULTURAL': return <Brain className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-orange-600 bg-orange-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredInsights = selectedInsightType === 'ALL' 
    ? aiAnalytics.insights 
    : aiAnalytics.insights.filter(insight => insight.type === selectedInsightType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Brain className="w-8 h-8 mr-3 text-blue-600" />
            تحلیل هوشمند پیشرفته
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            نظارت و تحلیل عملکرد سیستم با هوش مصنوعی
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <select
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="BASIC">تحلیل پایه</option>
            <option value="ADVANCED">تحلیل پیشرفته</option>
            <option value="DEEP">تحلیل عمیق</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">امتیاز کلی سیستم</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {toPersianDigits(aiAnalytics.overallScore.toString())}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <Progress value={aiAnalytics.overallScore} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">کیفیت ارتباط</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {toPersianDigits(Math.round(aiAnalytics.trends.communicationQuality).toString())}%
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <Progress value={aiAnalytics.trends.communicationQuality} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">سلامت مالی</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {toPersianDigits(Math.round(aiAnalytics.trends.financialHealth).toString())}%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <Progress value={aiAnalytics.trends.financialHealth} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">بهره‌وری سیستم</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {toPersianDigits(Math.round(aiAnalytics.trends.systemEfficiency).toString())}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <Progress value={aiAnalytics.trends.systemEfficiency} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      {/* AI Insights & Predictions */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">بینش‌های هوشمند</TabsTrigger>
          <TabsTrigger value="predictions">پیش‌بینی‌ها</TabsTrigger>
          <TabsTrigger value="learning">پیشرفت یادگیری</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse mb-4">
            <label className="text-sm font-medium">فیلتر نوع بینش:</label>
            <select
              value={selectedInsightType}
              onChange={(e) => setSelectedInsightType(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="ALL">همه</option>
              <option value="PERFORMANCE">عملکرد</option>
              <option value="FINANCIAL">مالی</option>
              <option value="BEHAVIORAL">رفتاری</option>
              <option value="CULTURAL">فرهنگی</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredInsights.map((insight, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {getInsightIcon(insight.type)}
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {insight.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Badge className={getImpactColor(insight.impact)}>
                        {insight.impact === 'HIGH' ? 'بالا' : 
                         insight.impact === 'MEDIUM' ? 'متوسط' : 'پایین'}
                      </Badge>
                      <Badge variant="outline">
                        {toPersianDigits(insight.confidence.toString())}% اطمینان
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {insight.description}
                  </p>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      💡 توصیه: {insight.actionRecommended}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">درآمد ماه آینده</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(aiAnalytics.predictions.nextMonthRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">نمایندگان پرخطر</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {toPersianDigits(aiAnalytics.predictions.riskRepresentatives.toString())}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">بهینه‌سازی سیستم</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {toPersianDigits(aiAnalytics.predictions.systemOptimization.toString())}%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  الگوهای یادگیری شده
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {toPersianDigits(aiAnalytics.learningProgress.totalPatterns.toString())}
                  </p>
                  <p className="text-sm text-gray-600">الگوی تشخیص داده شده</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  بهبود دقت
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    +{toPersianDigits(aiAnalytics.learningProgress.accuracyImprovement.toString())}%
                  </p>
                  <p className="text-sm text-gray-600">نسبت به ماه گذشته</p>
                </div>
                <Progress value={aiAnalytics.learningProgress.accuracyImprovement} className="mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  درک فرهنگی
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 mb-2">
                    {toPersianDigits(Math.round(aiAnalytics.learningProgress.culturalUnderstanding).toString())}%
                  </p>
                  <p className="text-sm text-gray-600">سطح درک فرهنگ ایرانی</p>
                </div>
                <Progress value={aiAnalytics.learningProgress.culturalUnderstanding} className="mt-4" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Real-time Status */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              وضعیت لحظه‌ای سیستم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">CPU هوش مصنوعی</p>
                <p className="text-lg font-bold text-blue-600">
                  {toPersianDigits(realTimeMetrics.aiCpuUsage || '12')}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">حافظه AI</p>
                <p className="text-lg font-bold text-green-600">
                  {toPersianDigits(realTimeMetrics.aiMemoryUsage || '68')}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">تحلیل‌های فعال</p>
                <p className="text-lg font-bold text-orange-600">
                  {toPersianDigits(realTimeMetrics.activeAnalyses || '5')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">دقت پیش‌بینی</p>
                <p className="text-lg font-bold text-purple-600">
                  {toPersianDigits(realTimeMetrics.predictionAccuracy || '94')}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdvancedAIAnalytics;
