import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from './utils/socket';

// Views
import WaiterView from './views/WaiterView/WaiterView';
import KitchenView from './views/KitchenView/KitchenView';
import BarView from './views/BarView/BarView';
import AdminView from './views/AdminView/AdminView';
import RoleSelect from './components/RoleSelect';

/**
 * Haupt-App mit rollenbasiertem Routing
 * /waiter  → Kellner-Interface (Handy)
 * /kitchen → Küchen-Display (Tablet)
 * /bar     → Bar-Display (Tablet)
 * /admin   → Admin-Panel (PC)
 */
export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [role, setRole] = useState(() => localStorage.getItem('ros_role') || null);

  useEffect(() => {
    // Socket-Events für Verbindungsstatus
    function onConnect() {
      setIsConnected(true);
      console.log('✅ Verbunden mit Server');
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('❌ Verbindung getrennt');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Verbindung herstellen wenn Rolle gesetzt
    if (role) {
      connectSocket(role);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [role]);

  const handleRoleSelect = (selectedRole) => {
    localStorage.setItem('ros_role', selectedRole);
    setRole(selectedRole);
    connectSocket(selectedRole);
  };

  return (
    <div className="min-h-screen">
      {/* Verbindungsstatus-Anzeige */}
      {role && !isConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm font-medium animate-pulse">
          ⚠️ Keine Verbindung zum Server – Versuche erneut...
        </div>
      )}

      <Routes>
        {/* Rollenauswahl */}
        <Route
          path="/"
          element={
            role ? <Navigate to={`/${role}`} replace /> : <RoleSelect onSelect={handleRoleSelect} />
          }
        />

        {/* Kellner (Handy) */}
        <Route path="/waiter/*" element={<WaiterView />} />

        {/* Küche (Tablet) */}
        <Route path="/kitchen" element={<KitchenView />} />

        {/* Bar (Tablet) */}
        <Route path="/bar" element={<BarView />} />

        {/* Admin (PC) */}
        <Route path="/admin/*" element={<AdminView />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
