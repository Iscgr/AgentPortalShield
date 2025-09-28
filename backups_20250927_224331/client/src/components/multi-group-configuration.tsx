
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Users, Plus, Trash2, MessageSquare, Settings, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface TelegramGroup {
  id: string;
  chatId: string;
  groupType: string;
  name: string;
  isActive: boolean;
  lastTest?: string;
  status: 'connected' | 'disconnected' | 'testing';
}

interface MultiGroupConfigurationProps {
  toast: any;
}

export function MultiGroupConfiguration({ toast }: MultiGroupConfigurationProps) {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [newGroup, setNewGroup] = useState({
    chatId: '',
    groupType: 'general',
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<any>(null);

  // Load existing groups and telegram status on component mount
  useEffect(() => {
    loadGroups();
    checkTelegramStatus();
  }, []);

  const checkTelegramStatus = async () => {
    try {
      const response = await fetch('/api/telegram/status');
      const result = await response.json();
      setTelegramStatus(result);
    } catch (error) {
      console.warn('Could not check telegram status:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/telegram/groups');
      if (response.ok) {
        const result = await response.json();
        setGroups(result.groups || []);
      }
    } catch (error) {
      console.warn('Could not load existing groups:', error);
    }
  };

  const addGroup = async () => {
    if (!newGroup.chatId || !newGroup.groupType || !newGroup.name) {
      toast({
        title: "خطا",
        description: "تمام فیلدها الزامی هستند",
        variant: "destructive"
      });
      return;
    }

    // Validate Chat ID format
    if (!newGroup.chatId.match(/^-?\d+$/)) {
      toast({
        title: "خطا",
        description: "شناسه گروه باید عددی باشد (مثل: -1001234567890)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔧 Adding new group:', newGroup);
      
      const response = await fetch('/api/telegram/configure-group', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          groupChatId: newGroup.chatId, 
          groupType: newGroup.groupType,
          groupName: newGroup.name 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Group configuration response:', result);

      if (result.success) {
        const newGroupData: TelegramGroup = {
          id: Date.now().toString(),
          chatId: newGroup.chatId,
          groupType: newGroup.groupType,
          name: newGroup.name,
          isActive: true,
          status: 'connected'
        };

        setGroups(prev => [...prev, newGroupData]);
        setNewGroup({ chatId: '', groupType: 'general', name: '' });

        toast({
          title: "✅ گروه اضافه شد",
          description: `گروه ${newGroup.name} با موفقیت تنظیم شد`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('❌ Group configuration error:', error);
      toast({
        title: "❌ خطا در افزودن گروه",
        description: error.message || "خطا در تنظیم گروه",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGroup = async (group: TelegramGroup) => {
    setGroups(prev => prev.map(g => 
      g.id === group.id ? { ...g, status: 'testing' } : g
    ));

    try {
      const response = await fetch('/api/telegram/test-group-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupChatId: group.chatId,
          message: `🤖 تست اتصال گروه ${group.name} - نوع: ${group.groupType}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setGroups(prev => prev.map(g => 
          g.id === group.id ? { 
            ...g, 
            status: 'connected', 
            lastTest: new Date().toLocaleString('fa-IR') 
          } : g
        ));

        toast({
          title: "✅ تست موفق",
          description: `پیام تست به گروه ${group.name} ارسال شد`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      setGroups(prev => prev.map(g => 
        g.id === group.id ? { ...g, status: 'disconnected' } : g
      ));

      toast({
        title: "❌ تست ناموفق",
        description: error.message || "خطا در ارسال پیام تست",
        variant: "destructive"
      });
    }
  };

  const removeGroup = async (groupId: string) => {
    try {
      await fetch(`/api/telegram/groups/${groupId}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      toast({
        title: "✅ گروه حذف شد",
        description: "گروه با موفقیت از لیست حذف شد"
      });
    } catch (error: any) {
      toast({
        title: "❌ خطا در حذف گروه",
        description: error.message || "خطا در حذف گروه",
        variant: "destructive"
      });
    }
  };

  const groupTypes = [
    { value: 'general', label: 'عمومی' },
    { value: 'daily_reports', label: 'گزارشات روزانه' },
    { value: 'leave_requests', label: 'درخواست مرخصی' },
    { value: 'technical_reports', label: 'گزارشات فنی' },
    { value: 'responsibilities', label: 'مسئولیت‌ها' }
  ];

  return (
    <div className="space-y-6">
      {/* Telegram Bot Status Warning */}
      {telegramStatus && !telegramStatus.botInitialized && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <XCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  ربات تلگرام تنظیم نشده است
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  برای افزودن گروه‌ها، ابتدا توکن ربات را در بخش تنظیمات تلگرام وارد کنید
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 ml-2" />
            افزودن گروه جدید
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="newGroupName">نام گروه</Label>
              <Input
                id="newGroupName"
                placeholder="گروه کارمندان"
                value={newGroup.name}
                onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="newGroupChatId">شناسه گروه (Chat ID)</Label>
              <Input
                id="newGroupChatId"
                placeholder="-1001234567890"
                value={newGroup.chatId}
                onChange={(e) => setNewGroup(prev => ({ ...prev, chatId: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="newGroupType">نوع گروه</Label>
              <Select 
                value={newGroup.groupType} 
                onValueChange={(value) => setNewGroup(prev => ({ ...prev, groupType: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={addGroup}
            disabled={isLoading || !newGroup.chatId || !newGroup.name || (telegramStatus && !telegramStatus.botInitialized)}
            className="w-full mt-4"
          >
            <Plus className="h-4 w-4 ml-2" />
            {isLoading ? "در حال افزودن..." : 
             (telegramStatus && !telegramStatus.botInitialized) ? "ابتدا ربات را تنظیم کنید" : 
             "افزودن گروه"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 ml-2" />
              گروه‌های تنظیم شده ({groups.length}/5)
            </div>
            <Badge variant={groups.length >= 5 ? "default" : "secondary"}>
              {groups.length >= 5 ? "تکمیل شده" : `${5 - groups.length} گروه باقی‌مانده`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>هیچ گروهی تنظیم نشده است</p>
              <p className="text-sm">لطفاً گروه‌های تلگرام خود را اضافه کنید</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <h4 className="font-medium">{group.name}</h4>
                        <Badge variant="outline">
                          {groupTypes.find(t => t.value === group.groupType)?.label}
                        </Badge>
                        {group.status === 'connected' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {group.status === 'disconnected' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        {group.status === 'testing' && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Chat ID: {group.chatId}
                      </p>
                      {group.lastTest && (
                        <p className="text-xs text-gray-500 mt-1">
                          آخرین تست: {group.lastTest}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => testGroup(group)}
                        disabled={group.status === 'testing'}
                      >
                        <MessageSquare className="h-4 w-4 ml-1" />
                        {group.status === 'testing' ? "در حال تست..." : "تست"}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Setup Guide */}
          {groups.length < 5 && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                راهنمای سریع تنظیم 5 گروه
              </h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <div>1. گروه گزارشات روزانه - برای دریافت گزارش‌های روزانه کارمندان</div>
                <div>2. گروه درخواست مرخصی - برای مدیریت درخواست‌های مرخصی</div>
                <div>3. گروه گزارشات فنی - برای گزارش مشکلات و حوادث فنی</div>
                <div>4. گروه مسئولیت‌ها - برای تخصیص و پیگیری وظایف</div>
                <div>5. گروه عمومی - برای ارتباطات کلی و اطلاع‌رسانی</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
