/**
 * SHERLOCK v32.0 DEBT VERIFICATION SYSTEM
 * 
 * بررسی انطباق ستون بدهی با محاسبات استاندارد
 */

import { Router } from 'express';
import { db } from '../db.js';
import { representatives, invoices, payments } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { unifiedFinancialEngine } from '../services/unified-financial-engine.js';

const router = Router();

// ✅ SHERLOCK v32.0: Comprehensive debt column verification
router.get('/verify-debt-column-consistency', async (req, res) => {
  try {
    console.log('🔍 SHERLOCK v32.0: Starting comprehensive debt column verification...');

    const startTime = Date.now();

    // Get all active representatives
    const allReps = await db.select({
      id: representatives.id,
      name: representatives.name,
      code: representatives.code,
      totalDebt: representatives.totalDebt,
      totalSales: representatives.totalSales
    }).from(representatives).where(eq(representatives.isActive, true));

    console.log(`📊 Found ${allReps.length} active representatives to verify`);

    const verificationResults = [];
    let consistentCount = 0;
    let inconsistentCount = 0;
    let totalDiscrepancy = 0;

    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 20;
    for (let i = 0; i < allReps.length; i += BATCH_SIZE) {
      const batch = allReps.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (rep) => {
        try {
          // Get real-time calculated debt using unified engine
          const calculatedData = await unifiedFinancialEngine.calculateRepresentative(rep.id);

          // Get stored debt from database
          const storedDebt = parseFloat(rep.totalDebt) || 0;
          const calculatedDebt = calculatedData.actualDebt || 0;

          // Calculate discrepancy
          const discrepancy = Math.abs(storedDebt - calculatedDebt);
          const isConsistent = discrepancy < 100; // 100 تومان tolerance

          const result = {
            representativeId: rep.id,
            representativeName: rep.name,
            representativeCode: rep.code,
            storedDebt,
            calculatedDebt,
            discrepancy,
            discrepancyPercentage: storedDebt > 0 ? (discrepancy / storedDebt) * 100 : 0,
            isConsistent,
            status: isConsistent ? 'CONSISTENT' : 'INCONSISTENT',
            lastCalculation: calculatedData.calculationTimestamp
          };

          if (isConsistent) {
            consistentCount++;
          } else {
            inconsistentCount++;
            totalDiscrepancy += discrepancy;
            console.log(`⚠️ Inconsistency found: ${rep.name} (${rep.code}) - Stored: ${storedDebt}, Calculated: ${calculatedDebt}, Diff: ${discrepancy}`);
          }

          return result;
        } catch (error) {
          console.error(`❌ Error verifying representative ${rep.id}:`, error);
          return {
            representativeId: rep.id,
            representativeName: rep.name,
            representativeCode: rep.code,
            error: error.message,
            status: 'ERROR'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      verificationResults.push(...batchResults);

      // Small delay between batches
      if (i + BATCH_SIZE < allReps.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;

    // Sort by discrepancy (highest first)
    const inconsistentResults = verificationResults
      .filter(r => r.status === 'INCONSISTENT')
      .sort((a, b) => (b.discrepancy || 0) - (a.discrepancy || 0));

    // ✅ SHERLOCK v32.0: Calculate total calculated debt sum
    const totalCalculatedDebt = verificationResults.reduce((sum, result) => {
      return sum + (result.calculatedDebt || 0);
    }, 0);

    const totalStoredDebt = verificationResults.reduce((sum, result) => {
      return sum + (result.storedDebt || 0);
    }, 0);

    const summary: VerificationSummary = {
      totalRepresentatives: allReps.length,
      consistentCount,
      inconsistentCount,
      errorCount: verificationResults.filter(r => r.status === 'ERROR').length,
      consistencyRate: Math.round((consistentCount / allReps.length) * 100),
      totalDiscrepancy,
      averageDiscrepancy: inconsistentCount > 0 ? totalDiscrepancy / inconsistentCount : 0,
      totalCalculatedDebt,
      totalStoredDebt,
      debtDifferenceAmount: Math.abs(totalCalculatedDebt - totalStoredDebt),
      verificationDuration: duration
    };

    console.log(`✅ SHERLOCK v32.0: Verification completed in ${duration}ms`);
    console.log(`📊 Summary: ${consistentCount}/${allReps.length} consistent (${summary.consistencyRate}%)`);
    console.log(`💰 Total discrepancy: ${totalDiscrepancy.toLocaleString()} تومان`);
    console.log(`📈 Total calculated debt: ${totalCalculatedDebt.toLocaleString()} تومان`);
    console.log(`🏦 Total stored debt: ${totalStoredDebt.toLocaleString()} تومان`);
    console.log(`⚖️ Debt difference: ${summary.debtDifferenceAmount.toLocaleString()} تومان`);


    res.json({
      success: true,
      summary,
      topInconsistencies: inconsistentResults.slice(0, 20), // Top 20 inconsistencies
      recommendations: generateRecommendations(summary, inconsistentResults),
      verificationTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SHERLOCK v32.0: Debt verification error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در بررسی انطباق ستون بدهی',
      details: error.message
    });
  }
});

// ✅ SHERLOCK v32.0: Auto-fix inconsistent debt values
router.post('/fix-debt-inconsistencies', async (req, res) => {
  try {
    console.log('🔧 SHERLOCK v32.0: Starting debt inconsistency auto-fix...');

    const { representativeIds, fixThreshold = 100 } = req.body;

    let targetReps;
    if (representativeIds && Array.isArray(representativeIds)) {
      // Fix specific representatives
      targetReps = await db.select({
        id: representatives.id,
        name: representatives.name,
        code: representatives.code
      }).from(representatives).where(sql`id = ANY(${representativeIds})`);
    } else {
      // Find all inconsistent representatives
      const verification = await fetch(`${req.protocol}://${req.get('host')}/api/debt-verification/verify-debt-column-consistency`);
      const verificationData = await verification.json();

      const inconsistentIds = verificationData.topInconsistencies
        ?.filter(r => r.discrepancy > fixThreshold)
        ?.map(r => r.representativeId) || [];

      targetReps = await db.select({
        id: representatives.id,
        name: representatives.name,
        code: representatives.code
      }).from(representatives).where(sql`id = ANY(${inconsistentIds})`);
    }

    console.log(`🎯 Fixing ${targetReps.length} representatives with debt inconsistencies`);

    let fixedCount = 0;
    let errorCount = 0;
    const fixResults = [];

    for (const rep of targetReps) {
      try {
        // Sync representative debt using unified engine
        await unifiedFinancialEngine.syncRepresentativeDebt(rep.id);
        fixedCount++;

        fixResults.push({
          representativeId: rep.id,
          representativeName: rep.name,
          representativeCode: rep.code,
          status: 'FIXED',
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Fixed debt for ${rep.name} (${rep.code})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to fix debt for ${rep.name}:`, error);

        fixResults.push({
          representativeId: rep.id,
          representativeName: rep.name,
          representativeCode: rep.code,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    console.log(`✅ SHERLOCK v32.0: Auto-fix completed - ${fixedCount} fixed, ${errorCount} errors`);

    res.json({
      success: true,
      summary: {
        totalProcessed: targetReps.length,
        fixedCount,
        errorCount,
        fixRate: Math.round((fixedCount / targetReps.length) * 100)
      },
      fixResults,
      message: `${fixedCount} نماینده اصلاح شد، ${errorCount} خطا`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debt auto-fix error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در اصلاح خودکار بدهی‌ها'
    });
  }
});

function generateRecommendations(summary: any, inconsistentResults: any[]): string[] {
  const recommendations = [];

  if (summary.consistencyRate < 95) {
    recommendations.push('🔧 نیاز به همگام‌سازی گسترده بدهی‌ها');
  }

  if (summary.totalDiscrepancy > 1000000) {
    recommendations.push('💰 اختلاف مالی قابل توجه - بررسی فوری ضروری');
  }

  if (inconsistentResults.some(r => r.discrepancyPercentage > 50)) {
    recommendations.push('⚠️ برخی نمایندگان دارای اختلاف درصد بالا هستند');
  }

  if (summary.errorCount > 0) {
    recommendations.push(`❌ ${summary.errorCount} نماینده دارای خطای محاسبه`);
  }

  recommendations.push('🔄 همگام‌سازی دوره‌ای هر 24 ساعت پیشنهاد می‌شود');

  // ✅ SHERLOCK v32.0: Auto-recommendation for significant discrepancies
  if (summary.debtDifferenceAmount && summary.debtDifferenceAmount > 10000000) {
    recommendations.push('🚨 اختلاف بالای 10 میلیون تومان - همگام‌سازی فوری ضروری است');
  }

  if (summary.inconsistentCount > summary.totalRepresentatives * 0.5) {
    recommendations.push('⚠️ بیش از 50% نمایندگان ناسازگار - بازنگری کامل سیستم مطالبات');
  }

  return recommendations;
}

export default router;