/**
 * Socket.IO Client-Konfiguration
 * Zentrale WebSocket-Verbindung mit Auto-Reconnect
 */

import { io } from 'socket.io-client';

// Server-URL: In Produktion gleicher Host, in Dev via Proxy
const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3000';

// Socket-Instanz (Singleton)
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Manuell verbinden nach Rollenauswahl
  reconnection: true,
  reconnectionAttempts: Infinity, // Nie aufhören zu versuchen
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  transports: ['websocket', 'polling'], // WebSocket bevorzugt
});

/**
 * Verbindung herstellen und Gerät registrieren
 */
export function connectSocket(role, name) {
  if (!socket.connected) {
    socket.connect();
  }

  socket.on('connect', () => {
    socket.emit('device:register', {
      role,
      name: name || `${role}-${navigator.userAgent.slice(0, 20)}`,
      deviceId: getDeviceId(),
    });
  });

  // Sofort registrieren wenn schon verbunden
  if (socket.connected) {
    socket.emit('device:register', {
      role,
      name: name || `${role}-${navigator.userAgent.slice(0, 20)}`,
      deviceId: getDeviceId(),
    });
  }
}

/**
 * Verbindung trennen
 */
export function disconnectSocket() {
  socket.disconnect();
}

/**
 * Stabile Geräte-ID generieren/laden
 */
function getDeviceId() {
  let id = localStorage.getItem('ros_device_id');
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('ros_device_id', id);
  }
  return id;
}

/**
 * Sound abspielen (für Benachrichtigungen)
 */
export function playNotificationSound(type = 'newOrder') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'newOrder') {
      // Zwei aufsteigende Töne
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else if (type === 'orderReady') {
      // Fröhlicher Dreiklang
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    } else if (type === 'orderCancelled') {
      // Absteigender Ton
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(220, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn('Audio nicht verfügbar:', e);
  }
}

export default socket;
