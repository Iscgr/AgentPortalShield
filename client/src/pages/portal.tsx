import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";

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
  isAllocated: boolean; // Added to reflect the new database field
  invoiceId?: number; // Added to link payment to invoice
}

interface PortalData {
  name: string;
  panelUsername: string;
  totalSales: string;
  totalDebt: string;
  credit: string;
  invoices: Invoice[];
  payments: Payment[];
  financialMeta?: {
    paymentRatio: number;
    debtLevel: string;
    lastCalculation: string;
    accuracyGuaranteed: boolean;
    totalSales?: string; // Added for clarity and potential use
    actualDebt?: string; // Added for clarity and potential use
  };
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
    queryKey: [`/api/public/portal/${publicId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!publicId,
  });

  console.log('=== SHERLOCK v32.1 PORTAL DEBUG ===');
  console.log('publicId:', publicId);
  console.log('Current location:', window.location.pathname);
  console.log('data:', data);
  console.log('isLoading:', isLoading);
  console.log('error:', error);

  // ✅ SHERLOCK v32.1: اضافه کردن validation برای publicId
  if (!publicId || publicId.trim() === '') {
    console.error('❌ SHERLOCK v32.1: publicId خالی یا نامعتبر است');
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'sans-serif',
        direction: 'rtl'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>شناسه پورتال نامعتبر!</h1>
        <p>شناسه پورتال ارائه نشده است. لطفاً لینک صحیح پورتال را استفاده کنید.</p>
      </div>
    );
  }

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
    console.error('=== ATOMOS PORTAL ERROR ANALYSIS ===');
    console.error('Error object:', error);
    console.error('Data object:', data);
    console.error('PublicId:', publicId);
    console.error('Current URL:', window.location.href);

    // ✅ ATOMOS: Enhanced error detection with timeout handling
    const responseError = (error as any)?.response || (error as any)?.cause?.response;
    const isQueryFnError = error?.message?.includes('Missing queryFn');
    const isTimeoutError = responseError?.status === 504 || 
                          error?.message?.includes('timeout') ||
                          error?.message?.includes('Request timeout');
    const isNotFound = responseError?.status === 404 || 
                      error?.message?.includes('404') ||
                      (!data && !error && !isQueryFnError);
    const isServerError = responseError?.status >= 500 && !isTimeoutError;
    const isNetworkError = error?.message?.includes('Network') || 
                          error?.message?.includes('fetch') ||
                          error?.message?.includes('NetworkError');

    // ✅ ATOMOS: Timeout error handling
    if (isTimeoutError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
          color: 'white', 
          padding: '40px',
          fontFamily: 'Tahoma, sans-serif',
          direction: 'rtl',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '40px', 
            borderRadius: '15px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏰</div>
            <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
              زمان پاسخ سرور به پایان رسید!
            </h1>
            <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
              سرور در زمان مقرر پاسخ نداد. این معمولاً به دلیل حجم بالای داده‌ها است.
            </p>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
              لطفاً چند لحظه صبر کنید و مجدداً تلاش کنید.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                background: 'linear-gradient(135deg, #1e40af, #3730a3)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              🔄 تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    // خطای خاص queryFn
    if (isQueryFnError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', 
          color: 'white', 
          padding: '40px',
          fontFamily: 'Tahoma, sans-serif',
          direction: 'rtl',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '40px', 
            borderRadius: '15px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔧</div>
            <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
              خطای تنظیمات Query!
            </h1>
            <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
              مشکل در تنظیمات درخواست API. لطفاً صفحه را مجدداً بارگذاری کنید.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                background: 'linear-gradient(135deg, #1e40af, #3730a3)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              🔄 بارگذاری مجدد
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', 
        color: 'white', 
        padding: '40px',
        fontFamily: 'Tahoma, sans-serif',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          padding: '40px', 
          borderRadius: '15px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>

          {isNotFound && (
            <>
              <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
                پرتال نماینده یافت نشد!
              </h1>
              <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
                شناسه پرتال "{publicId}" در سیستم موجود نیست.
              </p>
              <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
                لطفاً لینک صحیح پرتال را از مدیر سیستم دریافت کنید.
              </p>
            </>
          )}

          {isServerError && (
            <>
              <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
                خطای سرور!
              </h1>
              <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
                مشکلی در سرور به وجود آمده است.
              </p>
              <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
                لطفاً چند دقیقه دیگر مجدداً تلاش کنید.
              </p>
            </>
          )}

          {isNetworkError && (
            <>
              <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
                مشکل اتصال اینترنت!
              </h1>
              <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
                اتصال اینترنت شما قطع شده است.
              </p>
              <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
                لطفاً اتصال اینترنت خود را بررسی کنید.
              </p>
            </>
          )}

          {!isNotFound && !isServerError && !isNetworkError && (
            <>
              <h1 style={{ fontSize: '28px', marginBottom: '20px', fontWeight: 'bold' }}>
                خطا در بارگذاری اطلاعات!
              </h1>
              <p style={{ fontSize: '16px', marginBottom: '15px', lineHeight: '1.6' }}>
                امکان دریافت اطلاعات پرتال وجود ندارد.
              </p>
              <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
                لطفاً صفحه را مجدداً بارگذاری کنید.
              </p>
            </>
          )}

          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: 'linear-gradient(135deg, #1e40af, #3730a3)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            🔄 بارگذاری مجدد
          </button>

          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '30px', textAlign: 'left', fontSize: '12px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>جزئیات فنی (فقط در حالت توسعه)</summary>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '5px' }}>
                <p><strong>Public ID:</strong> {publicId}</p>
                <p><strong>URL:</strong> {window.location.href}</p>
                <p><strong>Error Message:</strong> {error?.message || 'No error message'}</p>
                <p><strong>Response Status:</strong> {responseError?.status || 'No status'}</p>
                <p><strong>Response Data:</strong> {JSON.stringify(responseError?.data || 'No response data', null, 2)}</p>
                <p><strong>Full Error Object:</strong> {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}</p>
                <p><strong>Data Object:</strong> {JSON.stringify(data, null, 2)}</p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // ✅ PORTAL FINANCIAL MIRROR: اتصال مستقیم به سیستم مالی یکپارچه
  let totalSales: number, totalDebt: number, credit: number, invoices: Invoice[], payments: Payment[];

  try {
    console.log('🔍 PORTAL MIRROR: Portal data received:', data);
    console.log('🔍 PORTAL MIRROR: Financial meta from unified engine:', data.financialMeta);

    // ✅ MIRROR STRATEGY: استفاده مستقیم از داده‌های محاسبه شده unified engine
    if (data.financialMeta && data.financialMeta.accuracyGuaranteed) {
      console.log('🎯 PORTAL MIRROR: Using MIRROR data from Unified Financial Engine');

      // Mirror exact values from unified financial calculations
      totalSales = data.financialMeta.totalSales ? parseFloat(data.financialMeta.totalSales) : parseFloat(String(data.totalSales || '0'));
      totalDebt = data.financialMeta.actualDebt ? parseFloat(data.financialMeta.actualDebt) : (data.financialMeta.totalDebt ? parseFloat(data.financialMeta.totalDebt) : parseFloat(String(data.totalDebt || '0')));

      console.log('🔥 PORTAL MIRROR: Mirrored financial values:', {
        totalSalesFromMeta: data.financialMeta.totalSales,
        actualDebtFromMeta: data.financialMeta.actualDebt,
        totalDebtFromMeta: data.financialMeta.totalDebt,
        finalTotalSales: totalSales,
        finalTotalDebt: totalDebt
      });
    } else {
      console.log('⚠️ PORTAL MIRROR: Fallback to database values - calculating real-time');

      // Calculate from raw data as backup
      const invoiceSum = Array.isArray(data.invoices) ? 
        data.invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0) : 0;
      const paymentSum = Array.isArray(data.payments) ? 
        data.payments.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0) : 0;

      totalSales = invoiceSum || parseFloat(String(data.totalSales || '0'));
      totalDebt = Math.max(0, invoiceSum - paymentSum) || parseFloat(String(data.totalDebt || '0'));

      console.log('📊 PORTAL MIRROR: Calculated from raw data:', {
        invoiceSum,
        paymentSum,
        calculatedDebt: totalSales - paymentSum,
        finalTotalSales: totalSales,
        finalTotalDebt: totalDebt
      });
    }

    credit = parseFloat(String(data.credit || '0'));
    invoices = Array.isArray(data.invoices) ? data.invoices : [];
    payments = Array.isArray(data.payments) ? data.payments : [];

    // Enhanced validation with fallback to database values
    if (isNaN(totalSales) || totalSales === 0) {
      totalSales = parseFloat(String(data.totalSales || '0'));
      console.log('🔧 PORTAL MIRROR: Sales fallback to DB value:', totalSales);
    }
    if (isNaN(totalDebt) || totalDebt === 0) {
      totalDebt = parseFloat(String(data.totalDebt || '0'));
      console.log('🔧 PORTAL MIRROR: Debt fallback to DB value:', totalDebt);
    }
    if (isNaN(credit)) credit = 0;

    console.log('✅ PORTAL MIRROR: Final mirrored values:', {
      totalSales: totalSales.toLocaleString(),
      totalDebt: totalDebt.toLocaleString(),
      credit: credit.toLocaleString(),
      invoicesCount: invoices.length,
      paymentsCount: payments.length,
      mirrorSource: data.financialMeta ? 'UNIFIED_ENGINE' : 'RAW_CALCULATION'
    });

  } catch (error) {
    console.error('❌ PORTAL MIRROR: Data extraction error:', error);
    totalSales = 0;
    totalDebt = 0;
    credit = 0;
    invoices = [];
    payments = [];
  }

  // ✅ SHERLOCK v32.1: استفاده از مقادیر محاسبه شده از سرور
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
          پورتال عمومی نماینده
        </h1>
        <h2 style={{ fontSize: '24px', color: '#93c5fd', marginBottom: '10px' }}>
          {data.name}
        </h2>
        <p style={{ fontSize: '16px', color: '#dbeafe' }}>
          شناسه پنل: {data.panelUsername}
        </p>
        {data.financialMeta?.accuracyGuaranteed && (
          <p style={{ fontSize: '12px', color: '#a7f3d0', marginTop: '8px' }}>
            ✅ داده‌های مالی با دقت Real-time محاسبه شده
            {data.financialMeta.lastCalculation && (
              <span style={{ marginLeft: '8px' }}>
                ({new Date(data.financialMeta.lastCalculation).toLocaleString('fa-IR')})
              </span>
            )}
          </p>
        )}
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

      {/* Enhanced Payments Section - Shows ALL payments with status */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#e2e8f0' }}>
          پرداخت‌های ثبت شده ({payments.length})
        </h2>

        {payments.length === 0 ? (
          <div style={{ 
            background: '#374151', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            هیچ پرداختی ثبت نشده است
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {payments.map((payment) => (
              <div key={payment.id} style={{ 
                background: payment.isAllocated ? '#475569' : '#1f2937', 
                padding: '15px', 
                borderRadius: '8px',
                border: `2px solid ${payment.isAllocated ? '#10b981' : '#f59e0b'}`,
                position: 'relative'
              }}>
                {/* Payment Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  background: payment.isAllocated ? '#059669' : '#d97706',
                  color: 'white'
                }}>
                  {payment.isAllocated ? 'تخصیص یافته' : 'تخصیص نیافته'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <div>
                    <p style={{ fontSize: '14px', opacity: 0.8 }}>
                      تاریخ: {payment.paymentDate}
                    </p>
                    <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>
                      شناسه پرداخت: {payment.id}
                    </p>
                    {payment.invoiceId && (
                      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px', color: '#10b981' }}>
                        مرتبط با فاکتور: {payment.invoiceId}
                      </p>
                    )}
                    {payment.description && (
                      <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '5px' }}>
                        {payment.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: payment.isAllocated ? '#10b981' : '#f59e0b' }}>
                      {parseFloat(payment.amount).toLocaleString('fa-IR')} تومان
                    </p>
                    <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                      {payment.isAllocated ? 'تأیید شده' : 'در انتظار تخصیص'}
                    </p>
                  </div>
                </div>

                {/* Enhanced status information */}
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px', 
                  background: payment.isAllocated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                  borderRadius: '4px' 
                }}>
                  <p style={{ fontSize: '11px', color: payment.isAllocated ? '#10b981' : '#f59e0b' }}>
                    {payment.isAllocated 
                      ? '✅ این پرداخت به فاکتور تخصیص یافته و در محاسبات بدهی لحاظ شده است'
                      : '⚠️ این پرداخت هنوز به فاکتور تخصیص نیافته و در محاسبات بدهی لحاظ نشده است'
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary statistics */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#374151', 
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
              {payments.filter(p => p.isAllocated).reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString('fa-IR')}
            </p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>مجموع پرداخت‌های تخصیص یافته</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
              {payments.filter(p => !p.isAllocated).reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString('fa-IR')}
            </p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>مجموع پرداخت‌های تخصیص نیافته</p>
          </div>
        </div>
      </div>
    </div>
  );
}