import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';

export function AiTestResults() {
  const [testResults] = useState([
    {
      id: 1,
      testId: 'xai-test-1703562245123',
      testType: 'API_KEY_TEST',
      relatedEntityType: 'SETTING',
      testStatus: 'SUCCESS',
      testDuration: 2340,
      testCompleted: '1403/05/10 14:30:25',
      responseData: {
        success: true,
        model: 'grok-beta',
        responseTime: 2340,
        response: 'سلام! من اینجا هستم و آماده کمک به شما.',
        debugInfo: {
          requestPayload: { model: 'grok-beta', temperature: 0.7, messagesCount: 2 },
          responseHeaders: { 'content-type': 'application/json' },
          networkLatency: 2340
        }
      },
      errorMessage: null,
      initiatedBy: 'CRM_MANAGER'
    },
    {
      id: 2,
      testId: 'xai-test-1703562198756',
      testType: 'API_KEY_TEST',
      relatedEntityType: 'SETTING',
      testStatus: 'FAILED',
      testDuration: 5000,
      testCompleted: '1403/05/10 14:28:15',
      responseData: {
        success: false,
        model: 'grok-beta',
        responseTime: 0,
        response: '',
        error: 'Invalid API key provided'
      },
      errorMessage: 'Invalid API key provided',
      initiatedBy: 'CRM_MANAGER'
    },
    {
      id: 3,
      testId: 'cultural-analysis-1703561987432',
      testType: 'CULTURAL_ANALYSIS',
      relatedEntityType: 'REPRESENTATIVE',
      relatedEntityId: 1845,
      testStatus: 'SUCCESS',
      testDuration: 3200,
      testCompleted: '1403/05/10 14:25:30',
      responseData: {
        success: true,
        culturalProfile: {
          communicationStyle: 'formal_respectful',
          relationshipOriented: true,
          trustLevel: 'high',
          negotiationStyle: 'collaborative'
        },
        insights: [
          'نماینده با سبک ارتباطی محترمانه و رسمی',
          'توجه ویژه به روابط بلندمدت',
          'اعتماد بالا در معاملات'
        ],
        recommendations: [
          'استفاده از لحن محترمانه در ارتباطات',
          'تأکید بر کیفیت و قابلیت اطمینان محصولات',
          'ارائه گارانتی و خدمات پس از فروش'
        ]
      },
      errorMessage: null,
      initiatedBy: 'AI_ASSISTANT'
    },
    {
      id: 4,
      testId: 'performance-test-1703561845234',
      testType: 'PERFORMANCE_TEST',
      relatedEntityType: 'SYSTEM',
      testStatus: 'SUCCESS',
      testDuration: 1850,
      testCompleted: '1403/05/10 14:22:45',
      responseData: {
        success: true,
        metrics: {
          responseTime: 1850,
          throughput: 45.2,
          errorRate: 0.02,
          availability: 99.8
        },
        systemHealth: 'excellent'
      },
      errorMessage: null,
      initiatedBy: 'SYSTEM_MONITOR'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'RUNNING':
        return <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'موفق';
      case 'FAILED': return 'ناموفق';
      case 'RUNNING': return 'در حال اجرا';
      default: return 'نامشخص';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FAILED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RUNNING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTestTypeText = (type: string) => {
    switch (type) {
      case 'API_KEY_TEST': return 'تست کلید API';
      case 'CULTURAL_ANALYSIS': return 'تحلیل فرهنگی';
      case 'PERFORMANCE_TEST': return 'تست عملکرد';
      case 'CONNECTION_TEST': return 'تست اتصال';
      case 'LOAD_TEST': return 'تست بار';
      default: return 'تست عمومی';
    }
  };

  const getTestTypeColor = (type: string) => {
    switch (type) {
      case 'API_KEY_TEST': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'CULTURAL_ANALYSIS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'PERFORMANCE_TEST': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CONNECTION_TEST': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'LOAD_TEST': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredResults = testResults.filter(result => {
    const matchesStatus = filterStatus === 'ALL' || result.testStatus === filterStatus;
    const matchesType = filterType === 'ALL' || result.testType === filterType;
    return matchesStatus && matchesType;
  });

  const successCount = testResults.filter(r => r.testStatus === 'SUCCESS').length;
  const failedCount = testResults.filter(r => r.testStatus === 'FAILED').length;
  const avgDuration = testResults.length > 0 
    ? testResults.reduce((sum, result) => sum + result.testDuration, 0) / testResults.length 
    : 0;
  const successRate = testResults.length > 0 ? (successCount / testResults.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {testResults.length}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              کل تست‌ها
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {successCount}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              موفق
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {failedCount}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              ناموفق
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {successRate.toFixed(0)}%
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              نرخ موفقیت
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            🧪 نتایج تست‌های هوش مصنوعی
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تاریخچه و تحلیل عملکرد سیستم
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="SUCCESS">موفق</option>
            <option value="FAILED">ناموفق</option>
            <option value="RUNNING">در حال اجرا</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="ALL">همه انواع</option>
            <option value="API_KEY_TEST">تست کلید API</option>
            <option value="CULTURAL_ANALYSIS">تحلیل فرهنگی</option>
            <option value="PERFORMANCE_TEST">تست عملکرد</option>
          </select>
          
          <Button 
            variant="outline"
            className="border-gray-300 dark:border-gray-600"
          >
            <Download className="w-4 h-4 ml-2" />
            دانلود گزارش
          </Button>
        </div>
      </div>

      {/* Test Results List */}
      <div className="space-y-4">
        {filteredResults.map((result) => (
          <Card key={result.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(result.testStatus)}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {getTestTypeText(result.testType)}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        شناسه: {result.testId}
                      </p>
                    </div>
                    <Badge className={getTestTypeColor(result.testType)}>
                      {getTestTypeText(result.testType)}
                    </Badge>
                    <Badge className={getStatusColor(result.testStatus)}>
                      {getStatusText(result.testStatus)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">مدت زمان:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {result.testDuration}ms
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">تکمیل شده:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {result.testCompleted}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">شروع کننده:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {result.initiatedBy === 'CRM_MANAGER' ? 'مدیر CRM' : 
                         result.initiatedBy === 'AI_ASSISTANT' ? 'دستیار هوش مصنوعی' :
                         result.initiatedBy === 'SYSTEM_MONITOR' ? 'سیستم نظارت' : result.initiatedBy}
                      </div>
                    </div>
                    
                    {result.relatedEntityId && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">مرتبط با:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          #{result.relatedEntityId}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Test Results Details */}
                  {result.testStatus === 'SUCCESS' && result.responseData && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-800 dark:text-green-200">نتیجه موفق</span>
                      </div>
                      
                      {result.testType === 'API_KEY_TEST' && result.responseData.response && (
                        <div className="text-sm text-green-700 dark:text-green-300">
                          📝 پاسخ API: {result.responseData.response}
                        </div>
                      )}
                      
                      {result.testType === 'CULTURAL_ANALYSIS' && result.responseData.insights && (
                        <div className="text-sm text-green-700 dark:text-green-300">
                          <div className="font-medium mb-1">بینش‌های فرهنگی:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {result.responseData.insights.map((insight: string, index: number) => (
                              <li key={index}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.testType === 'PERFORMANCE_TEST' && result.responseData.metrics && (
                        <div className="text-sm text-green-700 dark:text-green-300">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <div>پاسخ‌دهی: {result.responseData.metrics.responseTime}ms</div>
                            <div>توان عملیاتی: {result.responseData.metrics.throughput}</div>
                            <div>نرخ خطا: {(result.responseData.metrics.errorRate * 100).toFixed(1)}%</div>
                            <div>در دسترس بودن: {result.responseData.metrics.availability}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {result.testStatus === 'FAILED' && result.errorMessage && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-800 dark:text-red-200">خطا در تست</span>
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        ❌ {result.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Activity className="w-4 h-4 ml-1" />
                    جزئیات
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredResults.length === 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-8 text-center">
              <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {filterStatus !== 'ALL' || filterType !== 'ALL' 
                  ? 'نتیجه‌ای با فیلترهای انتخابی یافت نشد'
                  : 'هنوز تستی انجام نشده است'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="text-lg text-indigo-900 dark:text-indigo-100">
            📊 خلاصه عملکرد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {avgDuration.toFixed(0)}ms
              </div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400">
                میانگین زمان پاسخ
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1">
                {successRate >= 80 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
                {successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400">
                نرخ موفقیت کل
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {Object.keys(testResults.reduce((acc: any, r) => { acc[r.testType] = true; return acc; }, {})).length}
              </div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400">
                انواع تست مختلف
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}