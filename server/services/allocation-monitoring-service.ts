
/**
 * SHERLOCK v35.0: Allocation Monitoring Service
 * 🎯 سرویس مانیتورینگ و نظارت بر تخصیص پرداخت‌ها
 */

import { db } from '../db.js';
import { payments, invoices, representatives } from '../../shared/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import { performance } from 'perf_hooks';

export interface AllocationMetrics {
  totalPayments: number;
  allocatedPayments: number;
  unallocatedPayments: number;
  allocationRate: number;
  averageAllocationTime: number;
  totalAllocatedAmount: number;
  totalUnallocatedAmount: number;
  lastAllocationDate: string | null;
}

export interface AllocationTrend {
  date: string;
  allocatedCount: number;
  allocatedAmount: number;
  efficiency: number;
}

export interface AllocationAlert {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  title: string;
  description: string;
  representativeId?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  actionRequired: boolean;
}

export class AllocationMonitoringService {
  
  /**
   * 📊 محاسبه متریک‌های کلی تخصیص
   */
  static async calculateGlobalMetrics(): Promise<AllocationMetrics> {
    console.log('📊 SHERLOCK v35.0: Calculating global allocation metrics');
    
    const startTime = performance.now();
    
    try {
      const [metricsResult] = await db.select({
        totalPayments: sql<number>`COUNT(*)`,
        allocatedPayments: sql<number>`COUNT(*) FILTER (WHERE is_allocated = true)`,
        unallocatedPayments: sql<number>`COUNT(*) FILTER (WHERE is_allocated = false)`,
        totalAllocatedAmount: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = true THEN CAST(amount as DECIMAL) ELSE 0 END), 0)`,
        totalUnallocatedAmount: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = false THEN CAST(amount as DECIMAL) ELSE 0 END), 0)`,
        lastAllocationDate: sql<string>`MAX(CASE WHEN is_allocated = true THEN updated_at END)`
      }).from(payments);
      
      const allocationRate = metricsResult.totalPayments > 0 
        ? (metricsResult.allocatedPayments / metricsResult.totalPayments) * 100 
        : 0;
      
      const processingTime = performance.now() - startTime;
      
      console.log(`✅ Global metrics calculated in ${Math.round(processingTime)}ms`);
      
      return {
        totalPayments: metricsResult.totalPayments,
        allocatedPayments: metricsResult.allocatedPayments,
        unallocatedPayments: metricsResult.unallocatedPayments,
        allocationRate: Math.round(allocationRate * 100) / 100,
        averageAllocationTime: processingTime,
        totalAllocatedAmount: metricsResult.totalAllocatedAmount,
        totalUnallocatedAmount: metricsResult.totalUnallocatedAmount,
        lastAllocationDate: metricsResult.lastAllocationDate
      };
    } catch (error) {
      console.error('❌ Error calculating global metrics:', error);
      throw error;
    }
  }
  
  /**
   * 📈 تحلیل روند تخصیص
   */
  static async analyzeTrends(days: number = 30): Promise<AllocationTrend[]> {
    console.log(`📈 SHERLOCK v35.0: Analyzing allocation trends for last ${days} days`);
    
    try {
      const trends = await db.select({
        date: sql<string>`DATE(created_at)`,
        allocatedCount: sql<number>`COUNT(*) FILTER (WHERE is_allocated = true)`,
        allocatedAmount: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = true THEN CAST(amount as DECIMAL) ELSE 0 END), 0)`,
        totalCount: sql<number>`COUNT(*)`
      })
      .from(payments)
      .where(sql`created_at >= NOW() - INTERVAL '${days} days'`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at) DESC`);
      
      return trends.map(trend => ({
        date: trend.date,
        allocatedCount: trend.allocatedCount,
        allocatedAmount: trend.allocatedAmount,
        efficiency: trend.totalCount > 0 ? (trend.allocatedCount / trend.totalCount) * 100 : 0
      }));
    } catch (error) {
      console.error('❌ Error analyzing trends:', error);
      throw error;
    }
  }
  
  /**
   * 🚨 تولید هشدارهای تخصیص
   */
  static async generateAlerts(): Promise<AllocationAlert[]> {
    console.log('🚨 SHERLOCK v35.0: Generating allocation alerts');
    
    const alerts: AllocationAlert[] = [];
    
    try {
      // Alert 1: High amount of unallocated payments
      const [unallocatedSummary] = await db.select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
      })
      .from(payments)
      .where(eq(payments.isAllocated, false));
      
      if (unallocatedSummary.count > 10) {
        alerts.push({
          id: `UNALLOC_${Date.now()}`,
          type: 'WARNING',
          title: 'تعداد بالای پرداخت‌های تخصیص نیافته',
          description: `${unallocatedSummary.count} پرداخت به مبلغ ${unallocatedSummary.totalAmount} تومان تخصیص نیافته`,
          priority: unallocatedSummary.count > 50 ? 'HIGH' : 'MEDIUM',
          createdAt: new Date().toISOString(),
          actionRequired: true
        });
      }
      
      // Alert 2: Representatives with high unallocated amounts
      const problematicReps = await db.select({
        representativeId: payments.representativeId,
        representativeName: representatives.name,
        unallocatedAmount: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`,
        unallocatedCount: sql<number>`COUNT(*)`
      })
      .from(payments)
      .innerJoin(representatives, eq(payments.representativeId, representatives.id))
      .where(eq(payments.isAllocated, false))
      .groupBy(payments.representativeId, representatives.name)
      .having(sql`COUNT(*) > 5`)
      .orderBy(sql`SUM(CAST(amount as DECIMAL)) DESC`)
      .limit(5);
      
      for (const rep of problematicReps) {
        alerts.push({
          id: `REP_UNALLOC_${rep.representativeId}_${Date.now()}`,
          type: 'WARNING',
          title: `نماینده با پرداخت‌های تخصیص نیافته زیاد`,
          description: `${rep.representativeName}: ${rep.unallocatedCount} پرداخت به مبلغ ${rep.unallocatedAmount} تومان`,
          representativeId: rep.representativeId!,
          priority: rep.unallocatedAmount > 5000000 ? 'HIGH' : 'MEDIUM',
          createdAt: new Date().toISOString(),
          actionRequired: true
        });
      }
      
      // Alert 3: No recent allocations
      const [recentAllocations] = await db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(payments)
      .where(
        and(
          eq(payments.isAllocated, true),
          sql`updated_at >= NOW() - INTERVAL '24 hours'`
        )
      );
      
      if (recentAllocations.count === 0) {
        alerts.push({
          id: `NO_RECENT_${Date.now()}`,
          type: 'ERROR',
          title: 'عدم تخصیص در 24 ساعت گذشته',
          description: 'هیچ تخصیص پرداختی در 24 ساعت گذشته انجام نشده است',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          actionRequired: true
        });
      }
      
      console.log(`✅ Generated ${alerts.length} allocation alerts`);
      return alerts;
      
    } catch (error) {
      console.error('❌ Error generating alerts:', error);
      return [];
    }
  }
  
  /**
   * 📋 تولید گزارش جامع مانیتورینگ
   */
  static async generateMonitoringReport(): Promise<{
    metrics: AllocationMetrics;
    trends: AllocationTrend[];
    alerts: AllocationAlert[];
    recommendations: string[];
    systemHealth: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  }> {
    console.log('📋 SHERLOCK v35.0: Generating comprehensive monitoring report');
    
    const startTime = performance.now();
    
    try {
      const [metrics, trends, alerts] = await Promise.all([
        this.calculateGlobalMetrics(),
        this.analyzeTrends(7),
        this.generateAlerts()
      ]);
      
      const recommendations: string[] = [];
      
      // Generate recommendations based on metrics
      if (metrics.allocationRate < 80) {
        recommendations.push('نرخ تخصیص پایین است - استفاده از تخصیص خودکار توصیه می‌شود');
      }
      
      if (metrics.unallocatedPayments > 20) {
        recommendations.push('تعداد بالای پرداخت‌های تخصیص نیافته - اجرای تخصیص دسته‌ای');
      }
      
      if (trends.length > 0 && trends[0].efficiency < 50) {
        recommendations.push('کاهش بازدهی تخصیص - بررسی فرایندهای تخصیص');
      }
      
      // Determine system health
      let systemHealth: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
      
      const criticalAlerts = alerts.filter(a => a.priority === 'CRITICAL').length;
      const highAlerts = alerts.filter(a => a.priority === 'HIGH').length;
      
      if (criticalAlerts > 0) {
        systemHealth = 'CRITICAL';
      } else if (highAlerts > 2 || metrics.allocationRate < 60) {
        systemHealth = 'WARNING';
      } else if (highAlerts > 0 || metrics.allocationRate < 80) {
        systemHealth = 'GOOD';
      }
      
      const processingTime = performance.now() - startTime;
      console.log(`✅ Monitoring report generated in ${Math.round(processingTime)}ms`);
      
      return {
        metrics,
        trends,
        alerts,
        recommendations,
        systemHealth
      };
    } catch (error) {
      console.error('❌ Error generating monitoring report:', error);
      throw error;
    }
  }
}

export const allocationMonitoringService = new AllocationMonitoringService();

