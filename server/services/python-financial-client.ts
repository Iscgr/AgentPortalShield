/**
 * Python Financial Service Client
 * ادغام محاسبات Python با Node.js
 */

export interface PythonBulkDebtResult {
  representative_id: number;
  total_sales: number;
  total_paid: number;
  total_debt: number;
  debt_level: string;
  invoice_count: number;
  payment_count: number;
  last_invoice_date: string | null;
  last_payment_date: string | null;
}

export interface DriftDetectionResult {
  total_drift: number;
  drift_ratio: number;
  anomalies?: any[];
  processing_time_ms: number;
  scope?: string;
}

export class PythonFinancialClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
  }

  /**
   * Calculate bulk debt for multiple representatives using Python service
   */
  async calculateBulkDebt(representativeIds: number[]): Promise<PythonBulkDebtResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/calculate/bulk-debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(representativeIds), // Send as array, not object
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform Python response to expected format
      return data.representatives.map((rep: any) => ({
        representative_id: rep.representative_id,
        total_sales: parseFloat(rep.total_invoices) || 0, // Use total_invoices as sales
        total_paid: parseFloat(rep.total_payments) || 0,
        total_debt: parseFloat(rep.actual_debt) || 0,
        debt_level: rep.debt_level,
        invoice_count: rep.invoice_count || 0,
        payment_count: rep.payment_count || 0,
        last_invoice_date: rep.last_invoice_date || null,
        last_payment_date: rep.last_payment_date || null
      }));
    } catch (error) {
      console.error('Python service bulk debt calculation failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced drift detection with Python-powered anomaly analysis
   * Supports both global scope and targeted representative analysis
   */
  async detectDrift(options: {
    representatives?: number[];
    threshold: number;
    includeAnomalies?: boolean;
    scope?: string;
  } | string = 'global'): Promise<DriftDetectionResult> {
    try {
      // Handle backward compatibility for simple string scope
      const requestBody = typeof options === 'string' 
        ? { scope: options }
        : {
            representative_ids: options.representatives || [],
            threshold: options.threshold,
            include_anomalies: options.includeAnomalies !== false,
            scope: options.scope || 'global'
          };

      const response = await fetch(`${this.baseUrl}/reconcile/drift-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(45000) // Extended timeout for complex analysis
      });

      if (!response.ok) {
        throw new Error(`Python drift detection error: ${response.status}`);
      }

      const result = await response.json();
      
      // Ensure consistent return format
      return {
        total_drift: result.total_drift || 0,
        drift_ratio: result.drift_ratio || 0,
        anomalies: result.anomalies || [],
        processing_time_ms: result.processing_time_ms || 0,
        scope: result.scope || (typeof options === 'string' ? options : options.scope)
      };
    } catch (error) {
      console.error('Python drift detection failed:', error);
      throw error;
    }
  }

  /**
   * Health check Python service
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.warn('Python service health check failed:', error);
      return null;
    }
  }
}

export const pythonFinancialClient = new PythonFinancialClient();