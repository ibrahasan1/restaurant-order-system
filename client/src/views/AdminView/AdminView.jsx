import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { socket } from '../../utils/socket';
import { useConnectionStatus } from '../../hooks/useSocket';

/**
 * Admin-Dashboard
 * Übersicht über Bestellungen, Tische, Geräte und Tagesstatistiken
 */
export default function AdminView() {
  const { isConnected } = useConnectionStatus();
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    loadData();

    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(loadData, 30000);

    // Echtzeit-Geräteliste
    socket.on('device:list', ({ devices: devs }) => setDevices(devs));
    socket.on('order:new', () => loadData());
    socket.on('order:statusUpdate', () => loadData());

    return () => {
      clearInterval(interval);
      socket.off('device:list');
      socket.off('order:new');
      socket.off('order:statusUpdate');
    };
  }, []);

  async function loadData() {
    try {
      const [statsData, ordersData, tablesData] = await Promise.all([
        api.getTodayStats(),
        api.getTodayOrders(),
        api.getTables(),
      ]);
      setStats(statsData);
      setOrders(ordersData);
      setTables(tablesData);
    } catch (err) {
      console.error('Admin Daten laden fehlgeschlagen:', err);
    }
  }

  const roleIcons = { waiter: '📱', kitchen: '👨‍🍳', bar: '🍺', admin: '⚙️' };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          {isConnected ? 'Online' : 'Offline'}
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Tagesstatistiken */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Bestellungen heute" value={stats.total_orders} icon="📝" />
            <StatCard label="Umsatz heute" value={`${stats.total_revenue?.toFixed(2)}€`} icon="💰" />
            <StatCard label="Serviert" value={stats.served_count} icon="✅" color="text-green-400" />
            <StatCard label="Offen" value={stats.pending_count} icon="⏳" color="text-yellow-400" />
            <StatCard label="Storniert" value={stats.cancelled_count} icon="❌" color="text-red-400" />
          </div>
        )}

        {/* Verbundene Geräte */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">📡 Verbundene Geräte ({devices.length})</h2>
          {devices.length === 0 ? (
            <p className="text-slate-500">Keine Geräte verbunden</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {devices.map((device) => (
                <div key={device.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-2xl">{roleIcons[device.role] || '📱'}</span>
                  <div>
                    <p className="font-medium text-sm">{device.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{device.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tisch-Übersicht */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">🪑 Tische</h2>
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
          <h2 className="text-lg font-bold mb-4">📋 Heutige Bestellungen ({orders.length})</h2>
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
                    <td className="py-2 px-3 capitalize">{order.target === 'kitchen' ? '👨‍🍳' : '🍺'} {order.target}</td>
                    <td className="py-2 px-3">
                      <span className={`status-badge status-${order.status.replace('_', '-')}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{order.total_price?.toFixed(2)}€</td>
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
    </div>
  );
}

function StatCard({ label, value, icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
