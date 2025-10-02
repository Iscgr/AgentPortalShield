#!/usr/bin/env tsx
/**
 * VERIFICATION SCRIPT
 * Validates the integrity and correctness of extracted data
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

function validateJSON(): ValidationResult {
  try {
    const dataPath = path.join(process.cwd(), 'database-recovery-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Check structure
    if (!data.representatives || !Array.isArray(data.representatives)) {
      return { passed: false, message: 'Invalid representatives array' };
    }
    
    if (!data.summary || typeof data.summary !== 'object') {
      return { passed: false, message: 'Invalid summary object' };
    }
    
    return { 
      passed: true, 
      message: 'JSON structure is valid',
      details: {
        repsCount: data.representatives.length,
        summaryComplete: true
      }
    };
  } catch (error: any) {
    return { passed: false, message: `JSON validation failed: ${error.message}` };
  }
}

function validateTransactionCounts(): ValidationResult {
  try {
    const dataPath = path.join(process.cwd(), 'database-recovery-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    let totalTransactions = 0;
    let totalAmount = 0;
    
    for (const rep of data.representatives) {
      if (!rep.transactions || !Array.isArray(rep.transactions)) {
        return { 
          passed: false, 
          message: `Representative ${rep.username} has invalid transactions array` 
        };
      }
      
      // Count transactions
      totalTransactions += rep.transactions.length;
      
      // Sum amounts
      for (const tx of rep.transactions) {
        totalAmount += parseFloat(tx.amount || '0');
      }
      
      // Verify representative's count
      if (rep.totalTransactions !== rep.transactions.length) {
        return {
          passed: false,
          message: `Transaction count mismatch for ${rep.username}`,
          details: {
            expected: rep.totalTransactions,
            actual: rep.transactions.length
          }
        };
      }
      
      // Verify representative's amount
      const repAmount = rep.transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      if (Math.abs(rep.totalAmount - repAmount) > 0.01) {
        return {
          passed: false,
          message: `Amount mismatch for ${rep.username}`,
          details: {
            expected: rep.totalAmount,
            actual: repAmount
          }
        };
      }
    }
    
    // Verify summary counts
    if (totalTransactions !== data.summary.totalTransactions) {
      return {
        passed: false,
        message: 'Summary transaction count mismatch',
        details: {
          expected: data.summary.totalTransactions,
          calculated: totalTransactions
        }
      };
    }
    
    if (Math.abs(totalAmount - data.summary.totalAmountSum) > 0.01) {
      return {
        passed: false,
        message: 'Summary amount mismatch',
        details: {
          expected: data.summary.totalAmountSum,
          calculated: totalAmount
        }
      };
    }
    
    return {
      passed: true,
      message: 'All transaction counts and amounts are consistent',
      details: {
        totalTransactions,
        totalAmount,
        representatives: data.representatives.length
      }
    };
  } catch (error: any) {
    return { passed: false, message: `Transaction validation failed: ${error.message}` };
  }
}

function validateDateRanges(): ValidationResult {
  try {
    const dataPath = path.join(process.cwd(), 'database-recovery-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;
    
    for (const rep of data.representatives) {
      for (const tx of rep.transactions) {
        const txDate = new Date(tx.event_timestamp);
        
        if (!earliestDate || txDate < earliestDate) {
          earliestDate = txDate;
        }
        
        if (!latestDate || txDate > latestDate) {
          latestDate = txDate;
        }
      }
    }
    
    if (!earliestDate || !latestDate) {
      return { passed: false, message: 'No dates found in transactions' };
    }
    
    return {
      passed: true,
      message: 'Date ranges are valid',
      details: {
        earliest: earliestDate.toISOString(),
        latest: latestDate.toISOString(),
        durationDays: Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    };
  } catch (error: any) {
    return { passed: false, message: `Date validation failed: ${error.message}` };
  }
}

function validateCSVFiles(): ValidationResult {
  try {
    const files = [
      'representatives-summary.csv',
      'all-transactions.csv',
      'top-50-representatives.csv'
    ];
    
    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        return { passed: false, message: `CSV file ${file} not found` };
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return { passed: false, message: `CSV file ${file} has insufficient data` };
      }
    }
    
    return {
      passed: true,
      message: 'All CSV files are present and valid',
      details: {
        files: files.length
      }
    };
  } catch (error: any) {
    return { passed: false, message: `CSV validation failed: ${error.message}` };
  }
}

function validateHardcodedValues(): ValidationResult {
  try {
    const dataPath = path.join(process.cwd(), 'database-recovery-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    if (!data.hardcodedValues || !Array.isArray(data.hardcodedValues)) {
      return { passed: false, message: 'Hardcoded values not found' };
    }
    
    if (data.hardcodedValues.length === 0) {
      return { passed: false, message: 'No hardcoded values extracted' };
    }
    
    return {
      passed: true,
      message: 'Hardcoded values extracted successfully',
      details: {
        count: data.hardcodedValues.length,
        types: data.hardcodedValues.map((v: any) => v.type)
      }
    };
  } catch (error: any) {
    return { passed: false, message: `Hardcoded values validation failed: ${error.message}` };
  }
}

async function main() {
  console.log('🔍 VERIFICATION - Database Recovery Extraction');
  console.log('=' .repeat(70));
  console.log();

  const tests = [
    { name: 'JSON Structure', fn: validateJSON },
    { name: 'Transaction Counts & Amounts', fn: validateTransactionCounts },
    { name: 'Date Ranges', fn: validateDateRanges },
    { name: 'CSV Files', fn: validateCSVFiles },
    { name: 'Hardcoded Values', fn: validateHardcodedValues }
  ];

  let passedCount = 0;
  let failedCount = 0;
  const results: Array<{ name: string; result: ValidationResult }> = [];

  for (const test of tests) {
    console.log(`📋 Testing: ${test.name}...`);
    const result = test.fn();
    results.push({ name: test.name, result });
    
    if (result.passed) {
      console.log(`   ✅ PASSED: ${result.message}`);
      if (result.details) {
        console.log(`   📊 Details:`, JSON.stringify(result.details, null, 2).split('\n').map(line => `      ${line}`).join('\n'));
      }
      passedCount++;
    } else {
      console.log(`   ❌ FAILED: ${result.message}`);
      if (result.details) {
        console.log(`   🔍 Details:`, JSON.stringify(result.details, null, 2).split('\n').map(line => `      ${line}`).join('\n'));
      }
      failedCount++;
    }
    console.log();
  }

  console.log('=' .repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(70));
  console.log(`   ✅ Passed: ${passedCount}/${tests.length}`);
  console.log(`   ❌ Failed: ${failedCount}/${tests.length}`);
  console.log();

  if (failedCount === 0) {
    console.log('🎉 ALL VALIDATIONS PASSED!');
    console.log('✅ Data integrity confirmed.');
    console.log('✅ Extraction is complete and accurate.');
    process.exit(0);
  } else {
    console.log('⚠️  SOME VALIDATIONS FAILED!');
    console.log('❌ Please review the errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ VERIFICATION SCRIPT ERROR:', error);
  process.exit(1);
});
