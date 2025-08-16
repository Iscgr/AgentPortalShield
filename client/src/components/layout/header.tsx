import { useState, useEffect } from "react";
import { Bot, Send, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { logout } = useAuth();
  const { toast } = useToast();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Telegram connection status
  const { data: telegramBotToken } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"],
    retry: false
  });

  const isTelegramConnected = (telegramBotToken as any)?.value && (telegramBotToken as any).value.length > 0;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "خروج موفق",
        description: "از سیستم خارج شدید"
      });
    } catch (error) {
      toast({
        title: "خطا در خروج",
        description: "مشکلی در فرآیند خروج رخ داد",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="admin-glass-card mx-4 lg:mx-6 mt-4 mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                داشبورد مدیریت مالی
              </h1>
              <p className="text-sm text-blue-200 mt-1 hidden sm:block">
                مدیریت فاکتورها، پرداخت‌ها و نمایندگان
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4 space-x-reverse">
            {/* Current Time */}
            <div className="text-sm text-blue-200 ltr hidden md:block bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm">
              {currentTime.toLocaleTimeString('fa-IR')}
            </div>
            
            {/* Telegram Integration Status */}
            <Badge 
              variant={isTelegramConnected ? "default" : "destructive"}
              className={`telegram-connected hidden sm:flex backdrop-blur-sm ${
                isTelegramConnected 
                  ? "bg-green-500/20 text-green-300 border-green-500/30" 
                  : "bg-red-500/20 text-red-300 border-red-500/30"
              }`}
            >
              <Send className="w-3 h-3 mr-1 lg:w-4 lg:h-4 lg:mr-2" />
              <span className="hidden lg:inline">
                {isTelegramConnected ? "ربات تلگرام متصل" : "ربات تلگرام قطع"}
              </span>
              <span className="lg:hidden">
                {isTelegramConnected ? "متصل" : "قطع"}
              </span>
            </Badge>
            
            {/* AI Assistant Quick Access */}
            <Button 
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-white border-purple-500/30 backdrop-blur-sm"
              onClick={() => window.location.href = '/ai-assistant'}
            >
              <Bot className="w-4 h-4 mr-2" />
              دستیار هوشمند
            </Button>
            
            {/* Logout Button */}
            <Button 
              variant="outline"
              size="sm"
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30 hover:text-white backdrop-blur-sm transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              خروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
