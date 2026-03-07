import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { socket } from '../../utils/socket';
import { useConnectionStatus } from '../../hooks/useSocket';
import OrderCard from '../../components/OrderCard';
import PaymentModal from '../../components/PaymentModal';
import { useToast } from '../../components/Toast';

/**
 * Formatierung: Euro-Betrag im deutschen Format
 */
function formatEuro(amount) {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WaiterView({ device, onLogout }) {
  const { isConnected } = useConnectionStatus();
  const { showToast, ToastContainer } = useToast();
  const [view, setView] = useState('tables');
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  // Revenue State
  const [revenue, setRevenue] = useState({ total_revenue: 0, order_count: 0, last_payment: null });
  const [receipts, setReceipts] = useState([]);

  // Payment State
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Table Payment View
  const [tablePayOrders, setTablePayOrders] = useState([]);

  const today = new Date().toISOString().slice(0, 10);

  // Daten laden
  const loadData = useCallback(async () => {
    try {
      const [tablesData, menuData, ordersData] = await Promise.all([
        api.getTables(),
        api.getMenu(),
        api.getActiveOrders(),
      ]);
      setTables(tablesData);
      setMenu(menuData);
      setActiveOrders(ordersData);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Revenue laden
  const loadRevenue = useCallback(async () => {
    try {
      const data = await api.getDeviceRevenue(device.id, today);
      setRevenue(data);
    } catch (err) {
      console.error('Revenue laden fehlgeschlagen:', err);
    }
  }, [device.id, today]);

  // Belege laden
  const loadReceipts = useCallback(async () => {
    try {
      const data = await api.getDeviceReceipts(device.id, today);
      setReceipts(data.receipts || []);
    } catch (err) {
      console.error('Belege laden fehlgeschlagen:', err);
    }
  }, [device.id, today]);

  useEffect(() => {
    loadData();
    loadRevenue();

    // Echtzeit-Updates
    const handleStatusUpdate = ({ orderId, status, order }) => {
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...order, status } : o))
      );
    };

    const handleOrderReady = ({ tableNumber }) => {
      showToast(`Bestellung Tisch ${tableNumber} ist fertig`, 'info');
    };

    const handleTableUpdate = (table) => {
      setTables((prev) => prev.map((t) => (t.id === table.id ? table : t)));
    };

    const handleRevenueUpdated = (data) => {
      if (data.deviceId === device.id) {
        setRevenue({
          total_revenue: data.new_total,
          order_count: data.order_count,
          last_payment: data.last_payment,
        });
      }
    };

    const handleRevenueReset = (data) => {
      if (!data.deviceId || data.deviceId === device.id) {
        loadRevenue();
      }
    };

    socket.on('order:statusUpdate', handleStatusUpdate);
    socket.on('order:ready', handleOrderReady);
    socket.on('table:statusUpdate', handleTableUpdate);
    socket.on('revenue:updated', handleRevenueUpdated);
    socket.on('revenue:reset', handleRevenueReset);

    return () => {
      socket.off('order:statusUpdate', handleStatusUpdate);
      socket.off('order:ready', handleOrderReady);
      socket.off('table:statusUpdate', handleTableUpdate);
      socket.off('revenue:updated', handleRevenueUpdated);
      socket.off('revenue:reset', handleRevenueReset);
    };
  }, [device.id, loadData, loadRevenue]);

  // Belege laden wenn Tab gewechselt wird
  useEffect(() => {
    if (view === 'receipts') {
      loadReceipts();
    }
  }, [view, loadReceipts]);

  // ─── Cart Logic ────────────────────────────

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        menu_item_id: item.id,
        name: item.name,
        unit_price: item.price,
        quantity: 1,
        notes: '',
        target: item.target,
      }];
    });
  };

  const submitOrder = async (target) => {
    const targetItems = cart.filter((item) => item.target === target);
    if (targetItems.length === 0) return;

    try {
      const order = await api.createOrder({
        table_id: selectedTable.id,
        waiter_name: device.device_name,
        target,
        items: targetItems.map(({ menu_item_id, quantity, unit_price, notes }) => ({
          menu_item_id, quantity, unit_price, notes,
        })),
        notes: notes || undefined,
      });
      setActiveOrders((prev) => [...prev, order]);
      setCart((prev) => prev.filter((item) => item.target !== target));
      if (cart.filter((item) => item.target !== target).length === 0) {
        setNotes('');
      }
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    }
  };

  const submitAll = async () => {
    const targets = [...new Set(cart.map((i) => i.target))];
    for (const target of targets) {
      await submitOrder(target);
    }
    showToast('Bestellung aufgegeben', 'success');
    setView('tables');
    setSelectedTable(null);
  };

  // ─── Payment Logic ─────────────────────────

  const handlePayOrder = (order) => {
    setPaymentModal({
      orderId: order.id,
      tableNumber: order.table_number,
      amount: order.total_price,
      type: 'full',
    });
  };

  const handlePayTable = async (table) => {
    try {
      const orders = await api.getTableOrders(table.id);
      if (orders.length === 0) {
        showToast('Keine offenen Bestellungen', 'info');
        return;
      }
      setTablePayOrders(orders);
      setSelectedTable(table);
      setView('table-pay');
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    }
  };

  const confirmPayment = async () => {
    if (!paymentModal) return;
    setPaymentLoading(true);
    try {
      const result = await api.payOrder(paymentModal.orderId, {
        deviceId: device.id,
        type: paymentModal.type,
        itemIds: paymentModal.itemIds,
      });
      showToast(result.message, 'success');
      setPaymentModal(null);

      // Orders und Revenue aktualisieren
      loadData();
      loadRevenue();

      // Wenn wir in der Tisch-Bezahlung sind, View aktualisieren
      if (view === 'table-pay' && selectedTable) {
        const orders = await api.getTableOrders(selectedTable.id);
        setTablePayOrders(orders);
        if (orders.length === 0) {
          setView('tables');
          setSelectedTable(null);
        }
      }
    } catch (err) {
      showToast(`Fehler: ${err.message}`, 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const totalPrice = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse text-slate-400">Lade...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              {view === 'tables' && 'Tisch wählen'}
              {view === 'menu' && `Tisch ${selectedTable?.number}`}
              {view === 'cart' && `Warenkorb (${cart.length})`}
              {view === 'orders' && 'Bestellungen'}
              {view === 'revenue' && 'Mein Umsatz'}
              {view === 'receipts' && 'Meine Belege'}
              {view === 'table-pay' && `Tisch ${selectedTable?.number} bezahlen`}
            </h1>
            <span className="text-xs text-slate-500">{device.device_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-300">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* ─── TISCH-AUSWAHL ─── */}
      {view === 'tables' && (
        <div className="p-4">
          {/* Mini Revenue Panel */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Tagesumsatz</span>
                <span className="text-2xl font-bold text-white">{formatEuro(revenue.total_revenue)} &euro;</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">{revenue.order_count} Zahlungen</span>
                {revenue.last_payment && (
                  <span className="text-xs text-slate-500 block">
                    Tisch {revenue.last_payment.table} &middot; {formatEuro(revenue.last_payment.amount)} &euro;
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {tables.map((table) => {
              const hasActiveOrders = table.active_orders > 0;
              const isOccupied = table.status === 'occupied' || hasActiveOrders;

              return (
                <button
                  key={table.id}
                  onClick={() => { setSelectedTable(table); setView('menu'); }}
                  onContextMenu={(e) => { e.preventDefault(); handlePayTable(table); }}
                  className={`
                    p-3 rounded-xl text-center transition-all active:scale-95 relative
                    ${isOccupied
                      ? 'bg-brand-500/15 border border-brand-500/40 ring-1 ring-brand-500/20'
                      : table.status === 'reserved'
                        ? 'bg-blue-500/15 border border-blue-500/40'
                        : table.status === 'blocked'
                          ? 'bg-slate-800 opacity-40'
                          : 'bg-slate-700 hover:bg-slate-600'}
                  `}
                >
                  <span className="text-2xl font-bold block">{table.number}</span>
                  <span className="text-xs text-slate-400">{table.seats}P</span>
                  {hasActiveOrders && (
                    <span className="block text-xs text-brand-400 mt-1 font-medium">{table.active_orders} Best.</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SPEISEKARTE ─── */}
      {view === 'menu' && (
        <div className="p-4 space-y-6">
          {menu.map((category) => (
            <div key={category.category}>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                {category.category}
              </h2>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart({ ...item, target: category.target })}
                    disabled={!item.is_available}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700
                               rounded-lg p-3 transition-all active:scale-[0.98] disabled:opacity-40"
                  >
                    <div className="text-left">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-brand-400 font-bold text-sm ml-2 whitespace-nowrap">
                      {formatEuro(item.price)} &euro;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WARENKORB ─── */}
      {view === 'cart' && (
        <div className="p-4">
          {cart.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Warenkorb ist leer</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart((prev) => prev.map((c, i) =>
                        i === idx ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c))}
                        className="w-7 h-7 rounded bg-slate-700 text-center">-</button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => setCart((prev) => prev.map((c, i) =>
                        i === idx ? { ...c, quantity: c.quantity + 1 } : c))}
                        className="w-7 h-7 rounded bg-slate-700 text-center">+</button>
                    </div>
                    <span className="flex-1 text-sm">{item.name}</span>
                    <span className="text-brand-400 text-sm font-bold">
                      {formatEuro(item.unit_price * item.quantity)} &euro;
                    </span>
                    <button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 text-xs ml-1">&times;</button>
                  </div>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anmerkungen zur Bestellung..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm mb-4 resize-none"
                rows={2}
              />

              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Gesamt:</span>
                  <span className="text-brand-400">{formatEuro(totalPrice)} &euro;</span>
                </div>
              </div>

              <button onClick={submitAll} className="btn-primary w-full text-lg py-3">
                Bestellung absenden
              </button>
            </>
          )}
        </div>
      )}

      {/* ─── AKTIVE BESTELLUNGEN ─── */}
      {view === 'orders' && (
        <div className="p-4 space-y-3">
          {activeOrders.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Keine aktiven Bestellungen</p>
          ) : (
            activeOrders.map((order) => (
              <div key={order.id}>
                <OrderCard order={order} showActions={false} compact />
                <button
                  onClick={() => handlePayOrder(order)}
                  className="w-full mt-1 py-2 text-sm font-medium text-green-400 bg-green-500/10
                             border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  Bezahlen &middot; {formatEuro(order.total_price)} &euro;
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TISCH BEZAHLEN ─── */}
      {view === 'table-pay' && (
        <div className="p-4 space-y-3">
          <button
            onClick={() => { setView('tables'); setSelectedTable(null); setTablePayOrders([]); }}
            className="text-sm text-slate-400 hover:text-slate-200 mb-2"
          >
            &larr; Zurück
          </button>
          {tablePayOrders.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Keine offenen Bestellungen</p>
          ) : (
            tablePayOrders.map((order) => (
              <div key={order.id}>
                <OrderCard order={order} showActions={false} compact />
                <button
                  onClick={() => handlePayOrder(order)}
                  className="w-full mt-1 py-2 text-sm font-medium text-green-400 bg-green-500/10
                             border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  Bezahlen &middot; {formatEuro(order.total_price)} &euro;
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── UMSATZ ─── */}
      {view === 'revenue' && (
        <div className="p-4 space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Mein Tagesumsatz</span>
            <span className="text-4xl font-bold text-white block mb-1">{formatEuro(revenue.total_revenue)} &euro;</span>
            <span className="text-sm text-slate-400">{revenue.order_count} Zahlungen</span>
          </div>

          {revenue.last_payment && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <span className="text-xs text-slate-400 block mb-1">Letzte Zahlung</span>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Tisch {revenue.last_payment.table}</span>
                <span className="font-bold">{formatEuro(revenue.last_payment.amount)} &euro;</span>
              </div>
              <span className="text-xs text-slate-500">{revenue.last_payment.time} Uhr</span>
            </div>
          )}

          <button
            onClick={() => setView('receipts')}
            className="w-full py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300
                       hover:bg-slate-700 transition-colors"
          >
            Alle Belege anzeigen
          </button>
        </div>
      )}

      {/* ─── BELEGE ─── */}
      {view === 'receipts' && (
        <div className="p-4 space-y-3">
          <button
            onClick={() => setView('revenue')}
            className="text-sm text-slate-400 hover:text-slate-200 mb-2"
          >
            &larr; Zurück zum Umsatz
          </button>
          {receipts.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Keine Belege heute</p>
          ) : (
            receipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))
          )}
        </div>
      )}

      {/* ─── BOTTOM NAV ─── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex z-50">
        {[
          { id: 'tables', label: 'Tische' },
          { id: 'menu', label: 'Karte' },
          { id: 'cart', label: 'Korb', badge: cart.length },
          { id: 'orders', label: 'Status' },
          { id: 'revenue', label: 'Umsatz' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 py-3 text-center relative transition-colors text-xs font-medium
              ${view === tab.id ? 'text-brand-400' : 'text-slate-500'}`}
          >
            <span className="block">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute top-1.5 right-1/4 bg-brand-500 text-white text-[10px]
                             w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          tableNumber={paymentModal.tableNumber}
          amount={paymentModal.amount}
          onConfirm={confirmPayment}
          onCancel={() => setPaymentModal(null)}
          loading={paymentLoading}
        />
      )}

      <ToastContainer />
    </div>
  );
}

/**
 * Beleg-Karte
 */
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
        <span className="font-medium text-sm">Tisch {receipt.table_number}</span>
        <span className="text-xs text-slate-400">{time} Uhr</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {receipt.payment_type === 'full' ? 'Komplettzahlung' : 'Teilzahlung'}
        </span>
        <span className="font-bold text-brand-400">{formatEuro(receipt.total_amount)} &euro;</span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-slate-300">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatEuro(item.price * item.quantity)} &euro;</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
