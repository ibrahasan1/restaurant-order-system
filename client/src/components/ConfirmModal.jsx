import React from 'react';

/**
 * Bestätigungs-Dialog (z.B. für Umsatz-Reset)
 */
export default function ConfirmModal({ title, message, confirmLabel = 'Bestätigen', confirmClass = 'btn-danger', onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl animate-slide-in">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>

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
            className={`${confirmClass} flex-1`}
          >
            {loading ? 'Bitte warten...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
