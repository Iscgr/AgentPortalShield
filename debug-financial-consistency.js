
/**
 * SHERLOCK v28.0 - بررسی انطباق مالی فروشگاه prsmb
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

async function debugFinancialConsistency() {
  console.log('🔍 SHERLOCK v28.0: بررسی انطباق مالی فروشگاه prsmb...');

  try {
    // خواندن کوکی‌های احراز هویت
    let cookies = '';
    try {
      cookies = fs.readFileSync('admin_cookies.txt', 'utf8').trim();
    } catch (error) {
      console.log('⚠️ Warning: Could not read admin_cookies.txt');
    }

    // ۱. یافتن فروشگاه prsmb
    console.log('📋 Step 1: جستجوی فروشگاه prsmb...');
    const repsResponse = await fetch('http://localhost:5000/api/representatives', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    if (!repsResponse.ok) {
      throw new Error(`HTTP ${repsResponse.status}: ${repsResponse.statusText}`);
    }

    const repsData = await repsResponse.json();
    const representatives = repsData.data || [];
    
    const prsmb = representatives.find(rep => 
      rep.code?.toLowerCase().includes('prsmb') || 
      rep.name?.toLowerCase().includes('prsmb')
    );

    if (!prsmb) {
      console.log('❌ فروشگاه prsmb یافت نشد!');
      return;
    }

    console.log(`✅ فروشگاه prsmb یافت شد: ID=${prsmb.id}, نام=${prsmb.name}, کد=${prsmb.code}`);
    console.log(`💰 بدهی فعلی ثبت شده: ${parseFloat(prsmb.totalDebt || 0).toLocaleString()} تومان`);

    // ۲. بررسی فاکتورها
    console.log('\n📄 Step 2: بررسی فاکتورهای prsmb...');
    const invoicesResponse = await fetch(`http://localhost:5000/api/invoices?representativeId=${prsmb.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    if (invoicesResponse.ok) {
      const invoicesData = await invoicesResponse.json();
      const invoices = invoicesData.data || [];
      
      console.log(`📊 تعداد فاکتورها: ${invoices.length}`);
      
      let totalInvoiceAmount = 0;
      invoices.forEach((invoice, index) => {
        const amount = parseFloat(invoice.amount || 0);
        totalInvoiceAmount += amount;
        console.log(`   فاکتور ${index + 1}: ${amount.toLocaleString()} تومان - وضعیت: ${invoice.status}`);
      });
      
      console.log(`💡 مجموع فاکتورها: ${totalInvoiceAmount.toLocaleString()} تومان`);
    } else {
      console.log('❌ خطا در دریافت فاکتورها');
    }

    // ۳. بررسی پرداخت‌ها  
    console.log('\n💳 Step 3: بررسی پرداخت‌های prsmb...');
    const paymentsResponse = await fetch(`http://localhost:5000/api/payments?representativeId=${prsmb.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      const payments = paymentsData.data || [];
      
      console.log(`📊 تعداد پرداخت‌ها: ${payments.length}`);
      
      let totalAllocatedPayments = 0;
      let totalUnallocatedPayments = 0;
      
      payments.forEach((payment, index) => {
        const amount = parseFloat(payment.amount || 0);
        if (payment.is_allocated) {
          totalAllocatedPayments += amount;
        } else {
          totalUnallocatedPayments += amount;
        }
        console.log(`   پرداخت ${index + 1}: ${amount.toLocaleString()} تومان - تخصیص: ${payment.is_allocated ? 'بله' : 'خیر'} - تاریخ: ${payment.payment_date}`);
      });
      
      console.log(`💚 مجموع پرداخت‌های تخصیص‌یافته: ${totalAllocatedPayments.toLocaleString()} تومان`);
      console.log(`🟡 مجموع پرداخت‌های بدون تخصیص: ${totalUnallocatedPayments.toLocaleString()} تومان`);
    } else {
      console.log('❌ خطا در دریافت پرداخت‌ها');
    }

    // ۴. محاسبه real-time از طریق Unified Financial Engine
    console.log('\n🧮 Step 4: محاسبه real-time از طریق Unified Financial Engine...');
    const unifiedResponse = await fetch(`http://localhost:5000/api/unified-financial/representative/${prsmb.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    if (unifiedResponse.ok) {
      const unifiedData = await unifiedResponse.json();
      const financial = unifiedData.data;
      
      console.log(`🎯 Unified Engine Results:`);
      console.log(`   فروش کل: ${financial.totalSales?.toLocaleString()} تومان`);
      console.log(`   پرداخت کل: ${financial.totalPaid?.toLocaleString()} تومان`);
      console.log(`   بدهی محاسبه شده: ${financial.actualDebt?.toLocaleString()} تومان`);
      console.log(`   نسبت پرداخت: ${financial.paymentRatio}%`);
      console.log(`   سطح بدهی: ${financial.debtLevel}`);
    } else {
      console.log('❌ خطا در دریافت داده‌های Unified Engine');
    }

    // ۵. همگام‌سازی اجباری
    console.log('\n🔄 Step 5: همگام‌سازی اجباری فروشگاه prsmb...');
    const syncResponse = await fetch(`http://localhost:5000/api/unified-financial/sync-representative/${prsmb.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ همگام‌سازی موفق!');
      console.log(`   بدهی جدید: ${syncData.message}`);
    } else {
      console.log('❌ خطا در همگام‌سازی');
    }

    // ۶. اعتبارسنجی نهایی انطباق مالی
    console.log('\n🔍 Step 6: اعتبارسنجی انطباق مالی...');
    const validationResponse = await fetch('http://localhost:5000/api/unified-financial/validate-consistency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ focusRepresentativeId: prsmb.id })
    });

    if (validationResponse.ok) {
      const validationData = await validationResponse.json();
      console.log('📊 نتایج اعتبارسنجی انطباق مالی:');
      console.log(`   وضعیت: ${validationData.validation.isValid ? '✅ صحیح' : '❌ نیاز به تصحیح'}`);
      console.log(`   تعداد ناسازگاری‌ها: ${validationData.validation.summary.inconsistentCount}`);
      console.log(`   تعداد اصلاحیه‌ها: ${validationData.validation.corrections.length}`);
      
      if (validationData.validation.corrections.length > 0) {
        validationData.validation.corrections.forEach((correction, index) => {
          console.log(`   اصلاحیه ${index + 1}: ${correction.oldValue.toLocaleString()} → ${correction.newValue.toLocaleString()} تومان (${correction.reason})`);
        });
      }
    } else {
      console.log('❌ خطا در اعتبارسنجی انطباق مالی');
    }

  } catch (error) {
    console.error('❌ خطای کلی:', error.message);
  }
}

// اجرای تست
debugFinancialConsistency()
  .then(() => {
    console.log('\n✅ بررسی انطباق مالی کامل شد.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ خطای نهایی:', error);
    process.exit(1);
  });
