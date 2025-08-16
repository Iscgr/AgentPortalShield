// Reminders Panel - DA VINCI v2.0 Intelligent Reminder System
// Advanced UI for AI-powered follow-up management

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  Phone, 
  MessageCircle, 
  User, 
  Star,
  Bot,
  RefreshCw,
  CheckCircle,
  BarChart3,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  title: string;
  description: string;
  context: string;
  scheduledFor: string;
  scheduledTime: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  sourceType: string;
  status: string;
  representativeId: number;
  createdAt: string;
}

interface ReminderStats {
  totalActive: number;
  overdue: number;
  today: number;
  highPriority: number;
  automated: number;
  manual: number;
}

const RemindersPanel = () => {
  const [activeTab, setActiveTab] = useState("today");
  const queryClient = useQueryClient();

  // Fetch today's reminders
  const { data: todayReminders, isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: ['/api/workspace/reminders/today'],
    queryFn: () => apiRequest('/api/workspace/reminders/today')
  });

  // Fetch all active reminders  
  const { data: allReminders, isLoading: loadingAll, refetch: refetchAll } = useQuery({
    queryKey: ['/api/workspace/reminders'],
    queryFn: () => apiRequest('/api/workspace/reminders')
  });

  // Fetch reminder statistics
  const { data: reminderStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/workspace/reminders/stats'],
    queryFn: () => apiRequest('/api/workspace/reminders/stats')
  });

  // Generate smart reminders mutation
  const generateReminders = useMutation({
    mutationFn: () => apiRequest('/api/workspace/reminders/generate', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      toast({
        title: "✅ یادآورهای هوشمند تولید شد",
        description: data.message
      });
      refetchToday();
      refetchAll();
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/reminders/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطا در تولید یادآورها",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Complete reminder mutation
  const completeReminder = useMutation({
    mutationFn: (reminderId: string) => apiRequest(`/api/workspace/reminders/${reminderId}/complete`, {
      method: 'PUT'
    }),
    onSuccess: () => {
      toast({
        title: "✅ یادآور تکمیل شد",
        description: "یادآور با موفقیت تکمیل شد"
      });
      refetchToday();
      refetchAll();
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityIcon = (context: string) => {
    if (context?.includes('CALL')) return <Phone className="h-4 w-4" />;
    if (context?.includes('MESSAGE')) return <MessageCircle className="h-4 w-4" />;
    if (context?.includes('VISIT')) return <User className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const ReminderCard = ({ reminder }: { reminder: Reminder }) => (
    <Card className="mb-3 border-r-4 border-r-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            {getPriorityIcon(reminder.context)}
            <h4 className="font-medium text-sm">{reminder.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(reminder.priority)} variant="secondary">
              {reminder.priority}
            </Badge>
            {reminder.sourceType === 'AI_ANALYSIS' && (
              <Bot className="h-4 w-4 text-blue-500" />
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {reminder.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {reminder.scheduledFor}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {reminder.scheduledTime}
          </div>
        </div>

        {reminder.context && (
          <div className="bg-blue-50 p-2 rounded text-xs mb-3">
            <strong>زمینه:</strong> {reminder.context}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => completeReminder.mutate(reminder.id)}
            disabled={completeReminder.isPending}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            تکمیل
          </Button>
          <Button size="sm" variant="ghost">
            تعویق
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const StatsCard = ({ title, value, icon, color }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string 
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loadingStats) {
    return <div className="p-4">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">یادآورهای هوشمند</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => generateReminders.mutate()}
            disabled={generateReminders.isPending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          >
            <Bot className="h-4 w-4 mr-2" />
            {generateReminders.isPending ? 'در حال تولید...' : 'تولید هوشمند'}
          </Button>
          <Button variant="outline" onClick={() => { refetchToday(); refetchAll(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            بروزرسانی
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {reminderStats?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatsCard 
            title="کل فعال" 
            value={reminderStats.stats.totalActive} 
            icon={<Calendar className="h-5 w-5" />}
            color="text-blue-600"
          />
          <StatsCard 
            title="امروز" 
            value={reminderStats.stats.today} 
            icon={<Clock className="h-5 w-5" />}
            color="text-green-600"
          />
          <StatsCard 
            title="عقب‌افتاده" 
            value={reminderStats.stats.overdue} 
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-red-600"
          />
          <StatsCard 
            title="اولویت بالا" 
            value={reminderStats.stats.highPriority} 
            icon={<Star className="h-5 w-5" />}
            color="text-orange-600"
          />
          <StatsCard 
            title="هوشمند" 
            value={reminderStats.stats.automated} 
            icon={<Bot className="h-5 w-5" />}
            color="text-purple-600"
          />
          <StatsCard 
            title="دستی" 
            value={reminderStats.stats.manual} 
            icon={<User className="h-5 w-5" />}
            color="text-gray-600"
          />
        </div>
      )}

      {/* Reminders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">امروز</TabsTrigger>
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="analytics">تحلیل</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                یادآورهای امروز
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingToday ? (
                <div className="text-center py-8 text-gray-500">در حال بارگذاری...</div>
              ) : todayReminders?.reminders?.length > 0 ? (
                <div className="space-y-3">
                  {todayReminders.reminders.map((reminder: Reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              ) : (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    هیچ یادآوری برای امروز وجود ندارد. برای تولید یادآورهای هوشمند روی دکمه "تولید هوشمند" کلیک کنید.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                تمام یادآورهای فعال
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="text-center py-8 text-gray-500">در حال بارگذاری...</div>
              ) : allReminders?.reminders?.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allReminders.reminders.map((reminder: Reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              ) : (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    هیچ یادآور فعالی وجود ندارد.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                تحلیل عملکرد یادآورها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>تحلیل‌های تفصیلی بزودی اضافه خواهد شد</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RemindersPanel;