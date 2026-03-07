import React from 'react';

/**
 * Bezahlung-Bestätigungsdialog
 * Kein PIN, nur Bestätigung
 */
export default function PaymentModal({ tableNumber, amount, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl animate-slide-in">
        <h3 className="text-lg font-bold mb-4">Bezahlung bestätigen</h3>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-slate-300">
            <span>Tisch</span>
            <span className="font-bold text-white">{tableNumber}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Gesamt</span>
            <span className="font-bold text-2xl text-white">
              {amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost flex-1"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-success flex-1"
          >
            {loading ? 'Verarbeite...' : 'Bezahlt'}
          </button>
        </div>
      </div>
    </div>
  );
}
