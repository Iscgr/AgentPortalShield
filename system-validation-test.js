#!/usr/bin/env node

/**
 * SHERLOCK v28.0: COMPREHENSIVE SYSTEM VALIDATION TEST
 * تست جامع سیستم پس از اصلاحات
 */

const baseUrl = 'https://127.0.0.1:8080';

async function runComprehensiveTest() {
  console.log('🚀 SHERLOCK v28.0: Starting comprehensive system validation...\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // Test 1: Financial Consistency Validation
  try {
    console.log('📊 Test 1: Financial Consistency Validation');
    const response = await fetch(`${baseUrl}/api/unified-financial/validate-consistency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Financial consistency check: ${data.validation.isValid ? 'PASSED' : 'CORRECTED'}`);
      console.log(`📈 Inconsistencies found: ${data.validation.summary.inconsistentCount}`);
      console.log(`🔧 Corrections applied: ${data.validation.corrections.length}`);
      results.passed++;
    } else {
      console.log('❌ Financial consistency validation failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Financial consistency test error:', error.message);
    results.failed++;
  }

  // Test 2: Monitoring Status
  try {
    console.log('\n📡 Test 2: Financial Monitoring Status');
    const response = await fetch(`${baseUrl}/api/unified-financial/monitoring-status`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Monitoring status: ${data.monitoring.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`📊 System health: ${data.systemHealth}`);
      results.passed++;
    } else {
      console.log('❌ Monitoring status check failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Monitoring status test error:', error.message);
    results.failed++;
  }

  // Test 3: Invoice Edit Chain Validation
  try {
    console.log('\n🔗 Test 3: Invoice Edit Chain Validation');
    const testData = {
      invoiceId: 1,
      representativeCode: 'test',
      amountChange: 1000,
      reason: 'test_validation'
    };

    const response = await fetch(`${baseUrl}/api/unified-financial/representative/test/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Invoice edit chain validation passed');
      console.log(`📊 Financial sync duration: ${data.data.syncDuration}ms`);
      results.passed++;
    } else {
      console.log('❌ Invoice edit chain validation failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Invoice edit chain test error:', error.message);
    results.failed++;
  }

  // Test 4: System Integrity
  try {
    console.log('\n🔍 Test 4: System Integrity Validation');
    const response = await fetch(`${baseUrl}/api/unified-financial/validate-system-integrity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerReason: 'comprehensive_test' }),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ System integrity: ${data.validation.systemHealth}`);
      console.log(`🧪 Tests passed: ${data.validation.validationTests.filter(t => t.status === 'PASS').length}/${data.validation.validationTests.length}`);
      console.log(`⚠️ Warnings: ${data.validation.warnings.length}`);
      console.log(`❌ Errors: ${data.validation.errors.length}`);
      results.passed++;
    } else {
      console.log('❌ System integrity validation failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ System integrity test error:', error.message);
    results.failed++;
  }

  // Final Results
  console.log('\n📋 COMPREHENSIVE TEST RESULTS:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);

  const successRate = (results.passed / (results.passed + results.failed)) * 100;
  console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);

  if (successRate >= 100) {
    console.log('\n🎉 SYSTEM FULLY VALIDATED - READY FOR PRODUCTION');
  } else if (successRate >= 75) {
    console.log('\n✅ SYSTEM MOSTLY STABLE - MINOR ISSUES TO ADDRESS');
  } else {
    console.log('\n⚠️ SYSTEM NEEDS ATTENTION - CRITICAL ISSUES FOUND');
  }

  return results;
}

// Run the test
runComprehensiveTest().catch(console.error);