#!/usr/bin/env node

/**
 * 🎯 E-B3 Lighthouse Accessibility Audit Script
 * 
 * Automated accessibility testing for AgentPortalShield
 * Generates baseline scores and identifies improvement areas
 * 
 * Usage: node scripts/lighthouse-a11y-audit.js
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const AUDIT_CONFIG = {
  // Target URLs for testing (will need local server)
  urls: [
    'http://localhost:5173',           // Main dashboard
    'http://localhost:5173/representatives', // Table interactions
    'http://localhost:5173/invoices', // Form interactions
  ],
  
  // Lighthouse configuration
  options: {
    onlyCategories: 'accessibility',
    output: 'json',
    quiet: true,
    chromeFlags: '--headless --no-sandbox --disable-gpu'
  }
};

/**
 * Check if Lighthouse is installed
 */
function checkLighthouse() {
  try {
    execSync('lighthouse --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.log('📦 Installing Lighthouse CLI...');
    try {
      execSync('npm install -g lighthouse', { stdio: 'inherit' });
      return true;
    } catch {
      console.error('❌ Failed to install Lighthouse. Please install manually: npm install -g lighthouse');
      return false;
    }
  }
}

/**
 * Run Lighthouse audit on a single URL
 */
async function auditUrl(url) {
  console.log(`🔍 Auditing: ${url}`);
  
  try {
    const command = `lighthouse "${url}" --only-categories=accessibility --output=json --quiet --chrome-flags="--headless --no-sandbox --disable-gpu"`;
    const result = execSync(command, { encoding: 'utf-8' });
    const report = JSON.parse(result);
    
    return {
      url,
      score: Math.round(report.categories.accessibility.score * 100),
      audits: report.audits,
      success: true
    };
  } catch (error) {
    console.error(`❌ Failed to audit ${url}:`, error.message);
    return {
      url,
      score: 0,
      audits: {},
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate accessibility audit report
 */
function generateReport(results) {
  const timestamp = new Date().toISOString();
  const avgScore = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.score, 0) / results.filter(r => r.success).length;

  let report = `# 🎯 E-B3 Lighthouse Accessibility Audit Report\n\n`;
  report += `**Generated**: ${timestamp}\n`;
  report += `**Epic**: E-B3 Portal Theming & Accessibility\n`;
  report += `**Average Score**: ${Math.round(avgScore)}/100\n\n`;

  report += `## 📊 Individual Page Scores\n\n`;
  
  results.forEach(result => {
    if (result.success) {
      const emoji = result.score >= 90 ? '🟢' : result.score >= 80 ? '🟡' : '🔴';
      report += `### ${emoji} ${result.url}\n`;
      report += `**Score**: ${result.score}/100\n\n`;
      
      // Add key accessibility issues
      const failedAudits = Object.entries(result.audits)
        .filter(([key, audit]) => audit.score < 1 && audit.scoreDisplayMode !== 'notApplicable')
        .slice(0, 5); // Top 5 issues
        
      if (failedAudits.length > 0) {
        report += `**Key Issues**:\n`;
        failedAudits.forEach(([key, audit]) => {
          report += `- **${audit.title}**: ${audit.description}\n`;
        });
        report += `\n`;
      }
    } else {
      report += `### ❌ ${result.url}\n`;
      report += `**Error**: ${result.error}\n\n`;
    }
  });

  report += `## 🎯 WCAG AA Compliance Status\n\n`;
  report += `Based on Lighthouse audit results:\n\n`;
  
  const scoreRanges = {
    '90-100': { label: 'Excellent (WCAG AAA level)', emoji: '🟢', count: 0 },
    '80-89': { label: 'Good (WCAG AA level)', emoji: '🟡', count: 0 },
    '60-79': { label: 'Needs Improvement', emoji: '🟠', count: 0 },
    '0-59': { label: 'Critical Issues', emoji: '🔴', count: 0 }
  };

  results.filter(r => r.success).forEach(result => {
    if (result.score >= 90) scoreRanges['90-100'].count++;
    else if (result.score >= 80) scoreRanges['80-89'].count++;
    else if (result.score >= 60) scoreRanges['60-79'].count++;
    else scoreRanges['0-59'].count++;
  });

  Object.entries(scoreRanges).forEach(([range, data]) => {
    if (data.count > 0) {
      report += `- ${data.emoji} **${range}**: ${data.count} page(s) - ${data.label}\n`;
    }
  });

  report += `\n## 📋 Next Steps\n\n`;
  if (avgScore >= 90) {
    report += `✅ **Excellent accessibility compliance!** Consider advanced optimizations.\n`;
  } else if (avgScore >= 80) {
    report += `🎯 **Good progress!** Focus on remaining issues to reach AAA level.\n`;
  } else {
    report += `⚠️ **Action required!** Address critical accessibility barriers.\n`;
  }

  report += `\n---\n**E-B3 Progress**: Baseline established for continuous improvement\n`;

  return report;
}

/**
 * Main audit execution
 */
async function runAudit() {
  console.log('🎯 Starting E-B3 Lighthouse Accessibility Audit...\n');

  // Check prerequisites
  if (!checkLighthouse()) {
    process.exit(1);
  }

  // Note about server requirement
  console.log('📝 Note: This audit requires a running development server.');
  console.log('📝 Please ensure "npm run dev" is running on localhost:5173\n');

  // Run audits
  const results = [];
  for (const url of AUDIT_CONFIG.urls) {
    const result = await auditUrl(url);
    results.push(result);
  }

  // Generate and save report
  const report = generateReport(results);
  const reportPath = join(process.cwd(), 'LIGHTHOUSE_A11Y_REPORT.md');
  
  writeFileSync(reportPath, report);
  console.log(`\n✅ Audit complete! Report saved to: ${reportPath}`);
  
  // Display summary
  const avgScore = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.score, 0) / results.filter(r => r.success).length;
    
  console.log(`📊 Average Accessibility Score: ${Math.round(avgScore)}/100`);
  
  if (avgScore >= 80) {
    console.log('🎉 Great job! Your accessibility improvements are working!');
  } else {
    console.log('💪 Keep improving! Focus on the identified issues.');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit().catch(console.error);
}

export { runAudit, auditUrl, generateReport };