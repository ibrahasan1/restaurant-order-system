import React, { useState } from 'react';
import { api } from '../utils/api';

/**
 * Geräte-Login per 4-stelligem PIN
 * Ersetzt die alte RoleSelect-Komponente
 */
export default function DeviceLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto-Submit bei 4 Ziffern
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const submitPin = async (currentPin) => {
    setLoading(true);
    try {
      const device = await api.loginDevice(currentPin);
      onLogin(device);
    } catch (err) {
      setError(err.message || 'Ungültiger PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Restaurant OS</h1>
          <p className="text-slate-400">PIN eingeben</p>
        </div>

        {/* PIN-Anzeige */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                i < pin.length
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              {i < pin.length ? '\u2022' : ''}
            </div>
          ))}
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div className="text-center text-red-400 text-sm mb-4 animate-slide-in">
            {error}
          </div>
        )}

        {/* Ziffernblock */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(String(digit))}
              disabled={loading}
              className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700
                         text-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            disabled={loading}
            className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700
                       text-xl font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || pin.length === 0}
            className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700
                       text-lg transition-all active:scale-95 disabled:opacity-30"
          >
            &larr;
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-slate-400 text-sm mt-6 animate-pulse">
            Anmeldung...
          </div>
        )}
      </div>
    </div>
  );
}
