/**
 * 💗 MARFANET COMPREHENSIVE HEALTH CHECK SYSTEM
 * 
 * سیستم جامع بررسی سلامت برای Ubuntu Server 22/24
 * 
 * ویژگی‌های کلیدی:
 * ✅ Database Health Monitoring (PostgreSQL + Redis)
 * ✅ System Resources Monitoring (CPU, Memory, Disk)  
 * ✅ External Services Health Check (APIs, Telegram, AI)
 * ✅ Application Performance Metrics
 * ✅ Ubuntu Server Specific Optimizations
 * ✅ Real-time Health Dashboard API
 * ✅ Automated Alerts & Notifications
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { checkDatabaseHealth, getDatabaseStatus } from './database-manager';
import errorManager, { ErrorSeverity, ErrorCategory } from './unified-error-manager';

import os from 'os';

const execAsync = promisify(exec);

// 🏷️ Health Status Types
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded', 
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical'
}

interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  persianMessage?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  responseTime?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    connections: number;
  };
}

interface HealthReport {
  overall: HealthStatus;
  timestamp: Date;
  uptime: number;
  services: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    system: HealthCheckResult;
    externalServices: HealthCheckResult;
  };
  metrics: SystemMetrics;
  alerts: string[];
}

class ComprehensiveHealthChecker {
  private healthHistory: HealthReport[] = [];
  private maxHistorySize = 100;
  private alertThresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
    responseTime: 5000
  };

  constructor() {
    this.startPeriodicHealthCheck();
  }

  /**
   * 🔍 اصلی ترین متد: چک سلامت کامل سیستم
   */
  async performComprehensiveHealthCheck(): Promise<HealthReport> {
    console.log('💗 Starting comprehensive health check...');
    
    const startTime = Date.now();
    
    try {
      // Parallel health checks for better performance
      const [
        databaseHealth,
        redisHealth, 
        systemHealth,
        externalServicesHealth,
        systemMetrics
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkSystemHealth(),
        this.checkExternalServices(),
        this.getSystemMetrics()
      ]);

      const report: HealthReport = {
        overall: this.calculateOverallHealth([
          databaseHealth,
          redisHealth,
          systemHealth,
          externalServicesHealth
        ]),
        timestamp: new Date(),
        uptime: process.uptime(),
        services: {
          database: databaseHealth,
          redis: redisHealth,
          system: systemHealth,
          externalServices: externalServicesHealth
        },
        metrics: systemMetrics,
        alerts: this.generateAlerts(systemMetrics, [
          databaseHealth,
          redisHealth,
          systemHealth,
          externalServicesHealth
        ])
      };

      // Add to history
      this.addToHistory(report);
      
      // Log any issues
      if (report.overall !== HealthStatus.HEALTHY) {
        await errorManager.logError(
          `System health degraded: ${report.overall}`,
          this.getErrorSeverity(report.overall),
          ErrorCategory.SYSTEM,
          undefined,
          { report: report },
          `وضعیت سلامت سیستم: ${this.getPeranStatusName(report.overall)}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(`💗 Health check completed in ${duration}ms`);
      
      return report;
      
    } catch (error) {
      await errorManager.logSystemError('Health check failed', error as Error);
      throw error;
    }
  }

  /**
   * 🗄️ بررسی سلامت پایگاه داده
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await checkDatabaseHealth();
      const dbStatus = getDatabaseStatus();
      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        return {
          status: HealthStatus.HEALTHY,
          message: 'Database connection is healthy',
          persianMessage: 'اتصال پایگاه داده سالم است',
          responseTime,
          timestamp: new Date(),
          metadata: {
            environment: dbStatus.environment,
            uptime: dbStatus.uptime,
            connectionAttempts: dbStatus.connectionAttempts
          }
        };
      } else {
        return {
          status: HealthStatus.CRITICAL,
          message: 'Database connection failed',
          persianMessage: 'اتصال پایگاه داده ناموفق',
          responseTime,
          timestamp: new Date(),
          metadata: dbStatus
        };
      }
    } catch (error) {
      return {
        status: HealthStatus.CRITICAL,
        message: `Database health check error: ${(error as Error).message}`,
        persianMessage: 'خطا در بررسی سلامت پایگاه داده',
        timestamp: new Date()
      };
    }
  }

  /**
   * 🔄 بررسی سلامت Redis
   */
  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test Redis connection using Docker
      const { stdout } = await execAsync('docker exec marfanet-redis redis-cli ping');
      const responseTime = Date.now() - startTime;
      
      if (stdout.trim().toUpperCase() === 'PONG') {
        return {
          status: HealthStatus.HEALTHY,
          message: 'Redis connection is healthy',
          persianMessage: 'اتصال Redis سالم است',
          responseTime,
          timestamp: new Date()
        };
      } else {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Redis ping failed',
          persianMessage: 'Redis پاسخ نمی‌دهد',
          responseTime,
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        status: HealthStatus.CRITICAL,
        message: `Redis health check error: ${(error as Error).message}`,
        persianMessage: 'خطا در بررسی سلامت Redis',
        timestamp: new Date()
      };
    }
  }

  /**
   * 🖥️ بررسی سلامت سیستم Ubuntu Server
   */
  private async checkSystemHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = await this.getSystemMetrics();
      const issues = [];
      
      if (metrics.cpu.usage > this.alertThresholds.cpu) {
        issues.push(`High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`);
      }
      
      if (metrics.memory.percentage > this.alertThresholds.memory) {
        issues.push(`High memory usage: ${metrics.memory.percentage.toFixed(1)}%`);
      }
      
      if (metrics.disk.percentage > this.alertThresholds.disk) {
        issues.push(`High disk usage: ${metrics.disk.percentage.toFixed(1)}%`);
      }

      const status = issues.length === 0 ? HealthStatus.HEALTHY :
                    issues.length <= 1 ? HealthStatus.DEGRADED :
                    HealthStatus.UNHEALTHY;

      return {
        status,
        message: issues.length === 0 ? 'System resources are healthy' : 
                `System issues detected: ${issues.join(', ')}`,
        persianMessage: issues.length === 0 ? 'منابع سیستم سالم هستند' :
                       `مسائل سیستمی شناسایی شد: ${issues.length} مورد`,
        timestamp: new Date(),
        metadata: metrics
      };
    } catch (error) {
      return {
        status: HealthStatus.CRITICAL,
        message: `System health check error: ${(error as Error).message}`,
        persianMessage: 'خطا در بررسی سلامت سیستم',
        timestamp: new Date()
      };
    }
  }

  /**
   * 🌐 بررسی سلامت سرویس‌های خارجی
   */
  private async checkExternalServices(): Promise<HealthCheckResult> {
    const services = [
      { name: 'Telegram API', url: 'https://api.telegram.org' },
      { name: 'OpenAI API', url: 'https://api.openai.com' },
      { name: 'Google API', url: 'https://www.googleapis.com' }
    ];

    const results = await Promise.allSettled(
      services.map(service => this.testServiceConnectivity(service.name, service.url))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const total = results.length;
    const successRate = (successful / total) * 100;

    let status: HealthStatus;
    if (successRate >= 80) status = HealthStatus.HEALTHY;
    else if (successRate >= 50) status = HealthStatus.DEGRADED;
    else status = HealthStatus.UNHEALTHY;

    return {
      status,
      message: `External services: ${successful}/${total} healthy (${successRate.toFixed(0)}%)`,
      persianMessage: `سرویس‌های خارجی: ${successful}/${total} سالم (${successRate.toFixed(0)}%)`,
      timestamp: new Date(),
      metadata: {
        successRate,
        services: results.map((result, index) => ({
          name: services[index].name,
          status: result.status,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      }
    };
  }

  private async testServiceConnectivity(name: string, url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      return response.ok || response.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * 📊 دریافت معیارهای سیستم Ubuntu Server
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // CPU usage
      const { stdout: cpuInfo } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'");
      const cpuUsage = parseFloat(cpuInfo.trim()) || 0;

      // Memory info
      const { stdout: memInfo } = await execAsync('free -m');
      const memLines = memInfo.split('\n')[1].split(/\s+/);
      const totalMem = parseInt(memLines[1]) || 0;
      const usedMem = parseInt(memLines[2]) || 0;
      const freeMem = parseInt(memLines[3]) || 0;

      // Disk usage
      const { stdout: diskInfo } = await execAsync("df -h / | awk 'NR==2 {print $2, $3, $4, $5}'");
      const diskParts = diskInfo.trim().split(/\s+/);
      const totalDisk = this.parseSize(diskParts[0]);
      const usedDisk = this.parseSize(diskParts[1]);
      const freeDisk = this.parseSize(diskParts[2]);

      // Network connections
      const { stdout: netInfo } = await execAsync('netstat -an 2>/dev/null | wc -l');
      const connections = parseInt(netInfo.trim()) || 0;

      return {
        cpu: {
          usage: cpuUsage,
          loadAverage: os.loadavg()
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: (usedMem / totalMem) * 100
        },
        disk: {
          total: totalDisk,
          used: usedDisk,
          free: freeDisk,
          percentage: (usedDisk / totalDisk) * 100
        },
        network: {
          connections
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = { K: 1, M: 1024, G: 1024 * 1024, T: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^([\d.]+)([KMGT]?)$/i);
    if (!match) return 0;
    
    const [, size, unit] = match;
    return parseFloat(size) * (units[unit.toUpperCase()] || 1);
  }

  /**
   * 🚨 تولید هشدارها
   */
  private generateAlerts(metrics: SystemMetrics, healthResults: HealthCheckResult[]): string[] {
    const alerts: string[] = [];
    
    // System resource alerts
    if (metrics.cpu.usage > this.alertThresholds.cpu) {
      alerts.push(`⚠️ High CPU usage: ${metrics.cpu.usage.toFixed(1)}% (مصرف بالای CPU)`);
    }
    
    if (metrics.memory.percentage > this.alertThresholds.memory) {
      alerts.push(`⚠️ High memory usage: ${metrics.memory.percentage.toFixed(1)}% (مصرف بالای حافظه)`);
    }
    
    if (metrics.disk.percentage > this.alertThresholds.disk) {
      alerts.push(`⚠️ High disk usage: ${metrics.disk.percentage.toFixed(1)}% (مصرف بالای دیسک)`);
    }

    // Service alerts
    healthResults.forEach(result => {
      if (result.status === HealthStatus.CRITICAL || result.status === HealthStatus.UNHEALTHY) {
        alerts.push(`🚨 ${result.persianMessage || result.message}`);
      }
    });

    return alerts;
  }

  /**
   * 🎯 Helper Methods
   */
  private calculateOverallHealth(results: HealthCheckResult[]): HealthStatus {
    const criticalCount = results.filter(r => r.status === HealthStatus.CRITICAL).length;
    const unhealthyCount = results.filter(r => r.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = results.filter(r => r.status === HealthStatus.DEGRADED).length;
    
    if (criticalCount > 0) return HealthStatus.CRITICAL;
    if (unhealthyCount > 1) return HealthStatus.UNHEALTHY;
    if (unhealthyCount > 0 || degradedCount > 1) return HealthStatus.DEGRADED;
    return HealthStatus.HEALTHY;
  }

  private getErrorSeverity(status: HealthStatus): ErrorSeverity {
    switch (status) {
      case HealthStatus.CRITICAL: return ErrorSeverity.CRITICAL;
      case HealthStatus.UNHEALTHY: return ErrorSeverity.HIGH;
      case HealthStatus.DEGRADED: return ErrorSeverity.MEDIUM;
      default: return ErrorSeverity.LOW;
    }
  }

  private getPeranStatusName(status: HealthStatus): string {
    const names = {
      [HealthStatus.HEALTHY]: 'سالم',
      [HealthStatus.DEGRADED]: 'کاهش یافته',
      [HealthStatus.UNHEALTHY]: 'ناسالم',
      [HealthStatus.CRITICAL]: 'بحرانی'
    };
    return names[status];
  }

  private addToHistory(report: HealthReport): void {
    this.healthHistory.push(report);
    
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  private startPeriodicHealthCheck(): void {
    // Run health check every 30 seconds for Ubuntu Server monitoring
    setInterval(async () => {
      try {
        await this.performComprehensiveHealthCheck();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, 30000);

    console.log('💗 Periodic health monitoring started (every 30s)');
  }

  /**
   * 📋 Public API Methods
   */
  async getHealthStatus(): Promise<HealthReport> {
    return this.performComprehensiveHealthCheck();
  }

  getHealthHistory(count: number = 10): HealthReport[] {
    return this.healthHistory.slice(-count);
  }

  async generateHealthDashboard(): Promise<string> {
    const report = await this.getHealthStatus();
    
    return `
💗 MarFaNet Health Dashboard - Ubuntu Server
Generated: ${report.timestamp.toLocaleString('fa-IR')}

🎯 Overall Status: ${this.getPeranStatusName(report.overall)} (${report.overall})
⏱️ System Uptime: ${Math.round(report.uptime)} seconds

🗄️ Database: ${this.getPeranStatusName(report.services.database.status)}
🔄 Redis: ${this.getPeranStatusName(report.services.redis.status)}
🖥️ System: ${this.getPeranStatusName(report.services.system.status)}
🌐 External Services: ${this.getPeranStatusName(report.services.externalServices.status)}

📊 System Resources:
  • CPU: ${report.metrics.cpu.usage.toFixed(1)}%
  • Memory: ${report.metrics.memory.percentage.toFixed(1)}% (${Math.round(report.metrics.memory.used)}MB/${Math.round(report.metrics.memory.total)}MB)
  • Disk: ${report.metrics.disk.percentage.toFixed(1)}% 
  • Network Connections: ${report.metrics.network.connections}

🚨 Active Alerts: ${report.alerts.length}
${report.alerts.map(alert => `  ${alert}`).join('\n')}
    `;
  }
}

// 🌟 Singleton Instance for Ubuntu Server
const healthChecker = new ComprehensiveHealthChecker();

export default healthChecker;
export { ComprehensiveHealthChecker, type HealthReport, type SystemMetrics };