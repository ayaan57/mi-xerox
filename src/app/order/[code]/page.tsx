'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

const statusConfig: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  pending: { icon: '🕐', label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  printing: { icon: '🖨️', label: 'Printing', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { icon: '✅', label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
};

const paymentConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-red-700', bg: 'bg-red-100' },
  paid: { label: 'Paid', color: 'text-green-700', bg: 'bg-green-100' },
};

export default function OrderStatusPage() {
  const params = useParams();
  const code = params.code as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${code}`);
      if (res.status === 404) {
        setError('Order not found. Please check your order code.');
        setOrder(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch order');
      const data: Order = await res.json();
      setOrder(data);
      setError(null);
    } catch {
      setError('Unable to load order. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const status = order ? statusConfig[order.orderStatus] : null;
  const payment = order ? paymentConfig[order.paymentStatus] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.25 7.034V3.375" />
            </svg>
            Mi Xerox
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg className="animate-spin w-10 h-10 mx-auto text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">Loading order...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link
              href="/upload"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700"
            >
              Place New Order
            </Link>
          </div>
        )}

        {/* Order Details */}
        {!loading && order && status && payment && (
          <div className="space-y-6">
            {/* Order Code Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
              <p className="text-sm text-gray-500 mb-2">Order Code</p>
              <div className="code-pulse inline-block border-4 border-indigo-600 rounded-2xl px-8 py-4 bg-indigo-50 mb-4">
                <p className="text-3xl sm:text-4xl font-extrabold text-indigo-700 tracking-widest font-mono">
                  {order.code}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-2xl">{status.icon}</span>
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <p className="text-xs text-gray-400 mt-3">Auto-refreshing every 5 seconds</p>
            </div>

            {/* Progress Steps */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                {['Received', 'Printing', 'Completed'].map((label, i) => {
                  const stepIndex = i;
                  const orderStepIndex =
                    order.orderStatus === 'pending' ? 0 :
                    order.orderStatus === 'printing' ? 1 : 2;
                  const done = stepIndex <= orderStepIndex;

                  return (
                    <div key={label} className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1
                            ${done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                        >
                          {done ? '✓' : stepIndex + 1}
                        </div>
                        <span className={`text-xs font-medium ${done ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                      {i < 2 && (
                        <div className={`h-0.5 flex-1 -mt-5 ${stepIndex < orderStepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Order Details</h3>

              {/* Files */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Files ({order.files.length})
                </p>
                <ul className="space-y-2">
                  {order.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-lg">
                        {f.type.startsWith('image/') ? '🖼️' : f.type === 'application/pdf' ? '📄' : '📃'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Print Settings */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Print Settings
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">Color</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {order.printOptions.colorMode === 'bw' ? '⬛ Black & White' : '🎨 Color'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">Paper</p>
                    <p className="font-medium text-gray-900 text-sm">{order.printOptions.paperSize}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">Copies</p>
                    <p className="font-medium text-gray-900 text-sm">{order.printOptions.copies}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">Sided</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {order.printOptions.doubleSided ? 'Double' : 'Single'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Payment:</span>
                  <span className="text-sm font-medium text-gray-700 uppercase">
                    {order.paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${payment.bg} ${payment.color}`}>
                    {payment.label}
                  </span>
                </div>
                <p className="text-xl font-bold text-indigo-600">₹{order.estimatedCost}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="text-center space-y-3">
              <Link
                href="/upload"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95"
              >
                Place New Order
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
