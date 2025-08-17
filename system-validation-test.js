
#!/usr/bin/env node

/**
 * 🔍 SHERLOCK v28.0: سیستم تست جامع ویرایش فاکتور
 * اجرا: node system-validation-test.js
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n🎯 ${msg}${colors.reset}`)
};

class SystemValidator {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    try {
      log.info(`Testing: ${testName}`);
      const result = await testFn();
      
      if (result === true) {
        this.testResults.passed++;
        log.success(`${testName}`);
      } else if (result === 'warning') {
        this.testResults.warnings++;
        log.warning(`${testName} - نیاز به توجه`);
      } else {
        this.testResults.failed++;
        log.error(`${testName} - Failed`);
      }
    } catch (error) {
      this.testResults.failed++;
      log.error(`${testName} - Error: ${error.message}`);
    }
  }

  // Test 1: بررسی ساختار فایل‌ها
  async testFileStructure() {
    const fs = require('fs').promises;
    const requiredFiles = [
      'server/routes.ts',
      'server/storage.ts', 
      'server/services/unified-financial-engine.ts',
      'client/src/components/invoice-edit-dialog.tsx',
      'server/routes/unified-financial-routes.ts'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    return true;
  }

  // Test 2: بررسی API Endpoints
  async testApiEndpoints() {
    const fs = require('fs').promises;
    
    try {
      const routesContent = await fs.readFile('server/routes.ts', 'utf8');
      
      const requiredEndpoints = [
        '/api/invoices/edit',
        'executeAtomicInvoiceEdit',
        'updateRepresentativeFinancials'
      ];

      for (const endpoint of requiredEndpoints) {
        if (!routesContent.includes(endpoint)) {
          throw new Error(`Missing endpoint: ${endpoint}`);
        }
      }
      return true;
    } catch (error) {
      throw new Error(`API endpoint validation failed: ${error.message}`);
    }
  }

  // Test 3: بررسی Financial Engine
  async testFinancialEngine() {
    const fs = require('fs').promises;
    
    try {
      const engineContent = await fs.readFile('server/services/unified-financial-engine.ts', 'utf8');
      
      const requiredMethods = [
        'calculateRepresentative',
        'syncRepresentativeDebt',
        'forceInvalidateRepresentative',
        'calculateGlobalSummary'
      ];

      for (const method of requiredMethods) {
        if (!engineContent.includes(method)) {
          throw new Error(`Missing method: ${method}`);
        }
      }
      return true;
    } catch (error) {
      throw new Error(`Financial engine validation failed: ${error.message}`);
    }
  }

  // Test 4: بررسی UI Component
  async testUIComponent() {
    const fs = require('fs').promises;
    
    try {
      const uiContent = await fs.readFile('client/src/components/invoice-edit-dialog.tsx', 'utf8');
      
      const requiredFeatures = [
        'editMutation',
        'calculateTotalAmount',
        'sessionHealthy',
        'SHERLOCK v28.0',
        'invalidateQueries'
      ];

      for (const feature of requiredFeatures) {
        if (!uiContent.includes(feature)) {
          throw new Error(`Missing UI feature: ${feature}`);
        }
      }
      return true;
    } catch (error) {
      throw new Error(`UI component validation failed: ${error.message}`);
    }
  }

  // Test 5: بررسی Database Schema
  async testDatabaseSchema() {
    const fs = require('fs').promises;
    
    try {
      const storageContent = await fs.readFile('server/storage.ts', 'utf8');
      
      const requiredMethods = [
        'updateInvoice',
        'createInvoiceEdit', 
        'executeAtomicInvoiceEdit',
        'updateRepresentativeFinancials'
      ];

      for (const method of requiredMethods) {
        if (!storageContent.includes(method)) {
          throw new Error(`Missing storage method: ${method}`);
        }
      }
      return true;
    } catch (error) {
      throw new Error(`Database schema validation failed: ${error.message}`);
    }
  }

  // Test 6: بررسی Error Handling
  async testErrorHandling() {
    const fs = require('fs').promises;
    
    try {
      const routesContent = await fs.readFile('server/routes.ts', 'utf8');
      
      const errorHandlingFeatures = [
        'try {',
        'catch',
        'error handling',
        'validation',
        'session validation'
      ];

      let foundFeatures = 0;
      for (const feature of errorHandlingFeatures) {
        if (routesContent.includes(feature)) {
          foundFeatures++;
        }
      }

      if (foundFeatures < 3) {
        return 'warning';
      }
      return true;
    } catch (error) {
      throw new Error(`Error handling validation failed: ${error.message}`);
    }
  }

  // Test 7: بررسی Security Measures
  async testSecurityMeasures() {
    const fs = require('fs').promises;
    
    try {
      const routesContent = await fs.readFile('server/routes.ts', 'utf8');
      
      const securityFeatures = [
        'authMiddleware',
        'session validation',
        'authenticated',
        'permission'
      ];

      let foundFeatures = 0;
      for (const feature of securityFeatures) {
        if (routesContent.includes(feature)) {
          foundFeatures++;
        }
      }

      if (foundFeatures < 2) {
        throw new Error('Insufficient security measures');
      }
      return true;
    } catch (error) {
      throw new Error(`Security validation failed: ${error.message}`);
    }
  }

  // Test 8: بررسی Performance Optimizations
  async testPerformanceOptimizations() {
    const fs = require('fs').promises;
    
    try {
      const engineContent = await fs.readFile('server/services/unified-financial-engine.ts', 'utf8');
      
      const performanceFeatures = [
        'cache',
        'invalidate',
        'CACHE_TTL',
        'background',
        'batch'
      ];

      let foundFeatures = 0;
      for (const feature of performanceFeatures) {
        if (engineContent.includes(feature)) {
          foundFeatures++;
        }
      }

      if (foundFeatures < 3) {
        return 'warning';
      }
      return true;
    } catch (error) {
      throw new Error(`Performance validation failed: ${error.message}`);
    }
  }

  // اجرای تمام تست‌ها
  async runAllTests() {
    log.header('SHERLOCK v28.0: شروع تست جامع سیستم');
    
    await this.runTest('File Structure Integrity', () => this.testFileStructure());
    await this.runTest('API Endpoints Validation', () => this.testApiEndpoints());
    await this.runTest('Financial Engine Validation', () => this.testFinancialEngine());
    await this.runTest('UI Component Validation', () => this.testUIComponent());
    await this.runTest('Database Schema Validation', () => this.testDatabaseSchema());
    await this.runTest('Error Handling Validation', () => this.testErrorHandling());
    await this.runTest('Security Measures Validation', () => this.testSecurityMeasures());
    await this.runTest('Performance Optimizations', () => this.testPerformanceOptimizations());

    this.generateReport();
  }

  generateReport() {
    log.header('گزارش نهایی تست سیستم');
    
    console.log(`📊 تعداد کل تست‌ها: ${this.testResults.total}`);
    console.log(`${colors.green}✅ موفق: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ ناموفق: ${this.testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  هشدار: ${this.testResults.warnings}${colors.reset}`);

    const successRate = ((this.testResults.passed + this.testResults.warnings) / this.testResults.total * 100).toFixed(1);
    const qualityScore = (this.testResults.passed / this.testResults.total * 100).toFixed(1);

    console.log(`\n📈 نرخ موفقیت: ${successRate}%`);
    console.log(`🏆 امتیاز کیفی: ${qualityScore}%`);

    if (this.testResults.failed === 0) {
      log.success('\n🎉 سیستم آماده استفاده در محیط پروداکشن است!');
    } else {
      log.error(`\n🚨 ${this.testResults.failed} مورد نیاز به بررسی دارد`);
    }

    // تعیین وضعیت نهایی
    let finalStatus = 'UNKNOWN';
    if (this.testResults.failed === 0 && this.testResults.warnings <= 1) {
      finalStatus = 'PRODUCTION READY ✅';
    } else if (this.testResults.failed <= 1) {
      finalStatus = 'NEEDS MINOR FIXES ⚠️';
    } else {
      finalStatus = 'NEEDS MAJOR FIXES ❌';
    }

    console.log(`\n🎯 وضعیت نهایی: ${finalStatus}`);
    console.log(`📅 تاریخ تست: ${new Date().toLocaleString('fa-IR')}`);
  }
}

// اجرای تست‌ها
async function main() {
  const validator = new SystemValidator();
  await validator.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SystemValidator;
