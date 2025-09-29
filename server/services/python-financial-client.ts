/**
 * Python Financial Service Client
 * ادغام محاسبات Python با Node.js
 */

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
   * تشخیص drift با دقت بالا
   */
  async detectDrift(scope: string = 'global') {
    try {
      const response = await fetch(`${this.baseUrl}/reconcile/drift-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to call Python drift detection:', error);
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