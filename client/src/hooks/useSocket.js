/**
 * useSocket Hook - Socket.IO Events in React
 */

import { useEffect, useState, useCallback } from 'react';
import { socket, playNotificationSound } from '../utils/socket';

/**
 * Hook für Echtzeit-Bestellungen
 * @param {string} target - 'kitchen' | 'bar' | null (alle)
 */
export function useOrders(target = null) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initiale Bestellungen laden
  useEffect(() => {
    socket.emit('orders:getActive', { target });
    setLoading(true);

    const handleActiveOrders = (data) => {
      setOrders(data);
      setLoading(false);
    };

    const handleNewOrder = (order) => {
      if (!target || order.target === target) {
        setOrders((prev) => [...prev, order]);
        playNotificationSound('newOrder');
      }
    };

    const handleStatusUpdate = ({ orderId, status, order }) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === orderId ? { ...o, ...order, status } : o))
          .filter((o) => !['served', 'cancelled'].includes(o.status))
      );
    };

    const handleCancelled = ({ orderId }) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      playNotificationSound('orderCancelled');
    };

    socket.on('orders:active', handleActiveOrders);
    socket.on('order:new', handleNewOrder);
    socket.on('order:statusUpdate', handleStatusUpdate);
    socket.on('order:cancelled', handleCancelled);

    return () => {
      socket.off('orders:active', handleActiveOrders);
      socket.off('order:new', handleNewOrder);
      socket.off('order:statusUpdate', handleStatusUpdate);
      socket.off('order:cancelled', handleCancelled);
    };
  }, [target]);

  return { orders, loading };
}

/**
 * Hook für Verbindungsstatus
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onPong = ({ timestamp }) => setLatency(Date.now() - timestamp);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('pong', onPong);

    // Ping alle 10 Sekunden
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 10000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong', onPong);
      clearInterval(interval);
    };
  }, []);

  return { isConnected, latency };
}

/**
 * Hook für Sound-Events
 */
export function useSoundNotifications() {
  useEffect(() => {
    const handleSound = ({ type }) => {
      playNotificationSound(type);
    };

    socket.on('sound:play', handleSound);
    return () => socket.off('sound:play', handleSound);
  }, []);
}
