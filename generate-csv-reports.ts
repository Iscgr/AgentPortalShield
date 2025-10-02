#!/usr/bin/env tsx
/**
 * Generate CSV reports from the recovered database
 */

import * as fs from 'fs';
import * as path from 'path';

interface RecoveryData {
  representatives: any[];
  summary: any;
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateRepresentativesSummaryCSV(data: RecoveryData): string {
  const lines = ['Username,Code,Total_Transactions,Total_Amount,First_Transaction,Last_Transaction,CREATE,RENEWAL,EDIT,DELETE,OTHER'];
  
  for (const rep of data.representatives) {
    const row = [
      rep.username,
      rep.code,
      rep.totalTransactions,
      rep.totalAmount,
      rep.firstTransactionDate,
      rep.lastTransactionDate,
      rep.eventTypes.CREATE,
      rep.eventTypes.RENEWAL,
      rep.eventTypes.EDIT,
      rep.eventTypes.DELETE,
      rep.eventTypes.OTHER
    ].map(escapeCSV);
    
    lines.push(row.join(','));
  }
  
  return lines.join('\n');
}

function generateAllTransactionsCSV(data: RecoveryData): string {
  const lines = ['Representative_Username,Representative_Code,Event_Timestamp,Event_Type,Description,Amount'];
  
  for (const rep of data.representatives) {
    for (const tx of rep.transactions) {
      const row = [
        rep.username,
        rep.code,
        tx.event_timestamp,
        tx.event_type,
        tx.description,
        tx.amount
      ].map(escapeCSV);
      
      lines.push(row.join(','));
    }
  }
  
  return lines.join('\n');
}

function generateTop50RepresentativesCSV(data: RecoveryData): string {
  const lines = ['Rank,Username,Code,Total_Transactions,Total_Amount_Toman'];
  
  const top50 = data.representatives.slice(0, 50);
  
  top50.forEach((rep, index) => {
    const row = [
      index + 1,
      rep.username,
      rep.code,
      rep.totalTransactions,
      rep.totalAmount
    ].map(escapeCSV);
    
    lines.push(row.join(','));
  });
  
  return lines.join('\n');
}

async function main() {
  console.log('📊 Generating CSV reports from recovered data...');
  
  const dataPath = path.join(process.cwd(), 'database-recovery-data.json');
  const data: RecoveryData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Generate representatives summary
  console.log('📝 Generating representatives summary CSV...');
  const summaryCSV = generateRepresentativesSummaryCSV(data);
  fs.writeFileSync('representatives-summary.csv', summaryCSV, 'utf-8');
  console.log('✅ Created: representatives-summary.csv');
  
  // Generate all transactions
  console.log('📝 Generating all transactions CSV...');
  const transactionsCSV = generateAllTransactionsCSV(data);
  fs.writeFileSync('all-transactions.csv', transactionsCSV, 'utf-8');
  console.log('✅ Created: all-transactions.csv');
  
  // Generate top 50 representatives
  console.log('📝 Generating top 50 representatives CSV...');
  const top50CSV = generateTop50RepresentativesCSV(data);
  fs.writeFileSync('top-50-representatives.csv', top50CSV, 'utf-8');
  console.log('✅ Created: top-50-representatives.csv');
  
  console.log('\n✅ All CSV reports generated successfully!');
  console.log(`   - representatives-summary.csv (${data.representatives.length} rows)`);
  console.log(`   - all-transactions.csv (${data.representatives.reduce((sum, r) => sum + r.totalTransactions, 0)} rows)`);
  console.log(`   - top-50-representatives.csv (50 rows)`);
}

main().catch(console.error);
