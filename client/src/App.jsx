import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from './utils/socket';

// Views
import WaiterView from './views/WaiterView/WaiterView';
import KitchenView from './views/KitchenView/KitchenView';
import BarView from './views/BarView/BarView';
import AdminView from './views/AdminView/AdminView';
import DeviceLogin from './components/DeviceLogin';

/**
 * Haupt-App mit Geräte-basiertem Login und rollenbasiertem Routing
 * Login per PIN → Gerät wird identifiziert → Rolle bestimmt die View
 */
export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState(() => {
    try {
      const saved = localStorage.getItem('ros_device');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const role = device?.role || null;

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Verbindung herstellen wenn Gerät eingeloggt
    if (device) {
      connectSocket(device.role, device.device_name, device.id);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [device]);

  const handleLogin = (deviceData) => {
    localStorage.setItem('ros_device', JSON.stringify(deviceData));
    // Alte Werte aufräumen
    localStorage.removeItem('ros_role');
    setDevice(deviceData);
  };

  const handleLogout = () => {
    localStorage.removeItem('ros_device');
    localStorage.removeItem('ros_role');
    disconnectSocket();
    setDevice(null);
  };

  return (
    <div className="min-h-screen">
      {/* Verbindungsstatus-Anzeige */}
      {device && !isConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm font-medium animate-pulse">
          Keine Verbindung zum Server
        </div>
      )}

      <Routes>
        {/* Login */}
        <Route
          path="/"
          element={
            device ? <Navigate to={`/${role}`} replace /> : <DeviceLogin onLogin={handleLogin} />
          }
        />

        {/* Kellner (Handy) */}
        <Route
          path="/waiter/*"
          element={
            device && role === 'waiter'
              ? <WaiterView device={device} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Küche (Tablet) */}
        <Route
          path="/kitchen"
          element={
            device && role === 'kitchen'
              ? <KitchenView device={device} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Bar (Tablet) */}
        <Route
          path="/bar"
          element={
            device && role === 'bar'
              ? <BarView device={device} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Admin (PC) */}
        <Route
          path="/admin/*"
          element={
            device && role === 'admin'
              ? <AdminView device={device} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
