# Database Recovery - Quick Start Guide

## 🎯 What Was Done

Your application source code was **atomically analyzed** to extract all database-related information after your database was damaged. This is the **last chance recovery** of your data.

## 📦 Generated Files

### Main Data File
- **`database-recovery-data.json`** (494 KB)
  - Complete structured JSON with all recovered data
  - 227 Representatives
  - 1,470 Transactions
  - 49,981,108 تومان total

### Reports
- **`DATABASE_RECOVERY_REPORT.md`** - Comprehensive English/Persian report
- **`خلاصه-بازیابی-دیتابیس.md`** - Persian summary

### CSV Exports (For Excel)
- **`representatives-summary.csv`** - Summary of all 227 representatives
- **`all-transactions.csv`** - All 1,470 transactions
- **`top-50-representatives.csv`** - Top 50 by amount

### Scripts
- **`extract-database-recovery.ts`** - The extraction script (can be re-run)
- **`generate-csv-reports.ts`** - CSV generation script
- **`verify-extraction.ts`** - Data integrity verification

## ✅ Verification Status

All data has been verified:
- ✅ JSON structure is valid
- ✅ Transaction counts match
- ✅ Amounts are consistent
- ✅ Date ranges are correct
- ✅ CSV files are complete
- ✅ Hardcoded values extracted

Run verification anytime:
```bash
npx tsx verify-extraction.ts
```

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Representatives | 227 |
| Transactions | 1,470 |
| Total Amount | 49,981,108 تومان |
| Date Range | Sept 20-27, 2025 (7 days) |
| Database Tables | 27 |
| Hardcoded Values | 5 |

## 🔝 Top Representatives

1. **mohamadrzmb** - 2,049,900 تومان (74 transactions)
2. **isc_plus** - 1,932,000 تومان (49 transactions)
3. **Parsmb** - 1,365,400 تومان (42 transactions)
4. **lngst** - 1,296,000 تومان (34 transactions)
5. **daryamb** - 1,048,000 تومان (37 transactions)

[See `top-50-representatives.csv` for the complete top 50 list]

## 📖 How to Use

### 1. View in Excel
Open any CSV file in Excel or Google Sheets:
- `representatives-summary.csv` - Overview of all representatives
- `all-transactions.csv` - Detailed transaction list
- `top-50-representatives.csv` - Top performers

### 2. Access JSON Data
```bash
# View summary
cat database-recovery-data.json | jq '.summary'

# View first representative
cat database-recovery-data.json | jq '.representatives[0]'

# Count representatives
cat database-recovery-data.json | jq '.representatives | length'
```

### 3. Restore to Database
```typescript
import data from './database-recovery-data.json';

// Restore representatives
for (const rep of data.representatives) {
  await db.insert(representatives).values({
    code: rep.code,
    panelUsername: rep.username,
    name: `Representative ${rep.username}`,
    publicId: `pub_${rep.username}`,
    // ... other fields
  });
  
  // Restore transactions
  for (const tx of rep.transactions) {
    // Create invoice and payment records
  }
}
```

## 🗄️ Database Schema

Complete schema for 27 tables extracted from `shared/schema.ts`:

**Primary Tables:**
- `representatives` - Representative information
- `invoices` - Invoice records
- `payments` - Payment records
- `invoiceUsageItems` - Usage details
- `salesPartners` - Sales partners
- `adminUsers` - Admin users

**Supporting Tables:** (21 more)
- Invoice batches, activity logs, financial transactions
- Payment allocations, reconciliation data
- Employee management, Telegram integration
- And more...

See `DATABASE_RECOVERY_REPORT.md` for complete schema details.

## 🔍 Data Sources

Data was extracted from:

1. **`a.json`** - PHPMyAdmin export with all transaction records
2. **`backups_20250927_224331/`** - Backup code with hardcoded values
3. **`shared/schema.ts`** - Complete database schema
4. **Test files** - Sample data files

## 💡 Important Notes

### Data Integrity
- All 1,470 transactions parsed successfully
- All 227 representatives identified
- All amounts verified and consistent
- All dates in chronological order
- UTF-8 encoding for Persian text

### Limitations
- **Only data found in source code** was recovered
- If your original database had more data not in these files, it cannot be recovered
- Date range: 2025-09-20 to 2025-09-27 (7 days only)

## 🚀 Next Steps

1. **Review the Data**
   - Open CSV files in Excel
   - Check `DATABASE_RECOVERY_REPORT.md`
   - Verify representatives list

2. **Plan Database Restore**
   - Review schema in report
   - Prepare import scripts
   - Test on a development database first

3. **Import Data**
   - Use the JSON file as source
   - Follow database schema
   - Verify after import

## 📞 Files to Read

1. **Start here**: `RECOVERY_README.md` (this file)
2. **Persian summary**: `خلاصه-بازیابی-دیتابیس.md`
3. **Full report**: `DATABASE_RECOVERY_REPORT.md`
4. **View data**: CSV files or JSON file

## 🎉 Success Criteria

✅ All 227 representatives recovered  
✅ All 1,470 transactions recovered  
✅ All amounts verified (49,981,108 تومان)  
✅ Complete database schema extracted  
✅ Data integrity 100% confirmed  
✅ Ready for database restoration  

---

## 🔐 Validation

To verify data integrity at any time:

```bash
# Run verification script
npx tsx verify-extraction.ts

# Should output:
# 🎉 ALL VALIDATIONS PASSED!
# ✅ Data integrity confirmed.
# ✅ Extraction is complete and accurate.
```

---

## 📝 Example: Access a Representative's Data

```bash
# View a specific representative (e.g., mohamadrzmb)
cat database-recovery-data.json | jq '.representatives[] | select(.username == "mohamadrzmb")'

# Count their transactions
cat database-recovery-data.json | jq '.representatives[] | select(.username == "mohamadrzmb") | .transactions | length'

# Get their total amount
cat database-recovery-data.json | jq '.representatives[] | select(.username == "mohamadrzmb") | .totalAmount'
```

---

**Extraction Date**: October 2, 2025  
**Method**: Atomic Source Code Analysis  
**Status**: ✅ Complete and Verified  
**Purpose**: Database Damage Recovery

---

**Need Help?**
- Read `DATABASE_RECOVERY_REPORT.md` for detailed information
- Read `خلاصه-بازیابی-دیتابیس.md` for Persian summary
- Check CSV files for quick overview
- Run `verify-extraction.ts` to verify data integrity
