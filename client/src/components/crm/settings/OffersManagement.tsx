import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Plus, 
  Calendar, 
  Target, 
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

export function OffersManagement() {
  const [offers, setOffers] = useState([
    {
      id: 1,
      title: 'آفر ویژه عید نوروز',
      description: 'تخفیف 20% برای تمام محصولات در مناسبت عید نوروز',
      type: 'SEASONAL_DISCOUNT',
      discountPercentage: 20,
      targetGroup: 'ALL_CUSTOMERS',
      isActive: true,
      startDate: '1403/01/01',
      endDate: '1403/01/15',
      usageCount: 45,
      conversionRate: 0.18
    },
    {
      id: 2,
      title: 'پاداش خرید عمده',
      description: 'تخفیف 15% برای سفارش‌های بالای 1 میلیون تومان',
      type: 'VOLUME_DISCOUNT',
      discountPercentage: 15,
      targetGroup: 'BULK_BUYERS',
      isActive: true,
      startDate: '1403/04/01',
      endDate: '1403/06/30',
      usageCount: 12,
      conversionRate: 0.34
    },
    {
      id: 3,
      title: 'آفر مشتریان وفادار',
      description: 'کارت هدیه 500 هزار تومانی برای مشتریان قدیمی',
      type: 'LOYALTY_REWARD',
      discountPercentage: 0,
      targetGroup: 'LOYAL_CUSTOMERS',
      isActive: false,
      startDate: '1403/03/01',
      endDate: '1403/03/31',
      usageCount: 28,
      conversionRate: 0.42
    }
  ]);

  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    type: 'SEASONAL_DISCOUNT',
    discountPercentage: 0,
    targetGroup: 'ALL_CUSTOMERS',
    startDate: '',
    endDate: ''
  });

  const [showNewOfferForm, setShowNewOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  const handleCreateOffer = () => {
    if (!newOffer.title.trim() || !newOffer.description.trim()) return;
    
    const offer = {
      id: Date.now(),
      ...newOffer,
      isActive: true,
      usageCount: 0,
      conversionRate: 0
    };
    
    setOffers([offer, ...offers]);
    setNewOffer({ 
      title: '', 
      description: '', 
      type: 'SEASONAL_DISCOUNT', 
      discountPercentage: 0, 
      targetGroup: 'ALL_CUSTOMERS',
      startDate: '',
      endDate: ''
    });
    setShowNewOfferForm(false);
  };

  const toggleOfferStatus = (offerId: number) => {
    setOffers(offers.map(offer => 
      offer.id === offerId ? { ...offer, isActive: !offer.isActive } : offer
    ));
  };

  const handleDeleteOffer = (offerId: number) => {
    setOffers(offers.filter(offer => offer.id !== offerId));
  };

  const handleEditOffer = (offer: any) => {
    setEditingOffer(offer);
    setNewOffer({
      title: offer.title,
      description: offer.description,
      type: offer.type,
      discountPercentage: offer.discountPercentage,
      targetGroup: offer.targetGroup,
      startDate: offer.startDate,
      endDate: offer.endDate
    });
    setShowNewOfferForm(true);
  };

  const handleUpdateOffer = () => {
    if (!newOffer.title.trim() || !newOffer.description.trim() || !editingOffer) return;
    
    setOffers(offers.map(offer => 
      offer.id === (editingOffer as any).id 
        ? { ...offer, ...newOffer }
        : offer
    ));
    
    setNewOffer({ 
      title: '', 
      description: '', 
      type: 'SEASONAL_DISCOUNT', 
      discountPercentage: 0, 
      targetGroup: 'ALL_CUSTOMERS',
      startDate: '',
      endDate: ''
    });
    setEditingOffer(null);
    setShowNewOfferForm(false);
  };

  const getOfferTypeText = (type: string) => {
    switch (type) {
      case 'SEASONAL_DISCOUNT': return 'تخفیف فصلی';
      case 'VOLUME_DISCOUNT': return 'تخفیف حجمی';
      case 'LOYALTY_REWARD': return 'پاداش وفاداری';
      case 'FIRST_PURCHASE': return 'خرید اول';
      case 'REFERRAL_BONUS': return 'پاداش معرفی';
      default: return 'عمومی';
    }
  };

  const getTargetGroupText = (group: string) => {
    switch (group) {
      case 'ALL_CUSTOMERS': return 'همه مشتریان';
      case 'BULK_BUYERS': return 'خریداران عمده';
      case 'LOYAL_CUSTOMERS': return 'مشتریان وفادار';
      case 'NEW_CUSTOMERS': return 'مشتریان جدید';
      case 'VIP_CUSTOMERS': return 'مشتریان VIP';
      default: return 'نامشخص';
    }
  };

  const getOfferTypeColor = (type: string) => {
    switch (type) {
      case 'SEASONAL_DISCOUNT': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'VOLUME_DISCOUNT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'LOYALTY_REWARD': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'FIRST_PURCHASE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REFERRAL_BONUS': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const activeOffers = offers.filter(o => o.isActive).length;
  const totalUsage = offers.reduce((sum, offer) => sum + offer.usageCount, 0);
  const avgConversion = offers.length > 0 
    ? offers.reduce((sum, offer) => sum + offer.conversionRate, 0) / offers.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {offers.length}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">
              کل آفرها
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {activeOffers}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              فعال
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {totalUsage}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              استفاده کل
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {(avgConversion * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              میانگین تبدیل
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & New Offer */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            🎁 آفرها و مشوق‌ها
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت کمپین‌های تشویقی و تخفیفات
          </p>
        </div>
        
        <Button 
          onClick={() => setShowNewOfferForm(!showNewOfferForm)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          آفر جدید
        </Button>
      </div>

      {/* New Offer Form */}
      {showNewOfferForm && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {editingOffer ? 'ویرایش آفر' : 'ایجاد آفر جدید'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="عنوان آفر..."
              value={newOffer.title}
              onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
            />
            
            <Textarea
              placeholder="توضیحات آفر..."
              value={newOffer.description}
              onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  نوع آفر
                </label>
                <select
                  value={newOffer.type}
                  onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="SEASONAL_DISCOUNT">تخفیف فصلی</option>
                  <option value="VOLUME_DISCOUNT">تخفیف حجمی</option>
                  <option value="LOYALTY_REWARD">پاداش وفاداری</option>
                  <option value="FIRST_PURCHASE">خرید اول</option>
                  <option value="REFERRAL_BONUS">پاداش معرفی</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  درصد تخفیف
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newOffer.discountPercentage}
                  onChange={(e) => setNewOffer({ ...newOffer, discountPercentage: parseInt(e.target.value) || 0 })}
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  گروه هدف
                </label>
                <select
                  value={newOffer.targetGroup}
                  onChange={(e) => setNewOffer({ ...newOffer, targetGroup: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="ALL_CUSTOMERS">همه مشتریان</option>
                  <option value="BULK_BUYERS">خریداران عمده</option>
                  <option value="LOYAL_CUSTOMERS">مشتریان وفادار</option>
                  <option value="NEW_CUSTOMERS">مشتریان جدید</option>
                  <option value="VIP_CUSTOMERS">مشتریان VIP</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاریخ شروع
                </label>
                <Input
                  type="text"
                  placeholder="1403/05/30"
                  value={newOffer.startDate}
                  onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاریخ پایان
                </label>
                <Input
                  type="text"
                  placeholder="1403/06/30"
                  value={newOffer.endDate}
                  onChange={(e) => setNewOffer({ ...newOffer, endDate: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={editingOffer ? handleUpdateOffer : handleCreateOffer} 
                className="bg-green-600 hover:bg-green-700"
              >
                {editingOffer ? 'بروزرسانی آفر' : 'ایجاد آفر'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewOfferForm(false);
                  setEditingOffer(null);
                  setNewOffer({ 
                    title: '', 
                    description: '', 
                    type: 'SEASONAL_DISCOUNT', 
                    discountPercentage: 0, 
                    targetGroup: 'ALL_CUSTOMERS',
                    startDate: '',
                    endDate: ''
                  });
                }}
                className="border-gray-300 dark:border-gray-600"
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offers List */}
      <div className="space-y-4">
        {offers.map((offer) => (
          <Card key={offer.id} className={`${
            offer.isActive 
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
              : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
          } hover:shadow-md transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className={`w-5 h-5 ${
                      offer.isActive 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-gray-400'
                    }`} />
                    <h4 className={`font-semibold ${
                      offer.isActive 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {offer.title}
                    </h4>
                    <Badge className={getOfferTypeColor(offer.type)}>
                      {getOfferTypeText(offer.type)}
                    </Badge>
                    <Badge className={
                      offer.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }>
                      {offer.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {offer.description}
                  </p>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {offer.discountPercentage > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">تخفیف:</span>
                        <div className="font-medium text-orange-600 dark:text-orange-400">
                          {offer.discountPercentage}%
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">گروه هدف:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {getTargetGroupText(offer.targetGroup)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">استفاده:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {offer.usageCount} بار
                      </div>
                    </div>
                    
                    {offer.conversionRate > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">نرخ تبدیل:</span>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {(offer.conversionRate * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(offer.startDate || offer.endDate) && (
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-3">
                      {offer.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>از {offer.startDate}</span>
                        </div>
                      )}
                      {offer.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>تا {offer.endDate}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleOfferStatus(offer.id)}
                    className={
                      offer.isActive 
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }
                  >
                    {offer.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4 ml-1" />
                        غیرفعال
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 ml-1" />
                        فعال
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditOffer(offer)}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    ویرایش
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {offers.length === 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-8 text-center">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                هنوز آفری تعریف نشده است
              </p>
              <Button 
                onClick={() => setShowNewOfferForm(true)}
                className="mt-4 bg-orange-600 hover:bg-orange-700"
              >
                ایجاد اولین آفر
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}