from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from decimal import Decimal, getcontext
from typing import List, Dict, Any, Optional
import logging
import psycopg2
import os
from datetime import datetime
import uvicorn

# Set high precision for Decimal operations
getcontext().prec = 28

app = FastAPI(title="MarFaNet Financial Computation Service", version="1.0.0")

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "marfanet_db"),
        user=os.getenv("DB_USER", "marfanet"),
        password=os.getenv("DB_PASSWORD", "marfanet123"),
        port=os.getenv("DB_PORT", "5432")
    )

class RepresentativeDebt(BaseModel):
    representative_id: int
    total_invoices: Decimal
    total_payments: Decimal
    actual_debt: Decimal
    debt_level: str

class BulkDebtVerification(BaseModel):
    total_representatives: int
    total_system_debt: Decimal
    processing_time_ms: float
    representatives: List[RepresentativeDebt]

class ReconciliationResult(BaseModel):
    legacy_sum: Decimal
    ledger_sum: Decimal
    cache_sum: Decimal
    drift_ratio: float
    is_consistent: bool
    discrepancies: List[Dict[str, Any]]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "python-financial-computation", "timestamp": datetime.now().isoformat()}

@app.post("/calculate/bulk-debt", response_model=BulkDebtVerification)
async def calculate_bulk_debt(representative_ids: List[int]):
    """
    محاسبه دقیق بدهی چندین نماینده با استفاده از Decimal
    مزیت: حذف کامل rounding errors نسبت به JavaScript Number
    """
    start_time = datetime.now()
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        results = []
        total_debt = Decimal('0')
        
        for rep_id in representative_ids:
            # محاسبه دقیق برای هر نماینده
            cursor.execute("""
                SELECT COALESCE(SUM(amount::DECIMAL), 0) as total_invoices
                FROM invoices 
                WHERE representative_id = %s
            """, (rep_id,))
            total_invoices = Decimal(str(cursor.fetchone()[0]))
            
            cursor.execute("""
                SELECT COALESCE(SUM(amount_dec), SUM(amount::DECIMAL), 0) as total_payments
                FROM payments 
                WHERE representative_id = %s AND is_allocated = true
            """, (rep_id,))
            total_payments = Decimal(str(cursor.fetchone()[0] or 0))
            
            actual_debt = max(Decimal('0'), total_invoices - total_payments)
            debt_level = classify_debt_level(actual_debt)
            
            results.append(RepresentativeDebt(
                representative_id=rep_id,
                total_invoices=total_invoices,
                total_payments=total_payments,
                actual_debt=actual_debt,
                debt_level=debt_level
            ))
            
            total_debt += actual_debt
        
        cursor.close()
        conn.close()
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return BulkDebtVerification(
            total_representatives=len(representative_ids),
            total_system_debt=total_debt,
            processing_time_ms=processing_time,
            representatives=results
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def classify_debt_level(debt: Decimal) -> str:
    """طبقه‌بندی سطح بدهی مطابق منطق unified-financial-engine"""
    if debt == 0:
        return "HEALTHY"
    elif debt <= Decimal('100000'):
        return "MODERATE" 
    elif debt <= Decimal('500000'):
        return "HIGH"
    else:
        return "CRITICAL"

@app.post("/reconcile/drift-detection", response_model=ReconciliationResult)
async def reconcile_drift_detection(scope: str = "global"):
    """
    تشخیص drift بین legacy، ledger و cache با دقت بالا
    مزیت: محاسبات Decimal دقیق برای financial reconciliation
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Legacy sum از representatives table
        cursor.execute("SELECT COALESCE(SUM(total_debt::DECIMAL), 0) FROM representatives WHERE is_active = true")
        legacy_sum = Decimal(str(cursor.fetchone()[0]))
        
        # Ledger sum از payment_allocations
        cursor.execute("""
            SELECT COALESCE(
                SUM(i.amount::DECIMAL) - SUM(COALESCE(pa.allocated_amount, 0)), 
                0
            )
            FROM invoices i
            LEFT JOIN payment_allocations pa ON pa.invoice_id = i.id
            JOIN representatives r ON r.id = i.representative_id
            WHERE r.is_active = true
        """)
        ledger_sum = Decimal(str(cursor.fetchone()[0] or 0))
        
        # Cache sum از invoice_balance_cache
        cursor.execute("""
            SELECT COALESCE(SUM(ibc.remaining_amount), 0)
            FROM invoice_balance_cache ibc
            JOIN invoices i ON i.id = ibc.invoice_id
            JOIN representatives r ON r.id = i.representative_id
            WHERE r.is_active = true
        """)
        cache_sum = Decimal(str(cursor.fetchone()[0] or 0))
        
        cursor.close()
        conn.close()
        
        # محاسبه drift ratio با دقت بالا
        max_sum = max(legacy_sum, ledger_sum, cache_sum)
        if max_sum > 0:
            max_drift = max(abs(legacy_sum - ledger_sum), abs(ledger_sum - cache_sum), abs(legacy_sum - cache_sum))
            drift_ratio = float(max_drift / max_sum)
        else:
            drift_ratio = 0.0
            
        is_consistent = drift_ratio < 0.001  # Less than 0.1% drift
        
        discrepancies = []
        if not is_consistent:
            discrepancies.append({
                "type": "legacy_vs_ledger",
                "difference": float(abs(legacy_sum - ledger_sum)),
                "percentage": float(abs(legacy_sum - ledger_sum) / max_sum * 100) if max_sum > 0 else 0
            })
        
        return ReconciliationResult(
            legacy_sum=legacy_sum,
            ledger_sum=ledger_sum, 
            cache_sum=cache_sum,
            drift_ratio=drift_ratio,
            is_consistent=is_consistent,
            discrepancies=discrepancies
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconciliation error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")