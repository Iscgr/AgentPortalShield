
/**
 * REAL-TIME ACCOUNTING VALIDATOR
 * اعتبارسنجی لحظه‌ای محاسبات مالی مطابق اصول حسابداری
 */

import { db } from '../db.js';
import { representatives, invoices, payments } from '../../shared/schema.js';
import { eq, sql, and } from 'drizzle-orm';

export interface AccountingValidationResult {
  isValid: boolean;
  representativeId: number;
  calculatedDebt: number;
  storedDebt: number;
  difference: number;
  validationDetails: {
    totalSales: number;
    totalAllocatedPayments: number;
    totalUnallocatedPayments: number;
    invoiceStatusBreakdown: Record<string, number>;
    paymentAllocationRate: number;
  };
  recommendations: string[];
  errors: string[];
}

export class RealTimeAccountingValidator {
  
  /**
   * اعتبارسنجی کامل محاسبات یک نماینده
   */
  static async validateRepresentativeAccounting(representativeId: number): Promise<AccountingValidationResult> {
    console.log(`🔍 Starting accounting validation for representative ${representativeId}`);
    
    try {
      // دریافت اطلاعات نماینده
      const [representative] = await db.select().from(representatives)
        .where(eq(representatives.id, representativeId));
      
      if (!representative) {
        return {
          isValid: false,
          representativeId,
          calculatedDebt: 0,
          storedDebt: 0,
          difference: 0,
          validationDetails: {
            totalSales: 0,
            totalAllocatedPayments: 0,
            totalUnallocatedPayments: 0,
            invoiceStatusBreakdown: {},
            paymentAllocationRate: 0
          },
          recommendations: [],
          errors: ['Representative not found']
        };
      }
      
      // محاسبه مجموع فروش (مطابق اصول حسابداری)
      const [salesData] = await db.select({
        totalSales: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`,
        invoiceCount: sql<number>`COUNT(*)`
      }).from(invoices).where(eq(invoices.representativeId, representativeId));
      
      // محاسبه پرداخت‌های تخصیص یافته
      const [allocatedPaymentsData] = await db.select({
        totalAllocated: sql<number>`COALESCE(SUM(CAST(allocated_amount as DECIMAL)), 0)`,
        paymentCount: sql<number>`COUNT(*)`
      }).from(payments)
        .where(
          and(
            eq(payments.representativeId, representativeId),
            eq(payments.isAllocated, true)
          )
        );
      
      // محاسبه پرداخت‌های تخصیص نیافته
      const [unallocatedPaymentsData] = await db.select({
        totalUnallocated: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
      }).from(payments)
        .where(
          and(
            eq(payments.representativeId, representativeId),
            eq(payments.isAllocated, false)
          )
        );
      
      // تحلیل وضعیت فاکتورها
      const invoiceStatusBreakdown = await db.select({
        status: invoices.status,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
      }).from(invoices)
        .where(eq(invoices.representativeId, representativeId))
        .groupBy(invoices.status);
      
      // محاسبات مطابق اصول حسابداری
      const totalSales = salesData.totalSales;
      const totalAllocatedPayments = allocatedPaymentsData.totalAllocated;
      const totalUnallocatedPayments = unallocatedPaymentsData.totalUnallocated;
      
      // بدهی خالص = کل فروش - پرداخت‌های تخصیص یافته
      const calculatedDebt = Math.max(0, totalSales - totalAllocatedPayments);
      const storedDebt = parseFloat(representative.totalDebt || '0');
      const difference = Math.abs(calculatedDebt - storedDebt);
      
      // نرخ تخصیص پرداخت
      const totalPayments = totalAllocatedPayments + totalUnallocatedPayments;
      const paymentAllocationRate = totalPayments > 0 ? (totalAllocatedPayments / totalPayments) * 100 : 0;
      
      // تولید پیشنهادات
      const recommendations = this.generateRecommendations({
        difference,
        paymentAllocationRate,
        totalUnallocatedPayments,
        invoiceStatusBreakdown: invoiceStatusBreakdown.reduce((acc: Record<string, number>, item: any) => {
          acc[item.status] = item.totalAmount;
          return acc;
        }, {} as Record<string, number>)
      });
      
      // تعیین وضعیت اعتبار
      const isValid = difference < 100; // حداکثر 100 تومان اختلاف قابل قبول
      
      console.log(`📊 Validation completed: ${isValid ? 'VALID' : 'INVALID'}, Difference: ${difference}`);
      
      return {
        isValid,
        representativeId,
        calculatedDebt,
        storedDebt,
        difference,
        validationDetails: {
          totalSales,
          totalAllocatedPayments,
          totalUnallocatedPayments,
          invoiceStatusBreakdown: invoiceStatusBreakdown.reduce((acc: Record<string, number>, item: any) => {
            acc[item.status] = item.totalAmount;
            return acc;
          }, {} as Record<string, number>),
          paymentAllocationRate: Math.round(paymentAllocationRate * 100) / 100
        },
        recommendations,
        errors: []
      };
      
    } catch (error) {
      console.error('Error in accounting validation:', error);
      return {
        isValid: false,
        representativeId,
        calculatedDebt: 0,
        storedDebt: 0,
        difference: 0,
        validationDetails: {
          totalSales: 0,
          totalAllocatedPayments: 0,
          totalUnallocatedPayments: 0,
          invoiceStatusBreakdown: {},
          paymentAllocationRate: 0
        },
        recommendations: [],
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }
  
  /**
   * اعتبارسنجی کامل سیستم
   */
  static async validateSystemAccounting(): Promise<{
    overallValid: boolean;
    totalRepresentatives: number;
    validRepresentatives: number;
    invalidRepresentatives: number;
    systemTotalDifference: number;
    criticalIssues: string[];
    systemRecommendations: string[];
  }> {
    
    console.log('🔍 Starting system-wide accounting validation...');
    
    const allRepresentatives = await db.select({
      id: representatives.id
    }).from(representatives);
    
    let validCount = 0;
    let invalidCount = 0;
    let totalDifference = 0;
    const criticalIssues: string[] = [];
    
    // اعتبارسنجی هر نماینده
    for (const rep of allRepresentatives) {
      const validation = await this.validateRepresentativeAccounting(rep.id);
      
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        totalDifference += validation.difference;
        
        if (validation.difference > 1000000) { // اختلاف بیش از 1 میلیون تومان
          criticalIssues.push(`Representative ${rep.id}: Major difference of ${validation.difference.toLocaleString()} Toman`);
        }
      }
    }
    
    // پیشنهادات سیستمی
    const systemRecommendations = [];
    if (invalidCount > 0) {
      systemRecommendations.push(`${invalidCount} نماینده نیاز به بروزرسانی محاسبات دارند`);
    }
    if (totalDifference > 5000000) {
      systemRecommendations.push('اختلاف کل سیستم قابل توجه است - نیاز به همگام‌سازی فوری');
    }
    if (criticalIssues.length > 0) {
      systemRecommendations.push('مسائل حیاتی شناسایی شده - بررسی فوری ضروری');
    }
    
    return {
      overallValid: invalidCount === 0,
      totalRepresentatives: allRepresentatives.length,
      validRepresentatives: validCount,
      invalidRepresentatives: invalidCount,
      systemTotalDifference: totalDifference,
      criticalIssues,
      systemRecommendations
    };
  }
  
  /**
   * تولید پیشنهادات بر اساس نتایج اعتبارسنجی
   */
  private static generateRecommendations(data: {
    difference: number;
    paymentAllocationRate: number;
    totalUnallocatedPayments: number;
    invoiceStatusBreakdown: Record<string, number>;
  }): string[] {
    
    const recommendations: string[] = [];
    
    // بررسی اختلاف محاسبات
    if (data.difference > 1000) {
      recommendations.push('🚨 اختلاف قابل توجه در محاسبات - نیاز به همگام‌سازی فوری');
    }
    
    // بررسی نرخ تخصیص پرداخت
    if (data.paymentAllocationRate < 80) {
      recommendations.push('⚠️ نرخ تخصیص پرداخت پایین - بررسی پرداخت‌های تخصیص نیافته');
    }
    
    // بررسی پرداخت‌های تخصیص نیافته
    if (data.totalUnallocatedPayments > 1000000) {
      recommendations.push('💰 مبلغ قابل توجهی پرداخت تخصیص نیافته موجود است');
    }
    
    // بررسی فاکتورهای معوق
    if (data.invoiceStatusBreakdown['overdue'] > 0) {
      recommendations.push('📅 فاکتورهای معوق موجود - نیاز به پیگیری');
    }
    
    // بررسی فاکتورهای پرداخت نشده
    if (data.invoiceStatusBreakdown['unpaid'] > data.invoiceStatusBreakdown['paid']) {
      recommendations.push('📋 تعداد فاکتورهای پرداخت نشده بیشتر از پرداخت شده');
    }
    
    return recommendations;
  }
}

export const realTimeAccountingValidator = new RealTimeAccountingValidator();
