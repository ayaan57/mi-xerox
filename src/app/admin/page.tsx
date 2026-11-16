'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Order } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';
import QRCode from 'qrcode';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type FilterTab = 'all' | 'pending' | 'printing' | 'completed';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [qrUrl, setQrUrl] = useState('https://mi-xerox.vercel.app');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const toastId = useRef(0);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ── QR Code generation ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrUrl, { width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } })
      .then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => { cancelled = true; };
  }, [qrUrl]);

  // ── Fetch orders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: Order[] = await res.json();
      setOrders(data);
      setFetchError(null);
    } catch {
      setFetchError('Unable to load orders. Retrying…');
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ── Action helpers ─────────────────────────────────────────────────────────

  const setLoading = (key: string, value: boolean) =>
    setLoadingActions((prev) => ({ ...prev, [key]: value }));

  const patchOrder = async (code: string, body: Record<string, string>, actionKey: string, successMsg: string) => {
    setLoading(actionKey, true);
    try {
      const res = await fetch(`/api/orders/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchOrders();
      showToast(successMsg);
    } catch {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setLoading(actionKey, false);
    }
  };

  const deleteOrder = async (code: string) => {
    const actionKey = `delete-${code}`;
    setLoading(actionKey, true);
    try {
      const res = await fetch(`/api/orders/${code}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchOrders();
      showToast(`Order ${code} deleted`);
    } catch {
      showToast('Failed to delete order.', 'error');
    } finally {
      setLoading(actionKey, false);
    }
  };

  // ── Filtered & searched orders ─────────────────────────────────────────────

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.orderStatus !== filter) return false;
    if (search && !o.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.orderStatus === 'pending').length,
    printing: orders.filter((o) => o.orderStatus === 'printing').length,
    completed: orders.filter((o) => o.orderStatus === 'completed').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'printing', label: 'Printing' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="bg-indigo-950 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg">
              M
            </div>
            <h1 className="text-xl font-bold tracking-tight">Mi Xerox — Admin Panel</h1>
          </div>
          <div className="text-indigo-300 text-sm hidden sm:block">
            Auto-refreshing every 3s
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── QR Code + Stats Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Customer QR Code
            </h2>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
            ) : (
              <div className="w-40 h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Generating…
              </div>
            )}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Print this QR code and place it on your counter
            </p>
            <input
              type="text"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="App URL"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Orders" value={stats.total} color="bg-gray-100 text-gray-800" />
            <StatCard label="Pending" value={stats.pending} color="bg-amber-50 text-amber-700" />
            <StatCard label="Printing" value={stats.printing} color="bg-blue-50 text-blue-700" />
            <StatCard label="Completed" value={stats.completed} color="bg-green-50 text-green-700" />
          </div>
        </div>

        {/* ─── Filters Bar ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order code…"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ─── Error State ──────────────────────────────────────────────── */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* ─── Orders Grid ──────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-gray-300 text-5xl mb-3">📋</div>
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search
                ? 'Try a different search term'
                : filter !== 'all'
                  ? `No ${filter} orders right now`
                  : 'Orders will appear here when customers submit them'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                loadingActions={loadingActions}
                onStartPrinting={() =>
                  patchOrder(order.code, { orderStatus: 'printing' }, `print-${order.code}`, `${order.code} → Printing`)
                }
                onMarkCompleted={() =>
                  patchOrder(order.code, { orderStatus: 'completed' }, `complete-${order.code}`, `${order.code} → Completed`)
                }
                onMarkPaid={() =>
                  patchOrder(order.code, { paymentStatus: 'paid' }, `pay-${order.code}`, `${order.code} marked as paid`)
                }
                onDelete={() => deleteOrder(order.code)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ─── Toasts ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-[slideUp_0.3s_ease-out] ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

function OrderCard({
  order,
  loadingActions,
  onStartPrinting,
  onMarkCompleted,
  onMarkPaid,
  onDelete,
}: {
  order: Order;
  loadingActions: Record<string, boolean>;
  onStartPrinting: () => void;
  onMarkCompleted: () => void;
  onMarkPaid: () => void;
  onDelete: () => void;
}) {
  const statusBadge: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    printing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const paymentBadge: Record<string, string> = {
    pending: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm card-hover overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900 font-mono tracking-wider">{order.code}</p>
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge[order.orderStatus] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {order.orderStatus}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-5" />

      {/* Body */}
      <div className="px-5 py-3 flex-1 space-y-3 text-sm">
        {/* Files */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Files ({order.files.length})
          </p>
          <ul className="space-y-1">
            {order.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <a
                  href={`/api/files/${f.id}`}
                  download={f.name}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[70%]"
                  title={f.name}
                >
                  {f.name}
                </a>
                <span className="text-gray-400 text-xs flex-shrink-0 ml-2">{formatFileSize(f.size)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Print Settings */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Print Settings
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Color:</span>
              <span className="font-medium">
                {order.printOptions.colorMode === 'color' ? '🎨 Color' : '⬛ B&W'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Paper:</span>
              <span className="font-medium">{order.printOptions.paperSize}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Copies:</span>
              <span className="font-medium">{order.printOptions.copies}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Sided:</span>
              <span className="font-medium">{order.printOptions.doubleSided ? 'Double' : 'Single'}</span>
            </div>
          </div>
        </div>

        {/* Payment + Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs uppercase">Payment:</span>
            <span className="text-xs font-semibold uppercase text-gray-700">
              {order.paymentMethod}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${paymentBadge[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {order.paymentStatus}
            </span>
          </div>
          <p className="text-lg font-bold text-gray-900">₹{order.estimatedCost}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60 flex flex-wrap gap-2">
        {order.orderStatus === 'pending' && (
          <>
            <ActionButton
              label="Start Printing"
              loading={!!loadingActions[`print-${order.code}`]}
              onClick={onStartPrinting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            />
            {order.paymentStatus === 'pending' && (
              <ActionButton
                label="Mark Paid"
                loading={!!loadingActions[`pay-${order.code}`]}
                onClick={onMarkPaid}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              />
            )}
          </>
        )}

        {order.orderStatus === 'printing' && (
          <>
            <ActionButton
              label="Mark Completed"
              loading={!!loadingActions[`complete-${order.code}`]}
              onClick={onMarkCompleted}
              className="bg-green-600 hover:bg-green-700 text-white"
            />
            {order.paymentStatus === 'pending' && (
              <ActionButton
                label="Mark Paid"
                loading={!!loadingActions[`pay-${order.code}`]}
                onClick={onMarkPaid}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              />
            )}
          </>
        )}

        {order.orderStatus === 'completed' && (
          <ActionButton
            label="Delete Order"
            loading={!!loadingActions[`delete-${order.code}`]}
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          />
        )}
      </div>
    </div>
  );
}

// ─── Action Button ───────────────────────────────────────────────────────────

function ActionButton({
  label,
  loading,
  onClick,
  className,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Working…
        </span>
      ) : (
        label
      )}
    </button>
  );
}
