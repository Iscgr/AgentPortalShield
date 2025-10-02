#!/usr/bin/env tsx
/**
 * DATABASE RECOVERY EXTRACTION TOOL
 * 
 * هدف: استخراج اتمیک و جامع تمام داده‌های نمایندگان، تراکنش‌های مالی و اطلاعات مهم
 * از سورس کد اپلیکیشن برای بازیابی دیتابیس آسیب دیده
 * 
 * خروجی: فایل JSON با ساختار کامل و طبقه‌بندی شده
 */

import * as fs from 'fs';
import * as path from 'path';

interface TransactionRecord {
  admin_username: string;
  event_timestamp: string;
  event_type: string;
  description: string;
  amount: string;
}

interface RepresentativeData {
  username: string;
  code: string;
  totalTransactions: number;
  totalAmount: number;
  transactions: TransactionRecord[];
  firstTransactionDate: string;
  lastTransactionDate: string;
  eventTypes: {
    CREATE: number;
    RENEWAL: number;
    EDIT: number;
    DELETE: number;
    OTHER: number;
  };
}

interface HardcodedFinancialValue {
  source: string;
  type: string;
  value: number | string;
  description: string;
  line?: number;
}

interface DatabaseRecoveryData {
  extractionDate: string;
  extractionTimestamp: number;
  summary: {
    totalRepresentatives: number;
    totalTransactions: number;
    totalAmountSum: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
    sources: string[];
  };
  representatives: RepresentativeData[];
  hardcodedValues: HardcodedFinancialValue[];
  databaseSchema: any;
  metadata: {
    extractionMethod: string;
    dataIntegrity: string;
    recoveryPurpose: string;
  };
}

/**
 * Parse a.json and extract representative data
 */
function extractFromAJson(): RepresentativeData[] {
  console.log('📊 Starting extraction from a.json...');
  
  const filePath = path.join(process.cwd(), 'a.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ a.json not found!');
    return [];
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(rawData);

  // Find the data array
  let transactions: TransactionRecord[] = [];
  for (const block of parsed) {
    if (block.type === 'table' && block.data && Array.isArray(block.data)) {
      transactions = block.data;
      break;
    }
  }

  console.log(`✅ Found ${transactions.length} total transactions`);

  // Group by admin_username
  const groupedByUsername = new Map<string, TransactionRecord[]>();
  
  for (const tx of transactions) {
    if (!tx.admin_username) continue;
    
    if (!groupedByUsername.has(tx.admin_username)) {
      groupedByUsername.set(tx.admin_username, []);
    }
    groupedByUsername.get(tx.admin_username)!.push(tx);
  }

  console.log(`✅ Found ${groupedByUsername.size} unique representatives`);

  // Build representative data
  const representatives: RepresentativeData[] = [];
  
  for (const [username, txs] of groupedByUsername.entries()) {
    const sortedTxs = txs.sort((a, b) => 
      new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
    );

    const totalAmount = txs.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

    const eventTypes = {
      CREATE: txs.filter(tx => tx.event_type === 'CREATE').length,
      RENEWAL: txs.filter(tx => tx.event_type === 'RENEWAL').length,
      EDIT: txs.filter(tx => tx.event_type === 'EDIT').length,
      DELETE: txs.filter(tx => tx.event_type === 'DELETE').length,
      OTHER: txs.filter(tx => !['CREATE', 'RENEWAL', 'EDIT', 'DELETE'].includes(tx.event_type)).length,
    };

    representatives.push({
      username,
      code: `REP-${username.toUpperCase()}`,
      totalTransactions: txs.length,
      totalAmount,
      transactions: sortedTxs,
      firstTransactionDate: sortedTxs[0].event_timestamp,
      lastTransactionDate: sortedTxs[sortedTxs.length - 1].event_timestamp,
      eventTypes
    });
  }

  // Sort by total amount descending
  representatives.sort((a, b) => b.totalAmount - a.totalAmount);

  return representatives;
}

/**
 * Extract hardcoded financial values from source code
 */
function extractHardcodedValues(): HardcodedFinancialValue[] {
  console.log('🔍 Searching for hardcoded financial values in source code...');
  
  const hardcodedValues: HardcodedFinancialValue[] = [];

  // Check unified-financial-routes.ts in backups
  const backupRoutesPath = path.join(
    process.cwd(), 
    'backups_20250927_224331/server/routes/unified-financial-routes.ts'
  );

  if (fs.existsSync(backupRoutesPath)) {
    const content = fs.readFileSync(backupRoutesPath, 'utf-8');
    const lines = content.split('\n');

    // Search for specific patterns
    const patterns = [
      { regex: /correctedTotalDebt\s*=\s*(\d+)/g, type: 'CORRECTED_TOTAL_DEBT' },
      { regex: /expectedAmount\s*=\s*(\d+)/g, type: 'EXPECTED_AMOUNT' },
      { regex: /previousValue:\s*"(\d+)"/g, type: 'PREVIOUS_VALUE' },
      { regex: /newValue:\s*"(\d+)"/g, type: 'NEW_VALUE' },
      { regex: /previousIncorrectValue:\s*(\d+)/g, type: 'PREVIOUS_INCORRECT_VALUE' },
      { regex: /correctedValue:\s*(\d+)/g, type: 'CORRECTED_VALUE' },
    ];

    for (const pattern of patterns) {
      let match;
      pattern.regex.lastIndex = 0; // Reset regex
      while ((match = pattern.regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        hardcodedValues.push({
          source: 'backups_20250927_224331/server/routes/unified-financial-routes.ts',
          type: pattern.type,
          value: parseInt(match[1]),
          description: `Found in line ${lineNumber}`,
          line: lineNumber
        });
      }
    }
  }

  // Check for totalRepresentatives
  const serviceEnginePath = path.join(
    process.cwd(),
    'backups_20250927_224331/server/services/unified-financial-engine.ts'
  );

  if (fs.existsSync(serviceEnginePath)) {
    const content = fs.readFileSync(serviceEnginePath, 'utf-8');
    
    // Look for representative count mentions
    const countPattern = /totalRepresentatives:\s*(\d+)/g;
    let match;
    while ((match = countPattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      hardcodedValues.push({
        source: 'backups_20250927_224331/server/services/unified-financial-engine.ts',
        type: 'TOTAL_REPRESENTATIVES_COUNT',
        value: parseInt(match[1]),
        description: `Representative count found in line ${lineNumber}`,
        line: lineNumber
      });
    }
  }

  console.log(`✅ Found ${hardcodedValues.length} hardcoded financial values`);
  
  return hardcodedValues;
}

/**
 * Extract database schema information
 */
function extractDatabaseSchema(): any {
  console.log('📋 Extracting database schema...');
  
  const schemaPath = path.join(process.cwd(), 'shared/schema.ts');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found!');
    return null;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Extract table definitions (simplified)
  const tables: any = {};
  
  const tableRegex = /export const (\w+) = pgTable\("(\w+)"/g;
  let match;
  
  while ((match = tableRegex.exec(schemaContent)) !== null) {
    const tableName = match[1];
    const dbTableName = match[2];
    tables[tableName] = {
      dbName: dbTableName,
      extractedFrom: 'shared/schema.ts'
    };
  }

  console.log(`✅ Found ${Object.keys(tables).length} table definitions`);

  return {
    tables,
    primaryTables: [
      'representatives',
      'invoices',
      'payments',
      'invoiceUsageItems',
      'salesPartners',
      'adminUsers',
      'invoiceBatches'
    ],
    schemaVersion: 'v1.0',
    extractionNote: 'Schema extracted from TypeScript definitions'
  };
}

/**
 * Main extraction process
 */
async function main() {
  console.log('🚀 DATABASE RECOVERY EXTRACTION - ATOMIC ANALYSIS STARTED');
  console.log('=' .repeat(70));
  console.log();

  const startTime = Date.now();

  // Extract all data
  const representatives = extractFromAJson();
  const hardcodedValues = extractHardcodedValues();
  const databaseSchema = extractDatabaseSchema();

  // Calculate summary
  const totalTransactions = representatives.reduce((sum, rep) => sum + rep.totalTransactions, 0);
  const totalAmountSum = representatives.reduce((sum, rep) => sum + rep.totalAmount, 0);

  let earliestDate = '';
  let latestDate = '';

  if (representatives.length > 0) {
    const allDates = representatives.flatMap(rep => [
      rep.firstTransactionDate,
      rep.lastTransactionDate
    ]).sort();
    earliestDate = allDates[0];
    latestDate = allDates[allDates.length - 1];
  }

  // Build final data structure
  const recoveryData: DatabaseRecoveryData = {
    extractionDate: new Date().toISOString(),
    extractionTimestamp: Date.now(),
    summary: {
      totalRepresentatives: representatives.length,
      totalTransactions,
      totalAmountSum,
      dateRange: {
        earliest: earliestDate,
        latest: latestDate
      },
      sources: [
        'a.json (PHPMyAdmin export)',
        'backups_20250927_224331/server/routes/unified-financial-routes.ts',
        'backups_20250927_224331/server/services/unified-financial-engine.ts',
        'shared/schema.ts'
      ]
    },
    representatives,
    hardcodedValues,
    databaseSchema,
    metadata: {
      extractionMethod: 'ATOMIC_SOURCE_CODE_ANALYSIS',
      dataIntegrity: 'COMPLETE_FROM_APPLICATION_CODE',
      recoveryPurpose: 'DATABASE_DAMAGE_RECOVERY'
    }
  };

  // Write to file
  const outputPath = path.join(process.cwd(), 'database-recovery-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(recoveryData, null, 2), 'utf-8');

  const duration = Date.now() - startTime;

  console.log();
  console.log('=' .repeat(70));
  console.log('✅ EXTRACTION COMPLETED SUCCESSFULLY');
  console.log('=' .repeat(70));
  console.log();
  console.log('📊 SUMMARY:');
  console.log(`   Representatives: ${representatives.length}`);
  console.log(`   Total Transactions: ${totalTransactions.toLocaleString()}`);
  console.log(`   Total Amount: ${totalAmountSum.toLocaleString()} تومان`);
  console.log(`   Date Range: ${earliestDate} → ${latestDate}`);
  console.log(`   Hardcoded Values: ${hardcodedValues.length}`);
  console.log(`   Database Tables: ${Object.keys(databaseSchema.tables).length}`);
  console.log();
  console.log(`💾 Output File: ${outputPath}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log();
  console.log('=' .repeat(70));

  // Print top 10 representatives by amount
  console.log();
  console.log('🏆 TOP 10 REPRESENTATIVES BY TOTAL AMOUNT:');
  console.log();
  
  for (let i = 0; i < Math.min(10, representatives.length); i++) {
    const rep = representatives[i];
    console.log(`   ${i + 1}. ${rep.username.padEnd(15)} - ${rep.totalAmount.toLocaleString().padStart(12)} تومان (${rep.totalTransactions} transactions)`);
  }

  console.log();
  console.log('✅ Data extraction completed. Review database-recovery-data.json for full details.');
}

main().catch(error => {
  console.error('❌ EXTRACTION FAILED:', error);
  process.exit(1);
});
