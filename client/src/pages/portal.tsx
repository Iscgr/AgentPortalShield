import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";

// Type definitions for portal data
interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  usageData?: {
    records?: Array<{
      event_timestamp: string;
      event_type: string;
      description: string;
      admin_username: string;
    }>;
    type?: string;
    description?: string;
    createdBy?: string;
    createdAt?: string;
  };
}

interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  description?: string;
}

interface PortalData {
  name: string;
  panelUsername: string;
  totalSales: string;
  totalDebt: string;
  credit: string;
  invoices: Invoice[];
  payments: Payment[];
}

// Invoice Card Component with enhanced usage breakdown
function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [showUsageDetails, setShowUsageDetails] = useState(false);

  const toggleUsageDetails = () => {
    try {
      setShowUsageDetails(!showUsageDetails);
    } catch (error) {
      console.error('Toggle usage details error:', error);
    }
  };

  return (
    <div style={{ 
      background: '#475569', 
      padding: '15px', 
      borderRadius: '8px',
      border: '1px solid #64748b'
    }}>
      {/* Invoice Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
            {invoice.invoiceNumber}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            تاریخ: {invoice.issueDate}
          </p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            {parseFloat(String(invoice.amount || '0')).toLocaleString('fa-IR')} تومان
          </p>
          <p style={{ 
            fontSize: '12px', 
            padding: '4px 8px', 
            borderRadius: '4px',
            background: invoice.status === 'paid' ? '#059669' : 
                       invoice.status === 'partial' ? '#ea580c' : '#dc2626',
            color: 'white',
            display: 'inline-block'
          }}>
            {invoice.status === 'paid' ? 'پرداخت شده' : 
             invoice.status === 'partial' ? 'تسویه جزئی' : 'پرداخت نشده'}
          </p>
        </div>
      </div>

      {/* Toggle Button for Usage Details - Enhanced for Manual Invoices */}
      {(invoice.usageData && (invoice.usageData.records || invoice.usageData.type === 'manual')) && (
        <button 
          onClick={toggleUsageDetails}
          style={{
            background: 'linear-gradient(135deg, #1e40af, #3730a3)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: showUsageDetails ? '15px' : '0'
          }}
        >
          {showUsageDetails ? 'پنهان کردن جزئیات' : 
           (invoice.usageData.type === 'manual' ? 'نمایش جزئیات فاکتور دستی' : 'نمایش ریز جزئیات مصرف')}
        </button>
      )}

      {/* Usage Details Panel - Enhanced for Both Automatic and Manual Invoices */}
      {showUsageDetails && invoice.usageData && (
        <div>
          {/* Automatic Invoice Details (JSON-based with records) */}
          {invoice.usageData.records && (
            <div style={{
              background: '#1f2937',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #374151',
              marginTop: '10px'
            }}>
              <h5 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '12px',
                color: '#93c5fd'
              }}>
                ریز جزئیات مصرف دوره (فاکتور خودکار)
              </h5>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoice.usageData.records.map((record: any, idx: number) => (
                  <div key={idx} style={{
                    background: '#374151',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #4b5563'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <p style={{ color: '#d1d5db', marginBottom: '4px' }}>
                          <strong>نوع رویداد:</strong> {record.event_type || 'نامشخص'}
                        </p>
                        <p style={{ color: '#d1d5db', marginBottom: '4px' }}>
                          <strong>زمان:</strong> {record.event_timestamp || 'نامشخص'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#d1d5db', marginBottom: '4px' }}>
                          <strong>مبلغ:</strong> {record.amount ? parseFloat(record.amount).toLocaleString('fa-IR') : '0'} تومان
                        </p>
                        <p style={{ color: '#d1d5db', marginBottom: '4px' }}>
                          <strong>کاربر ادمین:</strong> {record.admin_username || 'نامشخص'}
                        </p>
                      </div>
                    </div>
                    {record.description && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #4b5563' }}>
                        <p style={{ color: '#9ca3af', fontSize: '11px' }}>
                          <strong>توضیحات:</strong> {record.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Summary */}
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: '#065f46',
                borderRadius: '6px',
                border: '1px solid #047857'
              }}>
                <p style={{ fontSize: '12px', color: '#d1fae5' }}>
                  <strong>خلاصه:</strong> تعداد رکوردها: {invoice.usageData.records.length} | 
                  مجموع مبلغ: {parseFloat(invoice.amount).toLocaleString('fa-IR')} تومان
                </p>
              </div>
            </div>
          )}
          
          {/* Manual Invoice Details (Hand-created invoices) */}
          {invoice.usageData.type === 'manual' && (
            <div style={{
              background: '#1f2937',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #374151',
              marginTop: '10px'
            }}>
              <h5 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                marginBottom: '12px',
                color: '#f59e0b'
              }}>
                جزئیات فاکتور دستی
              </h5>
              
              <div style={{
                background: '#374151',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #4b5563'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <p style={{ color: '#d1d5db', marginBottom: '6px' }}>
                      <strong>نوع فاکتور:</strong> <span style={{ color: '#fbbf24' }}>دستی</span>
                    </p>
                    <p style={{ color: '#d1d5db', marginBottom: '6px' }}>
                      <strong>ایجاد شده توسط:</strong> {invoice.usageData.createdBy || 'مدیر سیستم'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#d1d5db', marginBottom: '6px' }}>
                      <strong>مبلغ کل:</strong> {parseFloat(invoice.amount).toLocaleString('fa-IR')} تومان
                    </p>
                    <p style={{ color: '#d1d5db', marginBottom: '6px' }}>
                      <strong>تاریخ ایجاد:</strong> {invoice.usageData.createdAt ? 
                        new Date(invoice.usageData.createdAt).toLocaleDateString('fa-IR') : 
                        invoice.issueDate}
                    </p>
                  </div>
                </div>
                
                {invoice.usageData.description && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #4b5563' }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
                      <strong>توضیحات:</strong> {invoice.usageData.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Summary for Manual Invoice */}
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: '#d97706',
                borderRadius: '6px',
                border: '1px solid #f59e0b'
              }}>
                <p style={{ fontSize: '12px', color: '#fef3c7' }}>
                  <strong>خلاصه:</strong> فاکتور دستی | 
                  مبلغ: {parseFloat(invoice.amount).toLocaleString('fa-IR')} تومان | 
                  وضعیت: {invoice.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Portal() {
  const { publicId } = useParams<{ publicId: string }>();

  const { data, isLoading, error } = useQuery<PortalData>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
  });

  console.log('=== SHERLOCK v1.0 PORTAL DEBUG ===');
  console.log('publicId:', publicId);
  console.log('data:', data);
  console.log('isLoading:', isLoading);
  console.log('error:', error);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e293b, #334155, #475569)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>در حال بارگذاری...</h1>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>خطا در بارگذاری!</h1>
        <p>داده: {JSON.stringify(data)}</p>
        <p>خطا: {JSON.stringify(error)}</p>
      </div>
    );
  }

  // SHERLOCK v16.3 RUNTIME ERROR FIX: Safe data extraction with comprehensive error handling
  let totalSales: number, totalDebt: number, credit: number, invoices: Invoice[], payments: Payment[];
  
  try {
    totalSales = parseFloat(String(data.totalSales || '0'));
    totalDebt = parseFloat(String(data.totalDebt || '0'));
    credit = parseFloat(String(data.credit || '0'));
    invoices = Array.isArray(data.invoices) ? data.invoices : [];
    payments = Array.isArray(data.payments) ? data.payments : [];
    
    // Validate numeric values
    if (isNaN(totalSales)) totalSales = 0;
    if (isNaN(totalDebt)) totalDebt = 0;
    if (isNaN(credit)) credit = 0;
    
  } catch (error) {
    console.error('Portal data extraction error:', error);
    totalSales = 0;
    totalDebt = 0;
    credit = 0;
    invoices = [];
    payments = [];
  }
  
  // Use database values instead of recalculating for consistency
  const actualTotalDebt = totalDebt;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e293b, #334155, #475569)', 
      color: 'white', 
      padding: '20px',
      fontFamily: 'Tahoma, sans-serif',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af, #3730a3)', 
        padding: '30px', 
        borderRadius: '15px',
        marginBottom: '30px',
        border: '2px solid #3b82f6'
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>
          پرتال عمومی نماینده
        </h1>
        <h2 style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '10px' }}>
          {data.name}
        </h2>
        <p style={{ fontSize: '16px', color: '#dbeafe' }}>
          شناسه پنل: {data.panelUsername}
        </p>
      </div>

      {/* Financial Overview - Simple Cards */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۱. موجودی مالی و وضعیت حساب
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {/* Total Debt - Calculated from unpaid invoices minus payments */}
          <div style={{ 
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #ef4444'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>بدهی کل</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {actualTotalDebt.toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              فاکتورهای پرداخت نشده منهای پرداخت‌ها
            </p>
          </div>

          {/* Total Sales */}
          <div style={{ 
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', 
            padding: '20px', 
            borderRadius: '10px',
            border: '2px solid #3b82f6'
          }}>
            <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>فروش کل</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
              {totalSales.toLocaleString('fa-IR')} تومان
            </p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>
              مجموع فروش ثبت شده
            </p>
          </div>

          {/* Credit Balance (if exists) */}
          {credit > 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)', 
              padding: '20px', 
              borderRadius: '10px',
              border: '2px solid #10b981'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '10px', opacity: 0.9 }}>پرداختی</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '5px' }}>
                {credit.toLocaleString('fa-IR')} تومان
              </p>
              <p style={{ fontSize: '12px', opacity: 0.8 }}>
                اضافه پرداخت شما
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoices Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۲. فاکتورها (قدیمی‌ترین ابتدا - FIFO)
        </h3>
        <div style={{ 
          background: '#334155', 
          padding: '20px', 
          borderRadius: '10px',
          border: '2px solid #475569'
        }}>
          {invoices.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {invoices.map((invoice: Invoice, index: number) => (
                <InvoiceCard key={index} invoice={invoice} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '18px', opacity: 0.7 }}>
              فاکتوری یافت نشد
            </p>
          )}
        </div>
      </div>

      {/* Payments Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          ۳. تاریخچه پرداخت‌ها ({payments.length} پرداخت)
        </h3>
        <div style={{ 
          background: '#334155', 
          padding: '20px', 
          borderRadius: '10px',
          border: '2px solid #475569'
        }}>
          {payments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {payments.map((payment: Payment, index: number) => (
                <div key={index} style={{ 
                  background: 'linear-gradient(135deg, #059669, #047857)', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #10b981'
                }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {parseFloat(payment.amount).toLocaleString('fa-IR')} تومان
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.9 }}>
                    تاریخ: {payment.paymentDate}
                  </p>
                  {payment.description && (
                    <p style={{ fontSize: '12px', opacity: 0.8 }}>
                      {payment.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '18px', opacity: 0.7 }}>
              پرداختی یافت نشد
            </p>
          )}
        </div>
      </div>
    </div>
  );
}