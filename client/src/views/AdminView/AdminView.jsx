import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../utils/api';
import { socket } from '../../utils/socket';
import { useConnectionStatus } from '../../hooks/useSocket';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

function formatEuro(amount) {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Admin-Dashboard
 * Umsatz-Übersicht, Reset, Belege, Bestellungen, Tische, Geräte
 */
export default function AdminView({ device, onLogout }) {
  const { isConnected } = useConnectionStatus();
  const { showToast, ToastContainer } = useToast();
  const [view, setView] = useState('overview'); // overview | receipts
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  // Revenue State
  const [revenueData, setRevenueData] = useState(null);

  // Receipts State
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [receipts, setReceipts] = useState([]);

  // Reset Modal
  const [resetModal, setResetModal] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    try {
      const [statsData, ordersData, tablesData, revData] = await Promise.all([
        api.getTodayStats(),
        api.getTodayOrders(),
        api.getTables(),
        api.getAdminRevenue(today),
      ]);
      setStats(statsData);
      setOrders(ordersData);
      setTables(tablesData);
      setRevenueData(revData);
    } catch (err) {
      console.error('Admin Daten laden fehlgeschlagen:', err);
    }
  }, [today]);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    socket.on('device:list', ({ devices: devs }) => setDevices(devs));
    socket.on('order:new', () => loadData());
    socket.on('order:statusUpdate', () => loadData());
    socket.on('admin:revenue:updated', (data) => setRevenueData(data));

    return () => {
      clearInterval(interval);
      socket.off('device:list');
      socket.off('order:new');
      socket.off('order:statusUpdate');
      socket.off('admin:revenue:updated');
    };
  }, [loadData]);

  // ─── Reset Handlers ─────────────────────────

  const handleResetDevice = (dev) => {
    setResetModal({
      type: 'single',
      deviceId: dev.id,
      title: 'Umsatz zurücksetzen?',
      message: `${dev.device_name} — ${formatEuro(dev.total_revenue)} \u20ac (${dev.order_count} Bestellungen)\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
    });
  };

  const handleResetAll = () => {
    if (!revenueData) return;
    setResetModal({
      type: 'all',
      title: 'Alle Umsätze zurücksetzen?',
      message: `Gesamt: ${formatEuro(revenueData.grand_total)} \u20ac (${revenueData.total_orders} Bestellungen)\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
    });
  };

  const confirmReset = async () => {
    setResetLoading(true);
    try {
      if (resetModal.type === 'single') {
        await api.resetDeviceRevenue(resetModal.deviceId, today);
        showToast('Umsatz zurückgesetzt', 'success');
      } else {
        await api.resetAllRevenue(today);
        showToast('Alle Umsätze zurückgesetzt', 'success');
      }
      setResetModal(null);
      loadData();
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Receipts ───────────────────────────────

  const showReceipts = async (devId) => {
    try {
      const data = await api.getAdminDeviceReceipts(devId, today);
      setReceipts(data.receipts || []);
      setSelectedDeviceId(devId);
      setView('receipts');
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    }
  };

  const selectedDeviceName = revenueData?.devices?.find((d) => d.id === selectedDeviceId)?.device_name || '';

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <span className="text-xs text-slate-500">{device.device_name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {isConnected ? 'Online' : 'Offline'}
          </div>
          <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-300">
            Abmelden
          </button>
        </div>
      </header>

      {view === 'overview' && (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">

          {/* ─── Tagesumsatz-Übersicht ─── */}
          {revenueData && (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Tagesumsatz-Übersicht</h2>
                <span className="text-sm text-slate-400">{formatDate(today)}</span>
              </div>

              <div className="space-y-3 mb-4">
                {revenueData.devices.map((dev) => (
                  <div key={dev.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                    <button
                      onClick={() => showReceipts(dev.id)}
                      className="text-left hover:text-brand-400 transition-colors"
                    >
                      <span className="font-medium text-sm">{dev.device_name}</span>
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-lg">{formatEuro(dev.total_revenue)} &euro;</span>
                        <span className="text-xs text-slate-400 block">{dev.order_count} Bestellungen</span>
                      </div>
                      <button
                        onClick={() => handleResetDevice(dev)}
                        disabled={dev.total_revenue === 0}
                        className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/30
                                   hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-600">
                <div>
                  <span className="text-sm text-slate-400">Gesamt:</span>
                  <span className="text-2xl font-bold ml-3">{formatEuro(revenueData.grand_total)} &euro;</span>
                  <span className="text-sm text-slate-400 ml-2">{revenueData.total_orders} Bestellungen</span>
                </div>
                <button
                  onClick={handleResetAll}
                  disabled={revenueData.grand_total === 0}
                  className="btn-danger text-sm disabled:opacity-30"
                >
                  Alle zurücksetzen
                </button>
              </div>
            </div>
          )}

          {/* Tagesstatistiken */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Bestellungen" value={stats.total_orders} />
              <StatCard label="Umsatz (Bestellungen)" value={`${formatEuro(stats.total_revenue)} \u20ac`} />
              <StatCard label="Serviert" value={stats.served_count} color="text-green-400" />
              <StatCard label="Offen" value={stats.pending_count} color="text-yellow-400" />
              <StatCard label="Storniert" value={stats.cancelled_count} color="text-red-400" />
            </div>
          )}

          {/* Verbundene Geräte */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">Verbundene Geräte ({devices.length})</h2>
            {devices.length === 0 ? (
              <p className="text-slate-500">Keine Geräte verbunden</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {devices.map((dev) => (
                  <div key={dev.id} className="bg-slate-700/50 rounded-lg p-3">
                    <p className="font-medium text-sm">{dev.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{dev.role}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tisch-Übersicht */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">Tische</h2>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`rounded-lg p-2 text-center text-sm ${
                    table.status === 'free' ? 'bg-slate-700' :
                    table.status === 'occupied' ? 'bg-brand-500/20 border border-brand-500/50' :
                    table.status === 'reserved' ? 'bg-blue-500/20 border border-blue-500/50' :
                    'bg-slate-700/50 opacity-50'
                  }`}
                >
                  <span className="font-bold">{table.number}</span>
                  {table.active_orders > 0 && (
                    <span className="block text-xs text-brand-400">{table.active_orders}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Letzte Bestellungen */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">Heutige Bestellungen ({orders.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">Tisch</th>
                    <th className="text-left py-2 px-3">Ziel</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Betrag</th>
                    <th className="text-right py-2 px-3">Zeit</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 50).map((order) => (
                    <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-3 font-mono text-xs">{order.order_number}</td>
                      <td className="py-2 px-3">{order.table_number}</td>
                      <td className="py-2 px-3 capitalize">{order.target}</td>
                      <td className="py-2 px-3">
                        <span className={`status-badge status-${order.status.replace('_', '-')}`}>
                          {order.status === 'new' ? 'Neu' :
                           order.status === 'in_progress' ? 'In Arbeit' :
                           order.status === 'ready' ? 'Fertig' :
                           order.status === 'served' ? 'Serviert' :
                           'Storniert'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{formatEuro(order.total_price || 0)} &euro;</td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── BELEGE-ANSICHT ─── */}
      {view === 'receipts' && (
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('overview')}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              &larr; Zurück
            </button>
            <h2 className="text-lg font-bold">{selectedDeviceName} — Belege</h2>
            <span className="text-sm text-slate-400">{formatDate(today)}</span>
          </div>

          {receipts.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Keine Belege</p>
          ) : (
            receipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))
          )}
        </div>
      )}

      {/* Reset Modal */}
      {resetModal && (
        <ConfirmModal
          title={resetModal.title}
          message={resetModal.message}
          confirmLabel="Zurücksetzen"
          confirmClass="btn-danger"
          onConfirm={confirmReset}
          onCancel={() => setResetModal(null)}
          loading={resetLoading}
        />
      )}

      <ToastContainer />
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <span className="text-xs text-slate-400 block mb-1">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ReceiptCard({ receipt }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(receipt.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left bg-slate-800 rounded-xl border border-slate-700 p-4
                 hover:border-slate-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">Tisch {receipt.table_number}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{time} Uhr</span>
          <span className="font-bold text-lg">{formatEuro(receipt.total_amount)} &euro;</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {receipt.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
        </span>
        <span className="text-xs text-slate-500">
          {receipt.payment_type === 'full' ? 'Komplettzahlung' : 'Teilzahlung'}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-slate-300">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatEuro(item.price * item.quantity)} &euro;</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
