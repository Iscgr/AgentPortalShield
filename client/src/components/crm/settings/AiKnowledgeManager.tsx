import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Plus, 
  Search, 
  BookOpen, 
  TrendingUp,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

export function AiKnowledgeManager() {
  const [knowledgeEntries, setKnowledgeEntries] = useState([
    {
      id: 1,
      title: 'رفتار مشتریان ایرانی در خرید',
      content: 'مشتریان ایرانی معمولاً به روابط شخصی و اعتماد توجه زیادی دارند. آنها ترجیح می‌دهند با فروشنده‌ای که احساس نزدیکی دارند، خرید کنند.',
      category: 'CUSTOMER_BEHAVIOR',
      tags: ['فرهنگ', 'خرید', 'روابط'],
      usageCount: 15,
      effectiveness: 0.85,
      lastUsed: '1403/05/10'
    },
    {
      id: 2,
      title: 'استراتژی فروش در ماه رمضان',
      content: 'در ماه رمضان، فعالیت‌های تجاری کاهش می‌یابد. بهتر است آفرهای ویژه برای افطار و سحر طراحی شود.',
      category: 'SALES_STRATEGY',
      tags: ['رمضان', 'فصلی', 'آفر'],
      usageCount: 8,
      effectiveness: 0.92,
      lastUsed: '1403/04/25'
    },
    {
      id: 3,
      title: 'مدیریت شکایات مشتریان',
      content: 'هنگام رسیدگی به شکایات، ابتدا عذرخواهی کنید، سپس مشکل را بشنوید و راه‌حل مناسب ارائه دهید.',
      category: 'CUSTOMER_SERVICE',
      tags: ['شکایت', 'خدمات', 'حل مسئله'],
      usageCount: 22,
      effectiveness: 0.78,
      lastUsed: '1403/05/12'
    }
  ]);

  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    category: 'CUSTOMER_BEHAVIOR',
    tags: ''
  });

  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const handleCreateEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;
    
    const entry = {
      id: Date.now(),
      ...newEntry,
      tags: newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      usageCount: 0,
      effectiveness: 0,
      lastUsed: ''
    };
    
    setKnowledgeEntries([entry, ...knowledgeEntries]);
    setNewEntry({ title: '', content: '', category: 'CUSTOMER_BEHAVIOR', tags: '' });
    setShowNewEntryForm(false);
  };

  const handleDeleteEntry = (entryId: number) => {
    setKnowledgeEntries(knowledgeEntries.filter(entry => entry.id !== entryId));
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags.join(', ')
    });
    setShowNewEntryForm(true);
  };

  const handleUpdateEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim() || !editingEntry) return;
    
    const updatedEntry = {
      ...(editingEntry as any),
      title: newEntry.title,
      content: newEntry.content,
      category: newEntry.category,
      tags: newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    };
    
    setKnowledgeEntries(knowledgeEntries.map(entry => 
      entry.id === (editingEntry as any).id ? updatedEntry : entry
    ));
    
    setNewEntry({ title: '', content: '', category: 'CUSTOMER_BEHAVIOR', tags: '' });
    setEditingEntry(null);
    setShowNewEntryForm(false);
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'CUSTOMER_BEHAVIOR': return 'رفتار مشتری';
      case 'SALES_STRATEGY': return 'استراتژی فروش';
      case 'CUSTOMER_SERVICE': return 'خدمات مشتری';
      case 'CULTURAL_INSIGHTS': return 'بینش فرهنگی';
      case 'COMMUNICATION': return 'ارتباطات';
      default: return 'عمومی';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CUSTOMER_BEHAVIOR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SALES_STRATEGY': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CUSTOMER_SERVICE': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'CULTURAL_INSIGHTS': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'COMMUNICATION': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredEntries = knowledgeEntries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'ALL' || entry.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const totalEntries = knowledgeEntries.length;
  const totalUsage = knowledgeEntries.reduce((sum, entry) => sum + entry.usageCount, 0);
  const avgEffectiveness = knowledgeEntries.length > 0 
    ? knowledgeEntries.reduce((sum, entry) => sum + entry.effectiveness, 0) / knowledgeEntries.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {totalEntries}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              کل مطالب
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

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {(avgEffectiveness * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              میانگین اثربخشی
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {Object.keys(knowledgeEntries.reduce((acc: any, entry) => { acc[entry.category] = true; return acc; }, {})).length}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">
              دسته‌بندی
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="جستجو در دیتابیس دانش..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 pr-10"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="ALL">همه دسته‌ها</option>
            <option value="CUSTOMER_BEHAVIOR">رفتار مشتری</option>
            <option value="SALES_STRATEGY">استراتژی فروش</option>
            <option value="CUSTOMER_SERVICE">خدمات مشتری</option>
            <option value="CULTURAL_INSIGHTS">بینش فرهنگی</option>
            <option value="COMMUNICATION">ارتباطات</option>
          </select>
        </div>
        
        <Button 
          onClick={() => setShowNewEntryForm(!showNewEntryForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          افزودن دانش جدید
        </Button>
      </div>

      {/* New Entry Form */}
      {showNewEntryForm && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {editingEntry ? 'ویرایش دانش' : 'افزودن دانش جدید'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="عنوان مطلب..."
              value={newEntry.title}
              onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
            />
            
            <Textarea
              placeholder="محتوای دانش..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
              rows={4}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  دسته‌بندی
                </label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="CUSTOMER_BEHAVIOR">رفتار مشتری</option>
                  <option value="SALES_STRATEGY">استراتژی فروش</option>
                  <option value="CUSTOMER_SERVICE">خدمات مشتری</option>
                  <option value="CULTURAL_INSIGHTS">بینش فرهنگی</option>
                  <option value="COMMUNICATION">ارتباطات</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  برچسب‌ها (جدا شده با کاما)
                </label>
                <Input
                  placeholder="فرهنگ، خرید، روابط"
                  value={newEntry.tags}
                  onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={editingEntry ? handleUpdateEntry : handleCreateEntry} 
                className="bg-green-600 hover:bg-green-700"
              >
                {editingEntry ? 'بروزرسانی دانش' : 'افزودن به دیتابیس'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewEntryForm(false);
                  setEditingEntry(null);
                  setNewEntry({ title: '', content: '', category: 'CUSTOMER_BEHAVIOR', tags: '' });
                }}
                className="border-gray-300 dark:border-gray-600"
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Entries */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {entry.title}
                    </h4>
                    <Badge className={getCategoryColor(entry.category)}>
                      {getCategoryText(entry.category)}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                    {entry.content}
                  </p>
                  
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {entry.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-gray-300 dark:border-gray-600">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{entry.usageCount} استفاده</span>
                    </div>
                    
                    {entry.effectiveness > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{(entry.effectiveness * 100).toFixed(0)}% اثربخش</span>
                      </div>
                    )}
                    
                    {entry.lastUsed && (
                      <div className="text-xs">
                        آخرین استفاده: {entry.lastUsed}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditEntry(entry)}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    ویرایش
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteEntry(entry.id)}
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
        
        {filteredEntries.length === 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterCategory !== 'ALL' 
                  ? 'نتیجه‌ای یافت نشد'
                  : 'هنوز دانشی اضافه نشده است'
                }
              </p>
              {!searchTerm && filterCategory === 'ALL' && (
                <Button 
                  onClick={() => setShowNewEntryForm(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                >
                  افزودن اولین دانش
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}