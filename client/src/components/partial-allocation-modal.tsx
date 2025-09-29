import React, { useEffect, useMemo, useState } from 'react';

// NOTE: در این فاز UI مینیمال با HTML خام تا وابستگی به لایه UI سفارشی که هنوز کامل نیست ایجاد نشود.
// در آینده می‌توان با سیستم طراحی (Button, Dialog, Table) جایگزین کرد.

async function apiRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
  return json;
}

interface CandidateInvoice {
  invoiceId: number;
  invoiceAmount: number;
  allocated: number;
  remaining: number;
  status: string;
}

interface PartialAllocationModalProps {
  paymentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllocated: () => void;
}

export const PartialAllocationModal: React.FC<PartialAllocationModalProps> = ({ paymentId, open, onOpenChange, onAllocated }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<CandidateInvoice[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number; alreadyAllocated: number } | null>(null);

  useEffect(() => {
    if (open && paymentId) {
      void load();
    }
  }, [open, paymentId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await apiRequest(`/api/payments/partial-candidates/${paymentId}`);
      if (data?.data?.candidates) setCandidates(data.data.candidates);
      // دریافت اطلاعات پرداخت (ساده: از همان endpoint payments یا ذخیره بیرونی – فعلاً مبلغ کل از /api/payments لیست در parent فرض)
      // TODO: در آینده endpoint اختصاصی payment detail با remaining پرداخت.
    } catch (e:any) {
      setError(e.message || 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }

  const totalAllocate = useMemo(() => {
    return Object.entries(amounts).reduce((sum, [id, val]) => sum + (parseFloat(val) || 0), 0);
  }, [amounts]);

  function setLineAmount(invoiceId: number, value: string) {
    setAmounts(a => ({ ...a, [invoiceId]: value }));
  }

  async function submit() {
    if (!paymentId) return;
    setSubmitting(true); setError(null);
    try {
      const lines = Object.entries(amounts)
        .map(([invoiceId, val]) => ({ invoiceId: Number(invoiceId), amount: parseFloat(val) }))
        .filter(l => l.amount > 0);
      if (!lines.length) {
        setError('هیچ مبلغی وارد نشده'); setSubmitting(false); return;
      }
      // اعتبارسنجی کلاینت ساده: عدم تخصیص بیش از remaining هر فاکتور
      for (const line of lines) {
        const c = candidates.find(ci => ci.invoiceId === line.invoiceId);
        if (!c) { setError('Invoice کاندید معتبر نیست'); setSubmitting(false); return; }
        if (line.amount - c.remaining > 1e-6) { setError(`مبلغ خط بیش از باقی‌مانده فاکتور ${line.invoiceId}`); setSubmitting(false); return; }
        if (!(line.amount > 0)) { setError('مبالغ باید مثبت باشند'); setSubmitting(false); return; }
      }
      const resp = await apiRequest('/api/payments/partial-allocate', {
        method: 'POST',
        body: JSON.stringify({ paymentId, lines })
      });
      if (resp?.success) {
        onAllocated();
        onOpenChange(false);
        setAmounts({});
      } else {
        setError(resp?.error || 'خطای تخصیص');
      }
    } catch (e:any) {
      setError(e.message || 'خطا در تخصیص');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-neutral-900 shadow-xl rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">تخصیص جزئی پرداخت</h2>
          <button onClick={() => onOpenChange(false)} className="text-sm text-gray-600 hover:text-gray-900">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">انتخاب فاکتورهای واجد شرایط و تعیین مبلغ تخصیص.</p>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {loading ? <div className="py-8 text-center">در حال بارگذاری...</div> : (
          <>
            <div className="border rounded-md overflow-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
                    <th className="p-2 text-right">فاکتور</th>
                    <th className="p-2 text-right">مبلغ</th>
                    <th className="p-2 text-right">تخصیص‌شده</th>
                    <th className="p-2 text-right">باقی‌مانده</th>
                    <th className="p-2 text-right">مبلغ تخصیص</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.invoiceId} className="border-b last:border-0">
                      <td className="p-2">#{c.invoiceId}</td>
                      <td className="p-2 font-mono">{c.invoiceAmount.toLocaleString()}</td>
                      <td className="p-2 font-mono">{c.allocated.toLocaleString()}</td>
                      <td className={`p-2 font-mono ${c.remaining < 0 ? 'text-red-500' : ''}`}>{c.remaining.toLocaleString()}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={amounts[c.invoiceId] || ''}
                          onChange={e => setLineAmount(c.invoiceId, e.target.value)}
                          className="w-full border rounded px-2 py-1 h-8 bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-700"
                        />
                      </td>
                    </tr>
                  ))}
                  {!candidates.length && (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-500">فاکتور قابل تخصیصی یافت نشد</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm mt-4">
              <div>جمع انتخابی: <span className="font-mono">{totalAllocate.toLocaleString()}</span></div>
              <div className="flex gap-2">
                <button onClick={() => onOpenChange(false)} disabled={submitting} className="px-3 py-1 border rounded text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800">انصراف</button>
                <button onClick={submit} disabled={submitting || !candidates.length} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">ارسال تخصیص</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
