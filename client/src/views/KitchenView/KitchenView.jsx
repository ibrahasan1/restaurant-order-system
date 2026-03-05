import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { useOrders, useConnectionStatus, useSoundNotifications } from '../../hooks/useSocket';
import OrderCard from '../../components/OrderCard';

/**
 * Küchen-Display (Tablet, Querformat)
 * Zeigt nur Speise-Bestellungen in 3 Spalten: Neu | In Arbeit | Fertig
 */
export default function KitchenView() {
  const { orders, loading } = useOrders('kitchen');
  const { isConnected } = useConnectionStatus();
  useSoundNotifications();

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
    } catch (err) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const newOrders = orders.filter((o) => o.status === 'new');
  const inProgressOrders = orders.filter((o) => o.status === 'in_progress');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍🍳</span>
          <h1 className="text-xl font-bold">Küche</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            {orders.length} offene Bestellung{orders.length !== 1 ? 'en' : ''}
          </span>
          <div className={`flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            {isConnected ? 'Verbunden' : 'Getrennt'}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-2xl animate-pulse">Lade Bestellungen...</div>
        </div>
      ) : (
        /* 3-Spalten Layout */
        <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-60px)]">
          {/* Neue Bestellungen */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="w-3 h-3 rounded-full bg-brand-500" />
              <h2 className="font-bold text-brand-400">Neu ({newOrders.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {newOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {newOrders.length === 0 && (
                <p className="text-center text-slate-600 py-8">Keine neuen Bestellungen</p>
              )}
            </div>
          </div>

          {/* In Arbeit */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <h2 className="font-bold text-yellow-400">In Arbeit ({inProgressOrders.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {inProgressOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {inProgressOrders.length === 0 && (
                <p className="text-center text-slate-600 py-8">—</p>
              )}
            </div>
          </div>

          {/* Fertig (zum Abholen) */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <h2 className="font-bold text-green-400">Fertig ({readyOrders.length})</h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {readyOrders.length === 0 && (
                <p className="text-center text-slate-600 py-8">—</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
