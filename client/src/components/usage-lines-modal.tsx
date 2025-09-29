import React, { useEffect, useState, useMemo } from 'react';
import { Eye, Filter, Download, X, Clock, User, CreditCard, FileText } from 'lucide-react';

// Helper function for API calls
async function apiRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
  return json;
}

// Types based on E-B6 API design
interface UsageLine {
  id: number;
  payment_id: number;
  invoice_id: number;
  allocated_amount: string;
  method: 'auto' | 'manual' | 'backfill';
  synthetic: boolean;
  idempotency_key?: string;
  performed_by?: number;
  created_at: string;
  payment_amount?: string;
  payment_date?: string;
  payment_representative_id?: number;
  invoice_amount?: string;
  invoice_number?: string;
  invoice_representative_id?: number;
  invoice_status?: string;
}

interface UsageLinesSummary {
  total: number;
  synthetic: number;
  manual: number;
  auto: number;
  totalAmount: string;
}

interface UsageLinesResponse {
  success: boolean;
  data: {
    lines: UsageLine[];
    summary: UsageLinesSummary;
    filters: {
      representative?: number;
      filter: string;
      limit: number;
    };
    meta: {
      maxLimit: number;
      hasMore: boolean;
      timestamp: string;
    };
  };
}

interface UsageLinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representativeId?: number;
  paymentId?: number;
  invoiceId?: number;
  title?: string;
}

export const UsageLinesModal: React.FC<UsageLinesModalProps> = ({ 
  open, 
  onOpenChange, 
  representativeId, 
  paymentId, 
  invoiceId,
  title = "خطوط تخصیص و مصرف" 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<UsageLine[]>([]);
  const [summary, setSummary] = useState<UsageLinesSummary | null>(null);
  const [filter, setFilter] = useState<'all' | 'synthetic' | 'manual' | 'auto'>('all');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (open) {
      void loadUsageLines();
    } else {
      // Reset state when modal closes
      setLines([]);
      setSummary(null);
      setError(null);
      setFilter('all');
    }
  }, [open, representativeId, paymentId, invoiceId, filter, limit]);

  async function loadUsageLines() {
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/allocations/lines';
      
      // Specific endpoints for payment/invoice
      if (paymentId) {
        url = `/api/allocations/lines/payment/${paymentId}`;
      } else if (invoiceId) {
        url = `/api/allocations/lines/invoice/${invoiceId}`;
      } else {
        // General endpoint with filters
        const params = new URLSearchParams();
        if (representativeId) params.append('representative', representativeId.toString());
        if (filter !== 'all') params.append('filter', filter);
        params.append('limit', limit.toString());
        url += `?${params.toString()}`;
      }

      console.log(`🔍 E-B6: Loading usage lines from ${url}`);
      const response = await apiRequest(url);
      
      if (response.success) {
        setLines(response.data.lines || []);
        setSummary(response.data.summary || null);
      } else {
        throw new Error(response.error || 'Failed to load usage lines');
      }
    } catch (e: any) {
      console.error('❌ Error loading usage lines:', e);
      setError(e.message || 'خطا در بارگذاری خطوط تخصیص');
    } finally {
      setLoading(false);
    }
  }

  const filteredLines = useMemo(() => {
    if (!lines) return [];
    return lines.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [lines]);

  function getMethodBadge(method: string, synthetic: boolean) {
    if (synthetic) {
      return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Synthetic</span>;
    }
    switch (method) {
      case 'manual':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Manual</span>;
      case 'auto':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Auto</span>;
      case 'backfill':
        return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Backfill</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{method}</span>;
    }
  }

  function formatDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour12: false });
    } catch {
      return dateStr;
    }
  }

  function formatCurrency(amount: string | number) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('fa-IR') + ' ریال';
  }

  async function exportLines() {
    try {
      const csvData = filteredLines.map(line => ({
        'تاریخ': formatDate(line.created_at),
        'پرداخت': line.payment_id,
        'فاکتور': line.invoice_id,
        'مبلغ تخصیص': line.allocated_amount,
        'روش': line.synthetic ? 'Synthetic' : line.method,
        'نماینده پرداخت': line.payment_representative_id || '',
        'نماینده فاکتور': line.invoice_representative_id || ''
      }));
      
      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `usage-lines-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (e) {
      console.error('Export error:', e);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-neutral-900 shadow-xl rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <Eye className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="font-semibold text-xl">{title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                شفافیت کامل تخصیص‌ها و تغییرات باقیمانده
                {representativeId && ` - نماینده ${representativeId}`}
                {paymentId && ` - پرداخت ${paymentId}`}
                {invoiceId && ` - فاکتور ${invoiceId}`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters & Summary */}
        <div className="p-6 border-b dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border rounded px-3 py-1 text-sm bg-white dark:bg-neutral-700 dark:border-neutral-600"
                >
                  <option value="all">همه</option>
                  <option value="synthetic">Synthetic</option>
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">تعداد:</span>
                <select 
                  value={limit} 
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="border rounded px-3 py-1 text-sm bg-white dark:bg-neutral-700 dark:border-neutral-600"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>

            <button 
              onClick={exportLines}
              disabled={!filteredLines.length}
              className="flex items-center space-x-2 px-3 py-1 text-sm border rounded hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>خروجی CSV</span>
            </button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-neutral-700 p-3 rounded border">
                <div className="text-sm text-gray-600 dark:text-gray-400">کل خطوط</div>
                <div className="text-lg font-semibold">{summary.total}</div>
              </div>
              <div className="bg-white dark:bg-neutral-700 p-3 rounded border">
                <div className="text-sm text-gray-600 dark:text-gray-400">Synthetic</div>
                <div className="text-lg font-semibold">{summary.synthetic}</div>
              </div>
              <div className="bg-white dark:bg-neutral-700 p-3 rounded border">
                <div className="text-sm text-gray-600 dark:text-gray-400">Manual</div>
                <div className="text-lg font-semibold">{summary.manual}</div>
              </div>
              <div className="bg-white dark:bg-neutral-700 p-3 rounded border">
                <div className="text-sm text-gray-600 dark:text-gray-400">Auto</div>
                <div className="text-lg font-semibold">{summary.auto}</div>
              </div>
              <div className="bg-white dark:bg-neutral-700 p-3 rounded border">
                <div className="text-sm text-gray-600 dark:text-gray-400">مجموع مبلغ</div>
                <div className="text-sm font-semibold">{formatCurrency(summary.totalAmount)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-96">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>در حال بارگذاری خطوط تخصیص...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
                    <th className="p-3 text-right">تاریخ</th>
                    <th className="p-3 text-right">پرداخت</th>
                    <th className="p-3 text-right">فاکتور</th>
                    <th className="p-3 text-right">مبلغ تخصیص</th>
                    <th className="p-3 text-right">روش</th>
                    <th className="p-3 text-right">جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800">
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-xs">{formatDate(line.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">#{line.payment_id}</span>
                        </div>
                        {line.payment_amount && (
                          <div className="text-xs text-gray-500">
                            {formatCurrency(line.payment_amount)}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-green-500" />
                          <span className="font-semibold">#{line.invoice_id}</span>
                        </div>
                        {line.invoice_number && (
                          <div className="text-xs text-gray-500">
                            {line.invoice_number}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-semibold">
                          {formatCurrency(line.allocated_amount)}
                        </div>
                      </td>
                      <td className="p-3">
                        {getMethodBadge(line.method, line.synthetic)}
                      </td>
                      <td className="p-3">
                        <div className="text-xs space-y-1">
                          {line.performed_by && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3 text-gray-400" />
                              <span>کاربر: {line.performed_by}</span>
                            </div>
                          )}
                          {line.idempotency_key && (
                            <div className="text-gray-500 font-mono">
                              Key: {line.idempotency_key.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredLines.length && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        هیچ خط تخصیصی یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              E-B6 Usage Line Visibility - ارائه شفافیت کامل در تغییرات باقیمانده فاکتورها
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100 dark:hover:bg-neutral-700"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};