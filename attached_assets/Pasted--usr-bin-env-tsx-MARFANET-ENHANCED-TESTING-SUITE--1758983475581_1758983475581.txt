#!/usr/bin/env tsx

/**
 * MARFANET ENHANCED TESTING SUITE
 * =================================
 * 
 * تست جامع و واقع‌بینانه اپلیکیشن MarFaNet با تمرکز بر:
 * - شناسایی خطاهای کنسول
 * - بررسی مشکلات hydration
 * - تست رندر UI کامپوننت‌ها
 * - تست سناریوهای واقعی کاربر
 * - بررسی عمیق دسترسی‌پذیری
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import { config } from 'dotenv';

// برای تست‌های سرور و کلاینت
config();

// تنظیمات تست
const TEST_CONFIG = {
  baseUrl: 'http://localhost:9002',
  timeout: 15000,
  retryCount: 3,
  logLevel: 'DEBUG' as const,
  screenshotDir: path.join(process.cwd(), 'test-screenshots'),
  consoleLogFile: path.join(process.cwd(), 'console-errors.log'),
  puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']
};

// تعریف نوع نتایج تست
interface TestResult {
  module: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

// تعریف نوع خطاهای کنسول
interface ConsoleError {
  type: 'error' | 'warning';
  text: string;
  location: string;
  timestamp: string;
  page: string;
}

class EnhancedTestSuite {
  private results: TestResult[] = [];
  private startTime = Date.now();
  private consoleErrors: ConsoleError[] = [];
  private browser: puppeteer.Browser | null = null;
  private pages: Map<string, puppeteer.Page> = new Map();
  
  constructor() {
    console.log(chalk.blue('\n🔍 MARFANET ENHANCED TEST SUITE'));
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.blue(`Start Time: ${new Date().toISOString()}`));
    console.log(chalk.blue(`Base URL: ${TEST_CONFIG.baseUrl}`));
    console.log(chalk.blue(`Log Level: ${TEST_CONFIG.logLevel}`));
    console.log(chalk.blue('='.repeat(60)));
    
    // ایجاد دایرکتوری اسکرین‌شات اگر وجود ندارد
    if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
      fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
    }
  }
  
  // راه‌اندازی مرورگر headless برای تست
  async setupBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: TEST_CONFIG.puppeteerArgs
      });
      console.log(chalk.green('✅ مرورگر headless راه‌اندازی شد'));
    } catch (error) {
      console.error(chalk.red(`❌ خطا در راه‌اندازی مرورگر: ${error}`));
      throw error;
    }
  }
  
  // بستن مرورگر
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log(chalk.green('✅ مرورگر headless بسته شد'));
    }
  }
  
  // ایجاد یک صفحه جدید برای تست با مانیتورینگ خطاهای کنسول
  async createTestPage(name: string): Promise<puppeteer.Page> {
    if (!this.browser) {
      throw new Error('مرورگر راه‌اندازی نشده است');
    }
    
    const page = await this.browser.newPage();
    this.pages.set(name, page);
    
    // مانیتورینگ خطاهای کنسول
    page.on('console', async (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        try {
          const location = msg.location();
          const error: ConsoleError = {
            type: type as 'error' | 'warning',
            text: msg.text(),
            location: `${location.url}:${location.lineNumber}:${location.columnNumber}`,
            timestamp: new Date().toISOString(),
            page: name
          };
          
          this.consoleErrors.push(error);
          
          if (TEST_CONFIG.logLevel === 'DEBUG') {
            console.log(chalk.yellow(`🔔 [${name}] کنسول ${type}: ${msg.text().substring(0, 100)}...`));
          }
        } catch (e) {
          console.log(chalk.red(`❌ خطا در ثبت خطای کنسول: ${e}`));
        }
      }
    });
    
    return page;
  }
  
  // اجرای یک تست با مدیریت خطا
  private async executeTest(
    module: string,
    testName: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    const testStart = Date.now();
    console.log(chalk.blue(`\n📋 [${module}] در حال تست: ${testName}`));
    
    try {
      const result = await testFunction();
      const duration = Date.now() - testStart;
      
      this.results.push({
        module,
        test: testName,
        status: 'PASS',
        duration,
        details: result
      });
      
      console.log(chalk.green(`✅ [${module}] تست با موفقیت انجام شد: ${testName} (${duration}ms)`));
    } catch (error: any) {
      const duration = Date.now() - testStart;
      
      this.results.push({
        module,
        test: testName,
        status: 'FAIL',
        duration,
        error: error?.message || String(error),
        details: { stack: error?.stack }
      });
      
      console.log(chalk.red(`❌ [${module}] خطا در تست: ${testName} (${duration}ms)`));
      console.log(chalk.red(`   ${error?.message || String(error)}`));
      
      if (TEST_CONFIG.logLevel === 'DEBUG') {
        console.log(chalk.gray(`   Stack: ${error?.stack}`));
      }
    }
  }
  
  // === تست UI و تعامل کاربر ===
  async testUIComponents(): Promise<void> {
    await this.executeTest('UI', 'تست ناوبری اصلی', async () => {
      const page = await this.createTestPage('main-navigation');
      await page.goto(`${TEST_CONFIG.baseUrl}`, { waitUntil: 'networkidle0' });
      
      // بررسی وجود و عملکرد ساید‌بار
      const sidebarExists = await page.evaluate(() => {
        return document.querySelector('nav') !== null;
      });
      
      if (!sidebarExists) {
        throw new Error('ساید‌بار در صفحه اصلی یافت نشد');
      }
      
      // گرفتن اسکرین‌شات
      await page.screenshot({ 
        path: path.join(TEST_CONFIG.screenshotDir, 'main-navigation.png'),
        fullPage: true 
      });
      
      // تست کلیک روی هر آیتم منو و بررسی تغییر URL
      const menuItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('nav a'));
        return items.map(item => ({
          text: item.textContent?.trim(),
          href: item.getAttribute('href')
        }));
      });
      
      return { sidebarExists, menuItemsCount: menuItems.length, menuItems };
    });

    await this.executeTest('UI', 'تست صفحه پروفایل نماینده', async () => {
      const page = await this.createTestPage('agent-profile');
      await page.goto(`${TEST_CONFIG.baseUrl}/agents/1`, { waitUntil: 'networkidle0' });
      
      // بررسی عناصر UI مورد انتظار در پروفایل نماینده
      const profileElements = await page.evaluate(() => {
        const nameElement = document.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim();
        const avatar = document.querySelector('img')?.getAttribute('src');
        const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map(tab => 
          tab.textContent?.trim()
        );
        const buttons = Array.from(document.querySelectorAll('button')).map(btn => 
          btn.textContent?.trim()
        );
        
        return { nameElement, avatar, tabs, buttons };
      });
      
      // بررسی وجود آیتم‌ها و آیکون‌های ضروری
      if (!profileElements.nameElement) {
        throw new Error('نام نماینده در صفحه پروفایل یافت نشد');
      }
      
      if (profileElements.tabs.length === 0) {
        throw new Error('هیچ تبی در صفحه پروفایل نماینده یافت نشد');
      }
      
      // گرفتن اسکرین‌شات
      await page.screenshot({ 
        path: path.join(TEST_CONFIG.screenshotDir, 'agent-profile.png'),
        fullPage: true 
      });
      
      return profileElements;
    });
    
    await this.executeTest('UI', 'تست فرم پرداخت', async () => {
      const page = await this.createTestPage('payment-form');
      await page.goto(`${TEST_CONFIG.baseUrl}/payments`, { waitUntil: 'networkidle0' });
      
      // کلیک روی دکمه پرداخت جدید
      await page.evaluate(() => {
        const addButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent?.includes('جدید') || btn.textContent?.includes('افزودن')
        );
        addButton?.click();
      });
      
      // منتظر باز شدن دیالوگ
      await page.waitForSelector('dialog, [role="dialog"]', { timeout: 5000 }).catch(() => {
        throw new Error('دیالوگ فرم پرداخت باز نشد');
      });
      
      // بررسی عناصر فرم
      const formElements = await page.evaluate(() => {
        const dialog = document.querySelector('dialog, [role="dialog"]');
        const inputs = Array.from(dialog?.querySelectorAll('input') || []).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder
        }));
        const selects = Array.from(dialog?.querySelectorAll('select') || []).length;
        const buttons = Array.from(dialog?.querySelectorAll('button') || []).map(btn => 
          btn.textContent?.trim()
        );
        
        return { dialogExists: !!dialog, inputs, selects, buttons };
      });
      
      // گرفتن اسکرین‌شات
      await page.screenshot({ 
        path: path.join(TEST_CONFIG.screenshotDir, 'payment-form.png') 
      });
      
      return formElements;
    });
  }

  // === تست سناریوهای واقعی کاربر ===
  async testUserScenarios(): Promise<void> {
    await this.executeTest('UserScenario', 'سناریو کامل افزودن پرداخت', async () => {
      const page = await this.createTestPage('add-payment-scenario');
      await page.goto(`${TEST_CONFIG.baseUrl}/payments`, { waitUntil: 'networkidle0' });
      
      // قبل از شروع سناریو، تعداد پرداخت‌ها را بشمار
      const initialPaymentsCount = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
      });
      
      // 1. کلیک روی دکمه افزودن پرداخت
      await page.evaluate(() => {
        const addButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent?.includes('جدید') || btn.textContent?.includes('افزودن')
        );
        addButton?.click();
      });
      
      // منتظر باز شدن دیالوگ
      await page.waitForSelector('dialog, [role="dialog"]', { timeout: 5000 }).catch(() => {
        throw new Error('دیالوگ فرم پرداخت باز نشد');
      });
      
      // 2. پر کردن فرم پرداخت
      await page.evaluate(() => {
        // یافتن فیلدهای فرم و پر کردن آنها
        const dialog = document.querySelector('dialog, [role="dialog"]');
        const inputs = dialog?.querySelectorAll('input');
        const selects = dialog?.querySelectorAll('select');
        
        // پر کردن فیلدها با مقادیر تست
        if (inputs) {
          Array.from(inputs).forEach(input => {
            if (input.type === 'text') input.value = 'تست خودکار';
            if (input.type === 'number') input.value = '1000000';
            if (input.type === 'date') input.value = '2023-09-01';
          });
        }
        
        // انتخاب گزینه اول در select ها
        if (selects) {
          Array.from(selects).forEach(select => {
            if (select.options.length > 0) select.selectedIndex = 1;
          });
        }
      });
      
      // 3. ثبت فرم
      await page.evaluate(() => {
        const submitButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.type === 'submit' || 
                btn.textContent?.includes('ثبت') || 
                btn.textContent?.includes('ذخیره')
        );
        submitButton?.click();
      });
      
      // منتظر بسته شدن دیالوگ یا نمایش پیام موفقیت
      try {
        await page.waitForFunction(() => {
          return !document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
        }, { timeout: 5000 });
      } catch (e) {
        // اگر دیالوگ بسته نشد، احتمالاً خطایی رخ داده است
        const errorMessage = await page.evaluate(() => {
          return document.querySelector('[role="alert"]')?.textContent?.trim();
        });
        
        throw new Error(`خطا در ثبت پرداخت: ${errorMessage || 'دیالوگ بسته نشد'}`);
      }
      
      // 4. بررسی اضافه شدن پرداخت جدید
      const finalPaymentsCount = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
      });
      
      // گرفتن اسکرین‌شات نهایی
      await page.screenshot({ 
        path: path.join(TEST_CONFIG.screenshotDir, 'add-payment-result.png'),
        fullPage: true 
      });
      
      return { 
        initialCount: initialPaymentsCount, 
        finalCount: finalPaymentsCount,
        success: finalPaymentsCount > initialPaymentsCount
      };
    });
    
    await this.executeTest('UserScenario', 'سناریو مشاهده گزارش', async () => {
      const page = await this.createTestPage('view-reports-scenario');
      await page.goto(`${TEST_CONFIG.baseUrl}/reports`, { waitUntil: 'networkidle0' });
      
      // بررسی المان‌های اصلی گزارش
      const reportElements = await page.evaluate(() => {
        const charts = document.querySelectorAll('canvas, svg, [role="img"]').length;
        const tables = document.querySelectorAll('table').length;
        const filters = document.querySelectorAll('select, input[type="date"]').length;
        
        return { charts, tables, filters };
      });
      
      if (reportElements.charts === 0 && reportElements.tables === 0) {
        throw new Error('هیچ نمودار یا جدولی در صفحه گزارش‌ها یافت نشد');
      }
      
      // گرفتن اسکرین‌شات
      await page.screenshot({ 
        path: path.join(TEST_CONFIG.screenshotDir, 'reports.png'),
        fullPage: true 
      });
      
      return reportElements;
    });
  }
  
  // === تست خطاهای هایدریشن ===
  async testHydrationIssues(): Promise<void> {
    await this.executeTest('Hydration', 'بررسی خطاهای هایدریشن در صفحات اصلی', async () => {
      const pages = [
        { name: 'dashboard', url: '/' },
        { name: 'agents', url: '/agents' },
        { name: 'partners', url: '/partners' },
        { name: 'payments', url: '/payments' },
        { name: 'settings', url: '/settings' }
      ];
      
      const hydrationResults = {};
      
      for (const pageInfo of pages) {
        const page = await this.createTestPage(`hydration-${pageInfo.name}`);
        
        // جمع‌آوری همه خطاهای کنسول
        const hydrationErrors: string[] = [];
        
        page.on('console', msg => {
          const text = msg.text();
          if (text.includes('Hydration failed') || text.includes('hydration')) {
            hydrationErrors.push(text);
          }
        });
        
        await page.goto(`${TEST_CONFIG.baseUrl}${pageInfo.url}`, { 
          waitUntil: 'networkidle0'
        });
        
        // منتظر ماندن برای تکمیل hydration
        await page.waitForTimeout(2000);
        
        // ذخیره نتایج
        hydrationResults[pageInfo.name] = {
          url: pageInfo.url,
          hasHydrationErrors: hydrationErrors.length > 0,
          errorCount: hydrationErrors.length,
          errors: hydrationErrors
        };
        
        // گرفتن اسکرین‌شات
        await page.screenshot({ 
          path: path.join(TEST_CONFIG.screenshotDir, `hydration-${pageInfo.name}.png`),
          fullPage: true 
        });
      }
      
      return hydrationResults;
    });
  }
  
  // === تست خطاهای کنسول ===
  async testConsoleErrors(): Promise<void> {
    await this.executeTest('Console', 'بررسی خطاهای کنسول در تمام صفحات', async () => {
      const pages = [
        { name: 'dashboard', url: '/' },
        { name: 'agents', url: '/agents' },
        { name: 'partners', url: '/partners' },
        { name: 'payments', url: '/payments' },
        { name: 'invoices', url: '/invoices' },
        { name: 'settings', url: '/settings' }
      ];
      
      const consoleResults = {};
      
      for (const pageInfo of pages) {
        const page = await this.createTestPage(`console-${pageInfo.name}`);
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // مانیتورینگ خطاهای کنسول
        page.on('console', msg => {
          const type = msg.type();
          if (type === 'error') {
            errors.push(msg.text());
          } else if (type === 'warning') {
            warnings.push(msg.text());
          }
        });
        
        await page.goto(`${TEST_CONFIG.baseUrl}${pageInfo.url}`, { 
          waitUntil: 'networkidle0'
        });
        
        // منتظر ماندن برای لود کامل صفحه و اجرای اسکریپت‌ها
        await page.waitForTimeout(3000);
        
        // بررسی خطاهای مربوط به API‌های منسوخ
        const deprecatedApiErrors = errors.filter(err => 
          err.includes('has been renamed') || 
          err.includes('deprecated') || 
          err.includes('is deprecated')
        );
        
        // بررسی خطاهای دسترسی‌پذیری
        const accessibilityErrors = errors.filter(err => 
          err.includes('requires a `DialogTitle`') || 
          err.includes('accessibility') ||
          err.includes('ARIA')
        );
        
        // ذخیره نتایج
        consoleResults[pageInfo.name] = {
          url: pageInfo.url,
          errorCount: errors.length,
          warningCount: warnings.length,
          deprecatedApiErrors: {
            count: deprecatedApiErrors.length,
            items: deprecatedApiErrors
          },
          accessibilityErrors: {
            count: accessibilityErrors.length,
            items: accessibilityErrors
          }
        };
      }
      
      return consoleResults;
    });
  }
  
  // === تست API Endpoints ===
  async testApiEndpoints(): Promise<void> {
    const endpoints = [
      '/api/agents',
      '/api/invoices',
      '/api/payments',
      '/api/sales-partners',
      '/api/agent-summaries',
      '/api/internal/metrics'
    ];
    
    for (const endpoint of endpoints) {
      await this.executeTest('API', `تست ${endpoint}`, async () => {
        try {
          const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
            headers: {
              'Accept': 'application/json'
            }
          });
          
          let data;
          let contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          return {
            status: response.status,
            ok: response.ok,
            contentType,
            hasData: !!data,
            dataType: typeof data,
            isArray: Array.isArray(data),
            responseSize: JSON.stringify(data).length
          };
        } catch (error) {
          throw new Error(`خطا در فراخوانی ${endpoint}: ${error}`);
        }
      });
    }
  }
  
  // === اجرای همه تست‌ها ===
  async runAllTests(): Promise<void> {
    try {
      console.log(chalk.blue('🚀 شروع اجرای تست‌های جامع...'));
      
      await this.setupBrowser();
      
      console.log(chalk.blue('\n--- تست رندر و اجزای UI ---'));
      await this.testUIComponents();
      
      console.log(chalk.blue('\n--- تست سناریوهای واقعی کاربر ---'));
      await this.testUserScenarios();
      
      console.log(chalk.blue('\n--- تست خطاهای هایدریشن ---'));
      await this.testHydrationIssues();
      
      console.log(chalk.blue('\n--- تست خطاهای کنسول ---'));
      await this.testConsoleErrors();
      
      console.log(chalk.blue('\n--- تست API Endpoints ---'));
      await this.testApiEndpoints();
      
      // در انتها گزارش تولید می‌کنیم
      this.generateReport();
    } catch (error) {
      console.error(chalk.red(`❌ خطا در اجرای تست‌ها: ${error}`));
    } finally {
      await this.closeBrowser();
    }
  }
  
  // === تولید گزارش ===
  private generateReport(): void {
    console.log(chalk.blue('\n📊 گزارش تست‌های جامع'));
    console.log(chalk.blue('='.repeat(60)));
    
    const totalDuration = Date.now() - this.startTime;
    
    // آماده‌سازی داده‌های گزارش
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.status === 'PASS').length,
      failedTests: this.results.filter(r => r.status === 'FAIL').length,
      skippedTests: this.results.filter(r => r.status === 'SKIP').length,
      
      // گروه‌بندی براساس ماژول
      moduleResults: {} as Record<string, { total: number, passed: number, failed: number }>,
      
      // آمار خطاها
      errors: this.results
        .filter(r => r.status === 'FAIL')
        .map(r => ({
          module: r.module,
          test: r.test,
          message: r.error || 'خطای نامشخص',
          details: r.details
        })),
      
      // خطاهای کنسول
      consoleErrors: this.consoleErrors,
      consoleErrorCount: this.consoleErrors.length,
      
      // آمار دیگر
      failedPageRoutes: 0,
      failedApiEndpoints: 0,
      uiIssues: 0,
      consoleWarnings: this.consoleErrors.filter(e => e.type === 'warning').length,
    };
    
    // محاسبه آمار براساس ماژول
    for (const result of this.results) {
      if (!report.moduleResults[result.module]) {
        report.moduleResults[result.module] = { total: 0, passed: 0, failed: 0 };
      }
      
      report.moduleResults[result.module].total++;
      if (result.status === 'PASS') {
        report.moduleResults[result.module].passed++;
      } else if (result.status === 'FAIL') {
        report.moduleResults[result.module].failed++;
        
        // افزایش شمارنده‌های خاص
        if (result.module === 'API') report.failedApiEndpoints++;
        if (result.module === 'UI') report.uiIssues++;
        if (result.module === 'UserScenario') report.uiIssues++;
      }
    }
    
    // نمایش خلاصه آمار
    console.log(chalk.blue(`📝 تعداد کل تست‌ها: ${report.totalTests}`));
    console.log(chalk.green(`✅ تست‌های موفق: ${report.passedTests}`));
    console.log(chalk.red(`❌ تست‌های ناموفق: ${report.failedTests}`));
    console.log(chalk.yellow(`⚠️ تست‌های رد شده: ${report.skippedTests}`));
    console.log(chalk.blue(`⏱️ زمان کل اجرا: ${(totalDuration / 1000).toFixed(2)} ثانیه`));
    
    // نمایش نتایج هر ماژول
    console.log(chalk.blue('\n📌 نتایج به تفکیک ماژول:'));
    for (const [module, stats] of Object.entries(report.moduleResults)) {
      const passRate = Math.round((stats.passed / stats.total) * 100);
      const color = passRate > 90 ? 'green' : (passRate > 70 ? 'yellow' : 'red');
      
      console.log(chalk[color](
        `   ${module}: ${stats.passed}/${stats.total} (${passRate}%) موفق`
      ));
    }
    
    // نمایش خلاصه خطاهای کنسول
    console.log(chalk.blue('\n🔍 خطاهای کنسول:'));
    console.log(chalk.red(`   ❌ تعداد خطاها: ${this.consoleErrors.filter(e => e.type === 'error').length}`));
    console.log(chalk.yellow(`   ⚠️ تعداد هشدارها: ${this.consoleErrors.filter(e => e.type === 'warning').length}`));
    
    // دسته‌بندی خطاها
    const deprecatedApiErrors = this.consoleErrors.filter(e => 
      e.text.includes('has been renamed') || 
      e.text.includes('deprecated')
    ).length;
    
    const accessibilityErrors = this.consoleErrors.filter(e => 
      e.text.includes('requires a `DialogTitle`') || 
      e.text.includes('accessibility')
    ).length;
    
    const hydrationErrors = this.consoleErrors.filter(e => 
      e.text.includes('Hydration failed')
    ).length;
    
    console.log(chalk.yellow(`   📉 خطاهای API منسوخ: ${deprecatedApiErrors}`));
    console.log(chalk.yellow(`   ♿ خطاهای دسترسی‌پذیری: ${accessibilityErrors}`));
    console.log(chalk.yellow(`   🔄 خطاهای هایدریشن: ${hydrationErrors}`));
    
    // بررسی خطاهای بحرانی
    if (report.errors.length > 3) {
      console.log(chalk.red(`\n⚠️ تعداد قابل توجهی خطا (${report.errors.length} مورد) شناسایی شد!`));
      console.log(chalk.yellow(`👉 دسته‌بندی خطاها:`));
      
      // گروه‌بندی خطاها براساس نوع
      const errorCategories = {
        ui: [], 
        api: [],
        console: [],
        accessibility: [],
        hydration: [],
        other: []
      };
      
      report.errors.forEach(error => {
        if (error.message.includes("Hydration failed")) {
          errorCategories.hydration.push(error);
        } else if (error.message.includes("useFormState has been renamed")) {
          errorCategories.console.push(error);
        } else if (error.message.includes("requires a `DialogTitle`")) {
          errorCategories.accessibility.push(error);
        } else if (error.module === 'UI') {
          errorCategories.ui.push(error);
        } else if (error.module === 'API') {
          errorCategories.api.push(error);
        } else {
          errorCategories.other.push(error);
        }
      });
      
      // نمایش خلاصه خطاها به تفکیک دسته
      if (errorCategories.hydration.length > 0) {
        console.log(chalk.red(`🔄 خطاهای Hydration: ${errorCategories.hydration.length} مورد`));
        console.log(chalk.gray(`   این خطاها نشان می‌دهند که HTML تولید شده در سرور با HTML کلاینت مطابقت ندارد.`));
        console.log(chalk.gray(`   احتمالاً به دلیل استفاده از Math.random() یا Date() در کامپوننت‌ها.`));
        
        // نمایش 2 خطای نمونه
        errorCategories.hydration.slice(0, 2).forEach((error, idx) => {
          console.log(chalk.yellow(`   ${idx+1}. ${error.message.substring(0, 100)}...`));
        });
      }

      if (errorCategories.console.length > 0) {
        console.log(chalk.red(`⚠️ خطاهای کنسول: ${errorCategories.console.length} مورد`));
        console.log(chalk.gray(`   خطاهای کنسول که نشان‌دهنده استفاده از API‌های منسوخ یا ناسازگاری است.`));
        
        errorCategories.console.slice(0, 3).forEach((error, idx) => {
          console.log(chalk.yellow(`   ${idx+1}. ${error.message.substring(0, 100)}...`));
        });
      }

      if (errorCategories.accessibility.length > 0) {
        console.log(chalk.red(`♿ خطاهای دسترسی‌پذیری: ${errorCategories.accessibility.length} مورد`));
        console.log(chalk.gray(`   این خطاها نشان می‌دهند که کامپوننت‌ها مطابق با استانداردهای دسترسی‌پذیری نیستند.`));
        
        errorCategories.accessibility.slice(0, 2).forEach((error, idx) => {
          console.log(chalk.yellow(`   ${idx+1}. ${error.message.substring(0, 100)}...`));
        });
      }

      if (errorCategories.ui.length > 0) {
        console.log(chalk.red(`🖼️ خطاهای رابط کاربری: ${errorCategories.ui.length} مورد`));
        console.log(chalk.gray(`   مشکلاتی در رندر کامپوننت‌های UI یا عدم وجود المان‌های مورد انتظار.`));
        
        errorCategories.ui.slice(0, 2).forEach((error, idx) => {
          console.log(chalk.yellow(`   ${idx+1}. ${error.message.substring(0, 100)}...`));
        });
      }

      console.log(chalk.red(`\n⚠️ توصیه: باید این خطاها پیش از استقرار در محیط تولید برطرف شوند.`));
      
      // ذخیره لاگ خطاها در فایل جداگانه برای بررسی دقیق‌تر
      fs.writeFileSync(
        path.join(process.cwd(), 'test-errors-detailed.log'),
        JSON.stringify(report.errors, null, 2)
      );
      
      console.log(chalk.blue(`📋 لاگ کامل خطاها در فایل 'test-errors-detailed.log' ذخیره شد.`));
    } else if (report.errors.length > 0) {
      console.log(chalk.yellow(`⚠️ ${report.errors.length} خطا شناسایی شد:`));
      report.errors.forEach((error, idx) => {
        console.log(chalk.yellow(`   ${idx+1}. ${error.message.substring(0, 100)}...`));
      });
    } else {
      console.log(chalk.green(`✅ هیچ خطایی شناسایی نشد!`));
    }

    // نمایش خلاصه نهایی
    console.log(chalk.blue(`\n📊 خلاصه تست:`));
    console.log(chalk.blue(`   📝 تعداد کل تست‌ها: ${report.totalTests}`));
    console.log(chalk.green(`   ✅ تست‌های موفق: ${report.passedTests}`));
    console.log(chalk.red(`   ❌ تست‌های ناموفق: ${report.failedTests}`));
    console.log(chalk.yellow(`   ⚠️ تست‌های رد شده: ${report.skippedTests}`));
    console.log(chalk.blue(`   ⏱️ زمان کل اجرا: ${(totalDuration / 1000).toFixed(2)} ثانیه`));
    console.log(chalk.red(`   🚨 خطاهای کنسول: ${report.consoleErrorCount} مورد`));

    // نمایش پیشنهادات براساس نتایج تست
    if (report.failedTests > 0 || report.consoleErrorCount > 0) {
      console.log(chalk.yellow(`\n🔧 توصیه‌های بهبود:`));
      if (deprecatedApiErrors > 0) {
        console.log(chalk.yellow(`   1. به‌روزرسانی API‌های منسوخ (${deprecatedApiErrors} مورد)`));
        console.log(chalk.gray(`      مثال: استفاده از useActionState به جای useFormState`));
      }
      if (accessibilityErrors > 0) {
        console.log(chalk.yellow(`   2. رفع مشکلات دسترسی‌پذیری (${accessibilityErrors} مورد)`));
        console.log(chalk.gray(`      مثال: اضافه کردن DialogTitle به Sheet و Dialog`));
      }
      if (hydrationErrors > 0) {
        console.log(chalk.yellow(`   3. رفع خطاهای هایدریشن (${hydrationErrors} مورد)`));
        console.log(chalk.gray(`      دلیل: استفاده از Math.random() یا Date() مستقیماً در کامپوننت‌ها`));
      }
      if (report.uiIssues > 0) {
        console.log(chalk.yellow(`   4. تکمیل المان‌های UI ناقص (${report.uiIssues} مورد)`));
        console.log(chalk.gray(`      مثال: تکمیل صفحه پروفایل نماینده با آیکون‌ها و تب‌های کاربردی`));
      }
    }

    // وضعیت کلی اپلیکیشن
    const overallPercentage = Math.round((report.passedTests / report.totalTests) * 100);
    const statusColor = overallPercentage > 90 ? 'green' : (overallPercentage > 70 ? 'yellow' : 'red');

    // امتیاز نهایی با در نظر گرفتن خطاهای کنسول
    let finalScore = overallPercentage;
    if (report.consoleErrorCount > 20) finalScore -= 20;
    else if (report.consoleErrorCount > 10) finalScore -= 10;
    else if (report.consoleErrorCount > 5) finalScore -= 5;

    console.log(chalk[statusColor](`\n🚦 وضعیت کلی اپلیکیشن: ${finalScore}% آماده`));
    
    if (finalScore < 70) {
      console.log(chalk.red(`⛔ نیاز به بهبود جدی: اپلیکیشن نیاز به اصلاحات اساسی دارد.`));
    } else if (finalScore < 90) {
      console.log(chalk.yellow(`⚠️ نیاز به بهبود: اپلیکیشن نیاز به برخی اصلاحات قبل از استقرار دارد.`));
    } else {
      console.log(chalk.green(`✅ وضعیت خوب: اپلیکیشن آماده استقرار است.`));
    }

    // ذخیره گزارش کامل
    const fullReport = {
      summary: {
        timestamp: report.timestamp,
        duration: report.duration,
        totalTests: report.totalTests,
        passedTests: report.passedTests,
        failedTests: report.failedTests,
        skippedTests: report.skippedTests,
        consoleErrors: report.consoleErrorCount,
        overallScore: finalScore
      },
      moduleResults: report.moduleResults,
      errors: report.errors,
      consoleErrors: this.consoleErrors,
      testResults: this.results
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'comprehensive-test-report.json'),
      JSON.stringify(fullReport, null, 2)
    );

    // پایان گزارش
    console.log(chalk.blue(`\n${'='.repeat(60)}`));
    console.log(chalk.blue(`🏁 پایان تست‌های جامع | ${new Date().toLocaleString()}`));
    console.log(chalk.blue(`${'='.repeat(60)}\n`));
  }
}

// اجرای تست‌های جامع
if (require.main === module) {
  const testSuite = new EnhancedTestSuite();
  testSuite.runAllTests()
    .then(() => {
      console.log(chalk.green('\n✅ اجرای تست‌های جامع به پایان رسید.'));
    })
    .catch((error) => {
      console.error(chalk.red(`\n❌ خطا در اجرای تست‌های جامع: ${error}`));
      process.exit(1);
    });
}

export { EnhancedTestSuite };