#!/usr/bin/env node
/**
 * Contrast Audit Script - E-B3 Phase 1
 * محاسبه نسبت کنتراست رنگ‌های Design System مطابق WCAG AA
 * 
 * WCAG AA Requirements:
 * - Normal text: 4.5:1 minimum
 * - Large text: 3:1 minimum
 * - UI components: 3:1 minimum
 */

// Helper: Convert HSL to RGB
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  if (h < 1/6) [r, g, b] = [c, x, 0];
  else if (h < 2/6) [r, g, b] = [x, c, 0];
  else if (h < 3/6) [r, g, b] = [0, c, x];
  else if (h < 4/6) [r, g, b] = [0, x, c];
  else if (h < 5/6) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Helper: Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(...color1);
  const l2 = getLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper: Parse HSL string to RGB
function parseHslToRgb(hslString) {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return null;
  const [, h, s, l] = match.map(Number);
  return hslToRgb(h, s, l);
}

// Color palette from index.css (Dark mode - updated colors)
const colorPalette = {
  // Core colors (updated to match actual CSS)
  background: "hsl(220, 30%, 8%)",        // Dark background
  foreground: "hsl(280, 15%, 85%)",       // Light text
  primary: "hsl(258, 62%, 58%)",          // Updated purple primary (was 65%)
  primaryForeground: "hsl(0, 0%, 100%)",  // White
  destructive: "hsl(350, 55%, 45%)",      // Red destructive
  destructiveForeground: "hsl(0, 0%, 100%)", // White
  muted: "hsl(270, 20%, 15%)",            // Muted background
  mutedForeground: "hsl(270, 10%, 60%)",  // Muted text
  border: "hsl(270, 15%, 45%)",           // Updated border (was 35%)
  // Design system additions (updated)
  success: "hsl(145, 65%, 35%)",          // Updated green (was 55%, 45%)
  successForeground: "hsl(145, 25%, 96%)", // Light green
  warning: "hsl(40, 90%, 55%)",           // Orange
  warningForeground: "hsl(40, 30%, 10%)", // Dark orange
};

// Test combinations
const testCombinations = [
  { name: "Primary Button", bg: "primary", fg: "primaryForeground" },
  { name: "Destructive Button", bg: "destructive", fg: "destructiveForeground" },
  { name: "Success Button", bg: "success", fg: "successForeground" },
  { name: "Warning Button", bg: "warning", fg: "warningForeground" },
  { name: "Normal Text", bg: "background", fg: "foreground" },
  { name: "Muted Text", bg: "background", fg: "mutedForeground" },
  { name: "Text on Muted BG", bg: "muted", fg: "foreground" },
  { name: "Border vs Background", bg: "background", fg: "border" },
];

console.log("🎨 CONTRAST AUDIT REPORT - E-B3 Phase 1");
console.log("=" * 50);

const results = [];

testCombinations.forEach(test => {
  const bgColor = parseHslToRgb(colorPalette[test.bg]);
  const fgColor = parseHslToRgb(colorPalette[test.fg]);
  
  if (!bgColor || !fgColor) {
    console.log(`❌ Failed to parse colors for ${test.name}`);
    return;
  }
  
  const ratio = getContrastRatio(bgColor, fgColor);
  
  // WCAG AA compliance check
  const normalTextPass = ratio >= 4.5;
  const largeTextPass = ratio >= 3.0;
  const uiComponentPass = ratio >= 3.0;
  
  const status = normalTextPass ? "✅ PASS" : largeTextPass ? "⚠️ LARGE ONLY" : "❌ FAIL";
  
  results.push({
    name: test.name,
    ratio: ratio.toFixed(2),
    normalTextPass,
    largeTextPass,
    uiComponentPass,
    status
  });
  
  console.log(`${status} ${test.name}: ${ratio.toFixed(2)}:1`);
  console.log(`  BG: ${colorPalette[test.bg]} | FG: ${colorPalette[test.fg]}`);
  console.log(`  Normal Text: ${normalTextPass ? "✅" : "❌"} | Large Text: ${largeTextPass ? "✅" : "❌"} | UI: ${uiComponentPass ? "✅" : "❌"}`);
  console.log("");
});

// Summary
const passCount = results.filter(r => r.normalTextPass).length;
const partialPassCount = results.filter(r => r.largeTextPass && !r.normalTextPass).length;
const failCount = results.filter(r => !r.largeTextPass).length;

console.log("📊 SUMMARY:");
console.log(`Total combinations tested: ${results.length}`);
console.log(`✅ Full PASS (AA Normal): ${passCount}`);
console.log(`⚠️ Partial PASS (AA Large): ${partialPassCount}`);
console.log(`❌ FAIL: ${failCount}`);

// Recommendations
console.log("\n🔧 RECOMMENDATIONS:");
if (failCount > 0) {
  console.log("- مواردی که نیاز به بهبود دارند:");
  results.filter(r => !r.largeTextPass).forEach(r => {
    console.log(`  • ${r.name}: فعلی ${r.ratio}:1 - نیاز به افزایش تضاد`);
  });
}

if (partialPassCount > 0) {
  console.log("- موارد Partial Pass:");
  results.filter(r => r.largeTextPass && !r.normalTextPass).forEach(r => {
    console.log(`  • ${r.name}: فقط برای متن بزرگ مناسب (${r.ratio}:1)`);
  });
}

console.log("\n📋 NEXT STEPS (E-B3):");
console.log("1. بهبود رنگ‌های Fail شده");
console.log("2. تست در محیط واقعی با screen reader");
console.log("3. Focus state استانداردسازی");
console.log("4. Lighthouse A11y baseline");