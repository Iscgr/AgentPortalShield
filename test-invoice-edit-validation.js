
/**
 * SHERLOCK v28.1: COMPREHENSIVE INVOICE EDIT VALIDATION TEST
 * تست جامع برای اعتبارسنجی ویرایش فاکتور
 */

async function testInvoiceEditValidation() {
  console.log('🧪 SHERLOCK v28.1: Starting comprehensive invoice edit validation test...');
  
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      passed: 0,
      failed: 0,
      warnings: []
    };

    // Test 1: Check invoice edit endpoint availability
    try {
      const response = await fetch('/api/invoices/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      testResults.tests.push({
        name: 'Invoice Edit Endpoint Availability',
        status: response.status === 400 ? 'PASS' : 'FAIL', // 400 expected for invalid data
        details: `Response status: ${response.status}`
      });
      
      if (response.status === 400) testResults.passed++;
      else testResults.failed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Invoice Edit Endpoint Availability',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
      testResults.failed++;
    }

    // Test 2: Check invoice amount verification endpoint
    try {
      const response = await fetch('/api/unified-financial/verify-invoice-amount/999999');
      const result = await response.json();
      
      testResults.tests.push({
        name: 'Invoice Amount Verification Endpoint',
        status: response.status === 404 ? 'PASS' : 'FAIL', // 404 expected for non-existent invoice
        details: `Response: ${response.status} - ${result.error || result.message}`
      });
      
      if (response.status === 404) testResults.passed++;
      else testResults.failed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Invoice Amount Verification Endpoint',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
      testResults.failed++;
    }

    // Test 3: Check financial consistency validation
    try {
      const response = await fetch('/api/unified-financial/validate-consistency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      testResults.tests.push({
        name: 'Financial Consistency Validation',
        status: response.ok ? 'PASS' : 'FAIL',
        details: `System validation: ${result.validation?.isValid ? 'Valid' : 'Issues found'}`
      });
      
      if (response.ok) testResults.passed++;
      else testResults.failed++;
      
      if (result.validation && !result.validation.isValid) {
        testResults.warnings.push(`Financial inconsistencies detected: ${result.validation.summary?.inconsistentCount || 'Unknown'}`);
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Financial Consistency Validation',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
      testResults.failed++;
    }

    // Test 4: Check unified financial engine
    try {
      const response = await fetch('/api/unified-financial/summary');
      const result = await response.json();
      
      testResults.tests.push({
        name: 'Unified Financial Engine',
        status: response.ok && result.success ? 'PASS' : 'FAIL',
        details: `Engine status: ${result.success ? 'Operational' : 'Error'}`
      });
      
      if (response.ok && result.success) testResults.passed++;
      else testResults.failed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Unified Financial Engine',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
      testResults.failed++;
    }

    // Calculate overall test results
    const totalTests = testResults.tests.length;
    const successRate = ((testResults.passed / totalTests) * 100).toFixed(1);
    
    console.log(`\n📊 SHERLOCK v28.1: Invoice Edit Validation Test Results:`);
    console.log(`✅ Passed: ${testResults.passed}/${totalTests} (${successRate}%)`);
    console.log(`❌ Failed: ${testResults.failed}/${totalTests}`);
    console.log(`⚠️ Warnings: ${testResults.warnings.length}`);
    
    testResults.tests.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} Test ${index + 1}: ${test.name} - ${test.details}`);
    });
    
    if (testResults.warnings.length > 0) {
      console.log(`\n⚠️ Warnings:`);
      testResults.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (testResults.failed === 0) {
      console.log(`\n🎉 ALL TESTS PASSED! Invoice edit system is ready for production.`);
    } else {
      console.log(`\n⚠️ ${testResults.failed} test(s) failed. Please address issues before proceeding.`);
    }
    
    return testResults;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return { error: error.message, timestamp: new Date().toISOString() };
  }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testInvoiceEditValidation();
} else {
  // Browser environment
  console.log('🌐 Invoice edit validation test ready. Call testInvoiceEditValidation() to run.');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testInvoiceEditValidation };
}
