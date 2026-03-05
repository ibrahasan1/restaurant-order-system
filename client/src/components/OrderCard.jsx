import React from 'react';

const STATUS_CONFIG = {
  new: { label: 'Neu', class: 'status-new', cardClass: 'order-card-new' },
  in_progress: { label: 'In Arbeit', class: 'status-in-progress', cardClass: 'order-card-in-progress' },
  ready: { label: 'Fertig!', class: 'status-ready', cardClass: 'order-card-ready' },
  served: { label: 'Serviert', class: 'status-served', cardClass: '' },
  cancelled: { label: 'Storniert', class: 'status-cancelled', cardClass: '' },
};

/**
 * Bestellungs-Karte (wiederverwendbar für Küche, Bar, Kellner)
 */
export default function OrderCard({ order, onStatusChange, showActions = true, compact = false }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
  const elapsed = getElapsedTime(order.created_at);

  return (
    <div className={`order-card ${config.cardClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-lg font-bold text-white">
            Tisch {order.table_number}
          </span>
          <span className="text-xs text-slate-400 ml-2">#{order.order_number}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-badge ${config.class}`}>{config.label}</span>
          <span className="text-xs text-slate-500">{elapsed}</span>
        </div>
      </div>

      {/* Bestellpositionen */}
      <div className="space-y-1.5 mb-3">
        {order.items?.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-brand-400 font-bold min-w-[24px]">{item.quantity}×</span>
            <div className="flex-1">
              <span className={`text-sm ${compact ? '' : 'text-base'} text-slate-200`}>
                {item.item_name || item.name}
              </span>
              {item.notes && (
                <p className="text-xs text-yellow-400 mt-0.5">⚠️ {item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notizen */}
      {order.notes && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3">
          <p className="text-xs text-yellow-300">📝 {order.notes}</p>
        </div>
      )}

      {/* Kellner-Info */}
      {order.waiter_name && (
        <p className="text-xs text-slate-500 mb-2">Kellner: {order.waiter_name}</p>
      )}

      {/* Aktions-Buttons */}
      {showActions && onStatusChange && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
          {order.status === 'new' && (
            <button
              onClick={() => onStatusChange(order.id, 'in_progress')}
              className="btn-primary flex-1 text-sm"
            >
              🔥 Starten
            </button>
          )}
          {order.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(order.id, 'ready')}
              className="btn-success flex-1 text-sm"
            >
              ✅ Fertig
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={() => onStatusChange(order.id, 'served')}
              className="btn-ghost flex-1 text-sm"
            >
              🍽️ Serviert
            </button>
          )}
          {['new', 'in_progress'].includes(order.status) && (
            <button
              onClick={() => {
                if (confirm('Bestellung wirklich stornieren?')) {
                  onStatusChange(order.id, 'cancelled');
                }
              }}
              className="btn-danger text-sm px-3"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Vergangene Zeit formatieren
 */
function getElapsedTime(createdAt) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}
