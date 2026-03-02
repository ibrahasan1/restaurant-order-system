import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { socket } from '../../utils/socket';
import { useConnectionStatus } from '../../hooks/useSocket';
import OrderCard from '../../components/OrderCard';

export default function WaiterView() {
  const { isConnected } = useConnectionStatus();
  const [view, setView] = useState('tables'); // tables | menu | cart | orders
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  // Daten laden
  useEffect(() => {
    async function loadData() {
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
    }
    loadData();

    // Echtzeit-Updates
    socket.on('order:statusUpdate', ({ orderId, status, order }) => {
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...order, status } : o))
      );
    });
    socket.on('order:ready', ({ orderId, tableNumber }) => {
      alert(`🔔 Bestellung für Tisch ${tableNumber} ist FERTIG!`);
    });
    socket.on('table:statusUpdate', (table) => {
      setTables((prev) => prev.map((t) => (t.id === table.id ? table : t)));
    });

    return () => {
      socket.off('order:statusUpdate');
      socket.off('order:ready');
      socket.off('table:statusUpdate');
    };
  }, []);

  // Zum Warenkorb hinzufügen
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

  // Bestellung absenden
  const submitOrder = async (target) => {
    const targetItems = cart.filter((item) => item.target === target);
    if (targetItems.length === 0) return;

    try {
      const order = await api.createOrder({
        table_id: selectedTable.id,
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
      alert(`Fehler: ${err.message}`);
    }
  };

  const submitAll = async () => {
    const targets = [...new Set(cart.map((i) => i.target))];
    for (const target of targets) {
      await submitOrder(target);
    }
    setView('tables');
    setSelectedTable(null);
  };

  const totalPrice = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse">🍽️ Lade...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            {view === 'tables' && '🪑 Tisch wählen'}
            {view === 'menu' && `📋 Tisch ${selectedTable?.number}`}
            {view === 'cart' && `🛒 Warenkorb (${cart.length})`}
            {view === 'orders' && '📊 Bestellungen'}
          </h1>
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
        </div>
      </header>

      {/* ─── TISCH-AUSWAHL ─── */}
      {view === 'tables' && (
        <div className="p-4 grid grid-cols-4 gap-2">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => { setSelectedTable(table); setView('menu'); }}
              className={`
                p-3 rounded-xl text-center transition-all active:scale-95
                ${table.status === 'free' ? 'bg-slate-700 hover:bg-slate-600' :
                  table.status === 'occupied' ? 'bg-brand-500/20 border border-brand-500/50' :
                  'bg-slate-800 opacity-50'}
              `}
            >
              <span className="text-2xl font-bold block">{table.number}</span>
              <span className="text-xs text-slate-400">{table.seats}P</span>
              {table.active_orders > 0 && (
                <span className="block text-xs text-brand-400 mt-1">{table.active_orders} Best.</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── SPEISEKARTE ─── */}
      {view === 'menu' && (
        <div className="p-4 space-y-6">
          {menu.map((category) => (
            <div key={category.category}>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                {category.icon} {category.category}
              </h2>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart({ ...item, target: category.target })}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700
                               rounded-lg p-3 transition-all active:scale-[0.98]"
                  >
                    <div className="text-left">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-brand-400 font-bold text-sm ml-2 whitespace-nowrap">
                      {item.price.toFixed(2)}€
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
                      {(item.unit_price * item.quantity).toFixed(2)}€
                    </span>
                    <button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 text-xs">✕</button>
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
                  <span className="text-brand-400">{totalPrice.toFixed(2)}€</span>
                </div>
              </div>

              <button onClick={submitAll} className="btn-primary w-full text-lg py-3">
                ✅ Bestellung absenden
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
              <OrderCard key={order.id} order={order} showActions={false} compact />
            ))
          )}
        </div>
      )}

      {/* ─── BOTTOM NAV ─── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex z-50">
        {[
          { id: 'tables', icon: '🪑', label: 'Tische' },
          { id: 'menu', icon: '📋', label: 'Karte' },
          { id: 'cart', icon: '🛒', label: 'Korb', badge: cart.length },
          { id: 'orders', icon: '📊', label: 'Status' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 py-3 text-center relative transition-colors
              ${view === tab.id ? 'text-brand-400' : 'text-slate-500'}`}
          >
            <span className="text-xl block">{tab.icon}</span>
            <span className="text-[10px] block mt-0.5">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute top-1.5 right-1/4 bg-brand-500 text-white text-[10px]
                             w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
