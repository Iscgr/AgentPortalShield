
import { Pool } from '@neondatabase/serverless';

async function calculateDirectDebtFromRepresentativesTable() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('🔍 SHERLOCK v28.0: محاسبه مستقیم مجموع بدهی از جدول نمایندگان...');
    
    // محاسبه مستقیم از ستون total_debt در جدول representatives
    const query = `
      SELECT 
        COUNT(*) as total_representatives,
        COUNT(CASE WHEN CAST(total_debt as DECIMAL) > 0 THEN 1 END) as representatives_with_debt,
        SUM(CAST(total_debt as DECIMAL)) as total_debt_sum,
        ROUND(AVG(CAST(total_debt as DECIMAL)), 2) as average_debt,
        MAX(CAST(total_debt as DECIMAL)) as max_debt,
        MIN(CASE WHEN CAST(total_debt as DECIMAL) > 0 THEN CAST(total_debt as DECIMAL) END) as min_positive_debt
      FROM representatives 
      WHERE is_active = true
    `;

    const result = await pool.query(query);
    const data = result.rows[0];

    console.log('📊 نتایج محاسبه مستقیم از جدول نمایندگان:');
    console.log('====================================================');
    console.log(`👥 تعداد کل نمایندگان فعال: ${data.total_representatives}`);
    console.log(`💸 نمایندگان با بدهی: ${data.representatives_with_debt}`);
    console.log(`💰 مجموع کل بدهی: ${Math.round(data.total_debt_sum).toLocaleString()} تومان`);
    console.log(`📊 میانگین بدهی: ${data.average_debt?.toLocaleString()} تومان`);
    console.log(`🔴 بیشترین بدهی: ${data.max_debt?.toLocaleString()} تومان`);
    console.log(`🟡 کمترین بدهی مثبت: ${data.min_positive_debt?.toLocaleString()} تومان`);
    console.log('====================================================');

    // مقایسه با مقدار فعلی نمایش داده شده در داشبورد
    const currentDisplayValue = 186111690;
    const difference = Math.abs(data.total_debt_sum - currentDisplayValue);
    
    console.log('\n🔍 مقایسه با مقدار فعلی داشبورد:');
    console.log(`🎯 مقدار فعلی داشبورد: ${currentDisplayValue.toLocaleString()} تومان`);
    console.log(`💾 مقدار محاسبه شده از جدول: ${Math.round(data.total_debt_sum).toLocaleString()} تومان`);
    console.log(`📏 اختلاف: ${difference.toLocaleString()} تومان`);
    console.log(`✅ تطابق: ${difference < 1000 ? 'بله' : 'خیر'}`);

    // بررسی 10 نماینده با بیشترین بدهی
    const topDebtorsQuery = `
      SELECT 
        id, name, code, 
        CAST(total_debt as DECIMAL) as debt,
        CAST(total_sales as DECIMAL) as sales,
        created_at
      FROM representatives 
      WHERE is_active = true AND CAST(total_debt as DECIMAL) > 0
      ORDER BY CAST(total_debt as DECIMAL) DESC
      LIMIT 10
    `;

    const topDebtors = await pool.query(topDebtorsQuery);
    
    console.log('\n📋 10 نماینده با بیشترین بدهی:');
    console.log('====================================================');
    topDebtors.rows.forEach((rep, index) => {
      console.log(`${index + 1}. ${rep.name} (${rep.code}) - بدهی: ${rep.debt?.toLocaleString()} تومان`);
    });

    await pool.end();
    
    return {
      totalDebt: Math.round(data.total_debt_sum),
      totalRepresentatives: data.total_representatives,
      representativesWithDebt: data.representatives_with_debt,
      currentDisplayValue,
      difference,
      isMatching: difference < 1000,
      topDebtors: topDebtors.rows
    };

  } catch (error) {
    console.error('❌ خطا در محاسبه مستقیم:', error);
    await pool.end();
    throw error;
  }
}

// اجرای محاسبه
calculateDirectDebtFromRepresentativesTable()
  .then(result => {
    console.log('\n✅ محاسبه مستقیم کامل شد');
    console.log(`🎯 مقدار نهایی: ${result.totalDebt.toLocaleString()} تومان`);
  })
  .catch(error => {
    console.error('❌ خطا:', error.message);
  });
