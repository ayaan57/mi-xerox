'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
    QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#c7d2fe', light: '#0f172a' },
    })
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
      if (selectedOrder?.code === code) setSelectedOrder(null);
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

  // ── Revenue ────────────────────────────────────────────────────────────────

  const totalRevenue = orders.reduce((sum, o) => sum + o.estimatedCost, 0);
  const paidRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.estimatedCost, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string; icon: string; count: number }[] = [
    { key: 'all', label: 'All', icon: '📋', count: stats.total },
    { key: 'pending', label: 'Pending', icon: '🕐', count: stats.pending },
    { key: 'printing', label: 'Printing', icon: '🖨️', count: stats.printing },
    { key: 'completed', label: 'Done', icon: '✅', count: stats.completed },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none fixed top-1/2 -right-60 w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl" />

      {/* ─── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="relative bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  Mi Xerox
                </h1>
                <p className="text-[10px] text-indigo-300/70 font-medium uppercase tracking-widest -mt-0.5">
                  Admin Panel
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-indigo-300/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Live — auto-refresh 3s
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Stats Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Orders" value={String(stats.total)} icon="📦" gradient="from-slate-500/20 to-slate-600/20" />
          <StatCard label="Pending" value={String(stats.pending)} icon="🕐" gradient="from-amber-500/20 to-orange-600/20" />
          <StatCard label="Printing" value={String(stats.printing)} icon="🖨️" gradient="from-blue-500/20 to-cyan-600/20" />
          <StatCard label="Completed" value={String(stats.completed)} icon="✅" gradient="from-green-500/20 to-emerald-600/20" />
          <StatCard label="Revenue" value={`₹${totalRevenue}`} icon="💰" gradient="from-purple-500/20 to-violet-600/20" />
          <StatCard label="Collected" value={`₹${paidRevenue}`} icon="✨" gradient="from-indigo-500/20 to-blue-600/20" />
        </div>

        {/* ─── QR Code + Filters Row ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* QR Code Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3">
            <h2 className="text-xs font-semibold text-indigo-300/70 uppercase tracking-widest">
              Customer QR Code
            </h2>
            {qrDataUrl ? (
              <div className="p-2 bg-slate-900/80 rounded-xl border border-white/5">
                <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-lg" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-xl bg-white/5 flex items-center justify-center text-indigo-300/40 text-sm">
                Generating…
              </div>
            )}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Print & place on your counter
            </p>
            <input
              type="text"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="App URL"
              className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
            />
          </div>

          {/* Filters + Search */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Tabs */}
              <div className="flex bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-1 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      filter === tab.key
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      filter === tab.key ? 'bg-white/20' : 'bg-white/5'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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
                  placeholder="Search order code…"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent backdrop-blur-sm"
                />
              </div>
            </div>

            {/* ─── Error State ────────────────────────────────────────── */}
            {fetchError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
                {fetchError}
              </div>
            )}

            {/* ─── Orders Grid ────────────────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-16 text-center">
                <div className="text-5xl mb-4 opacity-40">📋</div>
                <p className="text-slate-300 font-semibold text-lg">No orders found</p>
                <p className="text-slate-500 text-sm mt-1.5">
                  {search
                    ? 'Try a different search term'
                    : filter !== 'all'
                      ? `No ${filter} orders right now`
                      : 'Orders will appear here when customers submit them'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filtered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    loadingActions={loadingActions}
                    isSelected={selectedOrder?.id === order.id}
                    onSelect={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
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
          </div>
        </div>
      </main>

      {/* ─── Toasts ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white backdrop-blur-xl border animate-[slideUp_0.3s_ease-out] ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-500/30 shadow-green-500/10'
                : 'bg-red-500/20 border-red-500/30 shadow-red-500/10'
            }`}
          >
            <span className="mr-2">{toast.type === 'success' ? '✅' : '❌'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, gradient }: { label: string; value: string; icon: string; gradient: string }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} backdrop-blur-xl border border-white/10 rounded-2xl p-4 group hover:border-white/20 hover:scale-[1.02] transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

function OrderCard({
  order,
  loadingActions,
  isSelected,
  onSelect,
  onStartPrinting,
  onMarkCompleted,
  onMarkPaid,
  onDelete,
}: {
  order: Order;
  loadingActions: Record<string, boolean>;
  isSelected: boolean;
  onSelect: () => void;
  onStartPrinting: () => void;
  onMarkCompleted: () => void;
  onMarkPaid: () => void;
  onDelete: () => void;
}) {
  const statusConfig: Record<string, { bg: string; text: string; icon: string; glow: string }> = {
    pending: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      icon: '🕐',
      glow: 'shadow-amber-500/5',
    },
    printing: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-300',
      icon: '🖨️',
      glow: 'shadow-blue-500/5',
    },
    completed: {
      bg: 'bg-green-500/15',
      text: 'text-green-300',
      icon: '✅',
      glow: 'shadow-green-500/5',
    },
  };

  const paymentConfig: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-red-500/15', text: 'text-red-300' },
    paid: { bg: 'bg-green-500/15', text: 'text-green-300' },
  };

  const status = statusConfig[order.orderStatus] ?? statusConfig.pending;
  const payment = paymentConfig[order.paymentStatus] ?? paymentConfig.pending;

  return (
    <div
      onClick={onSelect}
      className={`group bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:bg-white/[0.08] ${
        isSelected
          ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center text-lg ${status.glow} shadow-lg`}>
            {status.icon}
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono tracking-wider">{order.code}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{timeAgo(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${payment.bg} ${payment.text}`}>
            {order.paymentStatus === 'paid' ? '💰 Paid' : '⏳ Unpaid'}
          </span>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${status.bg} ${status.text}`}>
            {order.orderStatus}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 mx-5" />

      {/* Body */}
      <div className="px-5 py-3 flex-1 space-y-3 text-sm">
        {/* Quick Info Row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span>{order.printOptions.colorMode === 'color' ? '🌈' : '🖤'}</span>
            <span className="text-slate-300 font-medium">{order.printOptions.colorMode === 'color' ? 'Color' : 'B&W'}</span>
          </span>
          <span className="text-white/10">•</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            📄 <span className="text-slate-300 font-medium">{order.printOptions.paperSize}</span>
          </span>
          <span className="text-white/10">•</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            🔢 <span className="text-slate-300 font-medium">{order.printOptions.copies} {order.printOptions.copies > 1 ? 'copies' : 'copy'}</span>
          </span>
          <span className="text-white/10">•</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            {order.printOptions.doubleSided ? '📑' : '📃'} <span className="text-slate-300 font-medium">{order.printOptions.doubleSided ? 'Double' : 'Single'}</span>
          </span>
        </div>

        {/* Files */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Files ({order.files.length})
          </p>
          <div className="space-y-1">
            {order.files.map((f) => (
              <div key={f.id} className="flex items-center justify-between group/file">
                <a
                  href={`/api/files/${f.id}`}
                  download={f.name}
                  onClick={(e) => e.stopPropagation()}
                  className="text-indigo-300 hover:text-indigo-200 hover:underline underline-offset-2 truncate max-w-[70%] text-xs transition-colors"
                  title={f.name}
                >
                  📎 {f.name}
                </a>
                <span className="text-slate-600 text-[11px] flex-shrink-0 ml-2">{formatFileSize(f.size)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            {order.paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash'}
          </span>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            ₹{order.estimatedCost}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-white/5 px-5 py-3 bg-white/[0.02] flex flex-wrap gap-2">
        {order.orderStatus === 'pending' && (
          <>
            <GlassButton
              label="🖨️ Start Printing"
              loading={!!loadingActions[`print-${order.code}`]}
              onClick={(e) => { e.stopPropagation(); onStartPrinting(); }}
              variant="blue"
            />
            {order.paymentStatus === 'pending' && (
              <GlassButton
                label="💰 Mark Paid"
                loading={!!loadingActions[`pay-${order.code}`]}
                onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}
                variant="green"
              />
            )}
          </>
        )}

        {order.orderStatus === 'printing' && (
          <>
            <GlassButton
              label="✅ Mark Completed"
              loading={!!loadingActions[`complete-${order.code}`]}
              onClick={(e) => { e.stopPropagation(); onMarkCompleted(); }}
              variant="green"
            />
            {order.paymentStatus === 'pending' && (
              <GlassButton
                label="💰 Mark Paid"
                loading={!!loadingActions[`pay-${order.code}`]}
                onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}
                variant="green"
              />
            )}
          </>
        )}

        {order.orderStatus === 'completed' && (
          <GlassButton
            label="🗑️ Delete"
            loading={!!loadingActions[`delete-${order.code}`]}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            variant="red"
          />
        )}
      </div>
    </div>
  );
}

// ─── Glass Button ────────────────────────────────────────────────────────────

function GlassButton({
  label,
  loading,
  onClick,
  variant,
}: {
  label: string;
  loading: boolean;
  onClick: (e: React.MouseEvent) => void;
  variant: 'blue' | 'green' | 'red';
}) {
  const styles = {
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25 hover:border-blue-500/40 shadow-blue-500/5',
    green: 'bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/25 hover:border-green-500/40 shadow-green-500/5',
    red: 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25 hover:border-red-500/40 shadow-red-500/5',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-lg backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.03] active:scale-95 ${styles[variant]}`}
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
