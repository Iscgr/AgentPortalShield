import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

// Simplified Header after deprecations: removed time, telegram status, AI assistant, logout.
export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="unified-card mx-4 lg:mx-6 mt-4 mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              aria-label="باز کردن منوی ناوبری"
              title="باز کردن منوی ناوبری"
              className="lg:hidden text-foreground hover:bg-muted focus-ring"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </Button>

            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                داشبورد مدیریت مالی
              </h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                مدیریت فاکتورها، پرداخت‌ها و نمایندگان
              </p>
            </div>
          </div>

          {/* Right side intentionally minimal per cleanup spec */}
          <div />
        </div>
      </div>
    </header>
  );
}