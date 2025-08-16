import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Edit, 
  UserCheck, 
  UserX,
  Mail,
  Phone,
  Shield
} from 'lucide-react';

export function SupportStaffManagement() {
  const [staffMembers, setStaffMembers] = useState([
    {
      id: 1,
      name: 'احمد محمدی',
      email: 'ahmad@company.com',
      phone: '09123456789',
      role: 'SENIOR_SUPPORT',
      department: 'CRM_SUPPORT',
      isActive: true,
      permissions: ['VIEW_REPRESENTATIVES', 'MANAGE_SUPPORT_TICKETS'],
      joinDate: '1403/02/15'
    },
    {
      id: 2,
      name: 'زهرا احمدی',
      email: 'zahra@company.com',
      phone: '09123456788',
      role: 'SUPPORT_AGENT',
      department: 'TECHNICAL_SUPPORT',
      isActive: true,
      permissions: ['VIEW_REPRESENTATIVES'],
      joinDate: '1403/03/01'
    }
  ]);

  const [showNewStaffForm, setShowNewStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SUPPORT_AGENT',
    department: 'CRM_SUPPORT'
  });

  const handleCreateStaff = () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    
    const staff = {
      id: Date.now(),
      ...newStaff,
      isActive: true,
      permissions: ['VIEW_REPRESENTATIVES'],
      joinDate: new Date().toLocaleDateString('fa-IR')
    };
    
    setStaffMembers([staff, ...staffMembers]);
    setNewStaff({ name: '', email: '', phone: '', role: 'SUPPORT_AGENT', department: 'CRM_SUPPORT' });
    setShowNewStaffForm(false);
  };

  const toggleStaffStatus = (staffId: number) => {
    setStaffMembers(staffMembers.map(staff => 
      staff.id === staffId ? { ...staff, isActive: !staff.isActive } : staff
    ));
  };

  const handleEditStaff = (staff: any) => {
    setEditingStaff(staff);
    setNewStaff({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      department: staff.department
    });
    setShowNewStaffForm(true);
  };

  const handleUpdateStaff = () => {
    if (!newStaff.name.trim() || !newStaff.email.trim() || !editingStaff) return;
    
    setStaffMembers(staffMembers.map(staff => 
      staff.id === (editingStaff as any).id 
        ? { ...staff, ...newStaff }
        : staff
    ));
    
    setNewStaff({ name: '', email: '', phone: '', role: 'SUPPORT_AGENT', department: 'CRM_SUPPORT' });
    setEditingStaff(null);
    setShowNewStaffForm(false);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SENIOR_SUPPORT': return 'پشتیبان ارشد';
      case 'SUPPORT_AGENT': return 'کارشناس پشتیبانی';
      case 'SUPERVISOR': return 'سرپرست';
      default: return 'کارمند';
    }
  };

  const getDepartmentText = (dept: string) => {
    switch (dept) {
      case 'CRM_SUPPORT': return 'پشتیبانی CRM';
      case 'TECHNICAL_SUPPORT': return 'پشتیبانی فنی';
      case 'CUSTOMER_SERVICE': return 'خدمات مشتریان';
      default: return 'عمومی';
    }
  };

  const activeStaff = staffMembers.filter(s => s.isActive).length;
  const inactiveStaff = staffMembers.filter(s => !s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {staffMembers.length}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              کل کارمندان
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {activeStaff}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              فعال
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {inactiveStaff}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              غیرفعال
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {staffMembers.filter(s => s.role === 'SENIOR_SUPPORT').length}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              پشتیبان ارشد
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & New Staff */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            👥 تیم پشتیبانی
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت کارمندان و دسترسی‌ها
          </p>
        </div>
        
        <Button 
          onClick={() => setShowNewStaffForm(!showNewStaffForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          کارمند جدید
        </Button>
      </div>

      {/* New Staff Form */}
      {showNewStaffForm && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              {editingStaff ? 'ویرایش کارمند' : 'افزودن کارمند جدید'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="نام و نام خانوادگی"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900"
              />
              
              <Input
                type="email"
                placeholder="آدرس ایمیل"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900"
              />
              
              <Input
                placeholder="شماره تماس"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900"
              />
              
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="SUPPORT_AGENT">کارشناس پشتیبانی</option>
                <option value="SENIOR_SUPPORT">پشتیبان ارشد</option>
                <option value="SUPERVISOR">سرپرست</option>
              </select>
              
              <select
                value={newStaff.department}
                onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="CRM_SUPPORT">پشتیبانی CRM</option>
                <option value="TECHNICAL_SUPPORT">پشتیبانی فنی</option>
                <option value="CUSTOMER_SERVICE">خدمات مشتریان</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={editingStaff ? handleUpdateStaff : handleCreateStaff} 
                className="bg-green-600 hover:bg-green-700"
              >
                {editingStaff ? 'بروزرسانی کارمند' : 'افزودن کارمند'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewStaffForm(false);
                  setEditingStaff(null);
                  setNewStaff({ name: '', email: '', phone: '', role: 'SUPPORT_AGENT', department: 'CRM_SUPPORT' });
                }}
                className="border-gray-300 dark:border-gray-600"
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {staffMembers.map((staff) => (
          <Card key={staff.id} className={`${
            staff.isActive 
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
              : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
          } hover:shadow-md transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    staff.isActive 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Users className={`w-5 h-5 ${
                      staff.isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${
                      staff.isActive 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {staff.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getRoleText(staff.role)}
                    </p>
                  </div>
                </div>
                
                <Badge className={
                  staff.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }>
                  {staff.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{staff.email}</span>
                </div>
                
                {staff.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{staff.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{getDepartmentText(staff.department)}</span>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  تاریخ عضویت: {staff.joinDate}
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleStaffStatus(staff.id)}
                  className={
                    staff.isActive 
                      ? 'border-red-300 text-red-600 hover:bg-red-50'
                      : 'border-green-300 text-green-600 hover:bg-green-50'
                  }
                >
                  {staff.isActive ? (
                    <>
                      <UserX className="w-4 h-4 ml-1" />
                      غیرفعال
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 ml-1" />
                      فعال
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditStaff(staff)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="w-4 h-4 ml-1" />
                  ویرایش
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staffMembers.length === 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              هنوز کارمندی اضافه نشده است
            </p>
            <Button 
              onClick={() => setShowNewStaffForm(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              افزودن اولین کارمند
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}