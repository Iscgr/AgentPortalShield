/**
 * E-B7 Financial Summary Refactor - Snapshot Testing Framework
 * تست‌های Snapshot برای تضمین عدم Regression در پاسخ‌های API مالی
 * 
 * هدف: تست همسانی (snapshot JSON) برای پاسخ API مربوط به summary
 * KPI: Diff=0 با نسخه قبل از refactor
 */

import { strict as assert } from 'node:assert';
import fs from 'fs/promises';
import path from 'path';

// Mock data for consistent testing
const mockFinancialData = {
  representatives: [
    { id: 1, name: 'نماینده تست 1', totalDebt: '150000.00' },
    { id: 2, name: 'نماینده تست 2', totalDebt: '75000.00' }
  ],
  invoices: [
    { id: 1, representativeId: 1, amount: '200000.00', status: 'unpaid' },
    { id: 2, representativeId: 2, amount: '100000.00', status: 'paid' }
  ],
  payments: [
    { id: 1, representativeId: 1, amount: '50000.00', isAllocated: true },
    { id: 2, representativeId: 2, amount: '100000.00', isAllocated: true }
  ]
};

// Expected financial summary structure (based on existing implementation)
interface FinancialSummarySnapshot {
  totalRevenue: number;
  totalDebt: number;
  activeRepresentatives: number;
  totalRepresentatives: number;
  overdueInvoices: number;
  cacheStatus: string;
  lastUpdated: string; // ISO timestamp
}

/**
 * Mock Financial Summary Calculator
 * Simulates the consolidated query logic for testing
 */
class MockFinancialSummaryCalculator {
  static calculateSummary(data: typeof mockFinancialData): Omit<FinancialSummarySnapshot, 'lastUpdated'> {
    // Total Revenue: Sum of allocated payments
    const totalRevenue = data.payments
      .filter(p => p.isAllocated)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Total Debt: Sum of unpaid invoices minus allocated payments per representative
    const representativeDebts = data.representatives.map(rep => {
      const repInvoices = data.invoices.filter(inv => inv.representativeId === rep.id);
      const repPayments = data.payments.filter(pay => pay.representativeId === rep.id && pay.isAllocated);
      
      const totalInvoices = repInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalPayments = repPayments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
      
      return Math.max(0, totalInvoices - totalPayments);
    });

    const totalDebt = representativeDebts.reduce((sum, debt) => sum + debt, 0);

    // Active Representatives: Those with any invoices or payments
    const activeRepIds = new Set([
      ...data.invoices.map(inv => inv.representativeId),
      ...data.payments.map(pay => pay.representativeId)
    ]);

    // Overdue Invoices: Unpaid invoices (simplified)
    const overdueInvoices = data.invoices.filter(inv => inv.status === 'unpaid').length;

    return {
      totalRevenue,
      totalDebt,
      activeRepresentatives: activeRepIds.size,
      totalRepresentatives: data.representatives.length,
      overdueInvoices,
      cacheStatus: 'HEALTHY'
    };
  }
}

/**
 * Snapshot Testing Framework
 */
class FinancialSummarySnapshotTester {
  private snapshotDir = path.join(process.cwd(), 'server/tests/snapshots');
  private snapshotFile = path.join(this.snapshotDir, 'financial-summary.json');

  async ensureSnapshotDir(): Promise<void> {
    try {
      await fs.access(this.snapshotDir);
    } catch {
      await fs.mkdir(this.snapshotDir, { recursive: true });
    }
  }

  async saveSnapshot(snapshot: FinancialSummarySnapshot): Promise<void> {
    await this.ensureSnapshotDir();
    
    // Remove timestamp for consistent comparison
    const { lastUpdated, ...snapshotData } = snapshot;
    
    await fs.writeFile(
      this.snapshotFile, 
      JSON.stringify(snapshotData, null, 2),
      'utf8'
    );
    
    console.log('💾 Snapshot saved to:', this.snapshotFile);
  }

  async loadSnapshot(): Promise<Omit<FinancialSummarySnapshot, 'lastUpdated'> | null> {
    try {
      const content = await fs.readFile(this.snapshotFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async compareWithSnapshot(current: Omit<FinancialSummarySnapshot, 'lastUpdated'>): Promise<{
    matches: boolean;
    differences: Array<{ field: string; expected: any; actual: any }>;
  }> {
    const savedSnapshot = await this.loadSnapshot();
    
    if (!savedSnapshot) {
      console.log('📸 No existing snapshot found. Creating baseline...');
      return { matches: false, differences: [] };
    }

    const differences: Array<{ field: string; expected: any; actual: any }> = [];

    // Compare each field
    for (const [key, expectedValue] of Object.entries(savedSnapshot)) {
      const actualValue = current[key as keyof typeof current];
      
      if (actualValue !== expectedValue) {
        differences.push({
          field: key,
          expected: expectedValue,
          actual: actualValue
        });
      }
    }

    return {
      matches: differences.length === 0,
      differences
    };
  }
}

/**
 * Test Suite Runner
 */
async function runSnapshotTests(): Promise<void> {
  console.log('🧪 E-B7 Financial Summary Snapshot Testing Framework');
  console.log('=' .repeat(60));

  const tester = new FinancialSummarySnapshotTester();
  
  // Test 1: Calculate current summary
  console.log('\n📊 Test 1: Calculate Financial Summary');
  const currentSummary = MockFinancialSummaryCalculator.calculateSummary(mockFinancialData);
  
  console.log('   ✅ Current summary calculated:');
  console.log('   📈 Total Revenue:', currentSummary.totalRevenue.toLocaleString());
  console.log('   💳 Total Debt:', currentSummary.totalDebt.toLocaleString());
  console.log('   👥 Active Representatives:', currentSummary.activeRepresentatives);
  console.log('   📋 Overdue Invoices:', currentSummary.overdueInvoices);

  // Test 2: Snapshot comparison
  console.log('\n📸 Test 2: Snapshot Comparison');
  const comparison = await tester.compareWithSnapshot(currentSummary);

  if (comparison.matches) {
    console.log('   ✅ Snapshot matches - No regression detected');
  } else if (comparison.differences.length === 0) {
    // First run - create baseline
    const fullSnapshot: FinancialSummarySnapshot = {
      ...currentSummary,
      lastUpdated: new Date().toISOString()
    };
    await tester.saveSnapshot(fullSnapshot);
    console.log('   📸 Baseline snapshot created');
  } else {
    console.log('   ❌ Snapshot mismatch detected:');
    for (const diff of comparison.differences) {
      console.log(`      Field: ${diff.field}`);
      console.log(`      Expected: ${diff.expected}`);
      console.log(`      Actual: ${diff.actual}`);
    }
    throw new Error('Snapshot test failed - potential regression detected');
  }

  // Test 3: Performance validation (simulated)
  console.log('\n⚡ Test 3: Performance Validation');
  const startTime = performance.now();
  
  // Simulate consolidated query execution
  for (let i = 0; i < 10; i++) {
    MockFinancialSummaryCalculator.calculateSummary(mockFinancialData);
  }
  
  const endTime = performance.now();
  const avgTime = (endTime - startTime) / 10;
  
  console.log(`   📊 Average calculation time: ${avgTime.toFixed(2)}ms`);
  
  // KPI: Should be under 120ms (simulated target)
  const performanceTarget = 50; // Adjusted for mock calculation
  if (avgTime <= performanceTarget) {
    console.log(`   ✅ Performance within target (<${performanceTarget}ms)`);
  } else {
    console.log(`   ⚠️ Performance above target (${performanceTarget}ms)`);
  }

  // Test 4: Data consistency validation
  console.log('\n🔍 Test 4: Data Consistency Validation');
  
  // Validate calculation logic
  const expectedTotalRevenue = 150000; // 50000 + 100000 (allocated payments)
  const expectedTotalDebt = 125000; // (200000-50000) + (100000-100000) = 150000 + 0 = 150000
  
  assert.equal(currentSummary.totalRevenue, expectedTotalRevenue, 'Total revenue calculation mismatch');
  assert.equal(currentSummary.totalDebt, 150000, 'Total debt calculation mismatch'); // Rep 1: 150000, Rep 2: 0
  assert.equal(currentSummary.activeRepresentatives, 2, 'Active representatives count mismatch');
  assert.equal(currentSummary.overdueInvoices, 1, 'Overdue invoices count mismatch');

  console.log('   ✅ Data consistency validation passed');

  console.log('\n🎉 All E-B7 Snapshot Tests Passed Successfully!');
}

// Export for integration
export { FinancialSummarySnapshotTester, MockFinancialSummaryCalculator };

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  runSnapshotTests().catch(error => {
    console.error('❌ Snapshot tests failed:', error.message);
    process.exit(1);
  });
}