import React, { useEffect, useState } from 'react';

/**
 * Toast-Benachrichtigung
 * Dezent, unten rechts, 3 Sekunden sichtbar
 */
export default function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const typeStyles = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-slate-700 border-slate-600',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm px-4 py-3 rounded-lg border shadow-xl
                  text-sm font-medium text-white transition-all duration-300
                  ${typeStyles[type] || typeStyles.info}
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {message}
    </div>
  );
}

/**
 * Hook für Toast-Verwaltung
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ bottom: `${24 + index * 60}px` }} className="fixed right-6 z-[100]">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
