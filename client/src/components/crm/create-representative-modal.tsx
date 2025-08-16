import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, User } from 'lucide-react';

interface CreateRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export default function CreateRepresentativeModal({
  isOpen,
  onClose,
  onSave,
  isLoading
}: CreateRepresentativeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    ownerName: '',
    phone: '',
    panelUsername: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام نماینده الزامی است';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'کد نماینده الزامی است';
    } else if (formData.code.length < 2) {
      newErrors.code = 'کد نماینده باید حداقل ۲ کاراکتر باشد';
    }

    if (formData.phone && !/^09\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'شماره تماس باید با 09 شروع شده و ۱۱ رقم باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      ownerName: '',
      phone: '',
      panelUsername: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 to-black border-white/20" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Plus className="w-8 h-8 text-green-400" />
            افزودن نماینده جدید
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-black/20 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="w-5 h-5 ml-2 text-blue-400" />
                اطلاعات اصلی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">نام نماینده *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1"
                    placeholder="نام کامل نماینده"
                    required
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="code" className="text-white">کد نماینده *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className="bg-white/10 border-white/20 text-white mt-1"
                    placeholder="کد یکتا نماینده"
                    required
                  />
                  {errors.code && (
                    <p className="text-red-400 text-sm mt-1">{errors.code}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ownerName" className="text-white">نام مالک</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1"
                    placeholder="نام مالک نمایندگی"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">شماره تماس</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1"
                    placeholder="09xxxxxxxxx"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="panelUsername" className="text-white">نام کاربری پنل</Label>
                  <Input
                    id="panelUsername"
                    value={formData.panelUsername}
                    onChange={(e) => handleInputChange('panelUsername', e.target.value)}
                    className="bg-white/10 border-white/20 text-white mt-1"
                    placeholder="نام کاربری برای دسترسی به پنل"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="bg-blue-950/20 border-blue-400/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="text-blue-300 font-semibold mb-2">نکات مهم:</h4>
                  <ul className="text-blue-200 text-sm space-y-1">
                    <li>• کد نماینده باید یکتا باشد و قابل تغییر نیست</li>
                    <li>• شماره تماس برای ارتباط مستقیم استفاده می‌شود</li>
                    <li>• نام کاربری پنل اختیاری است و برای دسترسی به پورتال عمومی</li>
                    <li>• تمام اطلاعات بعداً قابل ویرایش هستند</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 ml-2" />
              انصراف
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 ml-2" />
              {isLoading ? 'در حال ایجاد...' : 'ایجاد نماینده'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}