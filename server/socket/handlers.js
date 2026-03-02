/**
 * Socket.IO Event Handler
 * Echtzeit-Kommunikation zwischen Kellner, Küche, Bar und Admin
 *
 * Rooms:
 *   - 'waiter'  → Alle Kellner-Geräte
 *   - 'kitchen' → Alle Küchen-Tablets
 *   - 'bar'     → Alle Bar-Tablets
 *   - 'admin'   → Admin-Interfaces
 *
 * Events (Client → Server):
 *   - device:register    → Gerät anmelden
 *   - order:create       → Bestellung aufgeben
 *   - order:updateStatus → Status ändern
 *   - order:cancel       → Bestellung stornieren
 *   - ping               → Heartbeat
 *
 * Events (Server → Client):
 *   - order:new          → Neue Bestellung (an Küche/Bar)
 *   - order:statusUpdate → Status-Update (an alle)
 *   - order:ready        → Bestellung fertig (an Kellner)
 *   - order:cancelled    → Stornierung (an alle)
 *   - device:list        → Aktuelle Geräteliste
 *   - connection:count   → Verbindungszähler
 *   - server:shutdown    → Server fährt herunter
 */

const OrderModel = require('../models/Order');

function setupSocketHandlers(io, db) {
  const orderModel = new OrderModel(db);

  // Verbundene Geräte tracken
  const connectedDevices = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Neue Verbindung: ${socket.id}`);

    // ─── Gerät registrieren ──────────────────────────
    socket.on('device:register', (data) => {
      const { role, name, deviceId } = data;

      if (!['waiter', 'kitchen', 'bar', 'admin'].includes(role)) {
        socket.emit('error', { message: 'Ungültige Rolle.' });
        return;
      }

      // Socket zu Raum hinzufügen
      socket.join(role);
      socket.role = role;
      socket.deviceName = name || `${role}-${socket.id.slice(0, 6)}`;
      socket.deviceId = deviceId || socket.id;

      // Gerät tracken
      connectedDevices.set(socket.id, {
        id: socket.id,
        deviceId: socket.deviceId,
        name: socket.deviceName,
        role,
        connectedAt: new Date().toISOString(),
      });

      console.log(`📱 Gerät registriert: ${socket.deviceName} (${role})`);

      // Bestätigung senden
      socket.emit('device:registered', {
        id: socket.id,
        role,
        name: socket.deviceName,
      });

      // Aktualisierte Geräteliste an Admin senden
      broadcastDeviceList(io, connectedDevices);
    });

    // ─── Neue Bestellung ─────────────────────────────
    socket.on('order:create', (data) => {
      try {
        const order = orderModel.create({
          table_id: data.table_id,
          waiter_name: socket.deviceName,
          target: data.target,
          items: data.items,
          notes: data.notes,
        });

        console.log(`📝 Neue Bestellung #${order.order_number} → ${data.target}`);

        // An das richtige Ziel senden
        io.to(data.target).emit('order:new', order);
        io.to('admin').emit('order:new', order);

        // Bestätigung an Kellner
        socket.emit('order:created', {
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'new',
        });

        // Sound-Trigger
        io.to(data.target).emit('sound:play', { type: 'newOrder' });
      } catch (error) {
        console.error('❌ Fehler beim Erstellen der Bestellung:', error);
        socket.emit('order:error', { message: 'Bestellung konnte nicht erstellt werden.' });
      }
    });

    // ─── Status aktualisieren ────────────────────────
    socket.on('order:updateStatus', (data) => {
      try {
        const { orderId, status } = data;
        let order;

        if (status === 'served') {
          order = orderModel.complete(orderId);
        } else if (status === 'cancelled') {
          order = orderModel.cancel(orderId);
        } else {
          order = orderModel.updateStatus(orderId, status);
        }

        if (!order) {
          socket.emit('order:error', { message: 'Bestellung nicht gefunden.' });
          return;
        }

        console.log(`🔄 Bestellung #${order.order_number}: ${status}`);

        // Status-Update an alle
        io.emit('order:statusUpdate', {
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status,
          order,
        });

        // Wenn fertig → Kellner benachrichtigen mit Sound
        if (status === 'ready') {
          io.to('waiter').emit('order:ready', {
            orderId: order.id,
            orderNumber: order.order_number,
            tableNumber: order.table_number,
            target: order.target,
          });
          io.to('waiter').emit('sound:play', { type: 'orderReady' });
        }
      } catch (error) {
        console.error('❌ Fehler beim Status-Update:', error);
        socket.emit('order:error', { message: 'Status konnte nicht aktualisiert werden.' });
      }
    });

    // ─── Bestellung stornieren ───────────────────────
    socket.on('order:cancel', (data) => {
      try {
        const order = orderModel.cancel(data.orderId);
        if (order) {
          io.emit('order:cancelled', {
            orderId: order.id,
            orderNumber: order.order_number,
            tableNumber: order.table_number,
          });
          io.to(order.target).emit('sound:play', { type: 'orderCancelled' });
        }
      } catch (error) {
        console.error('❌ Fehler beim Stornieren:', error);
      }
    });

    // ─── Heartbeat / Ping ────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ─── Aktive Bestellungen anfordern ───────────────
    socket.on('orders:getActive', (data) => {
      try {
        let orders;
        if (data && data.target) {
          orders = orderModel.getByTarget(data.target);
        } else {
          orders = orderModel.getActive();
        }
        socket.emit('orders:active', orders);
      } catch (error) {
        console.error('❌ Fehler beim Laden der Bestellungen:', error);
      }
    });

    // ─── Verbindung getrennt ─────────────────────────
    socket.on('disconnect', (reason) => {
      const device = connectedDevices.get(socket.id);
      if (device) {
        console.log(`❌ Verbindung getrennt: ${device.name} (${reason})`);
        connectedDevices.delete(socket.id);
        broadcastDeviceList(io, connectedDevices);
      }
    });

    // ─── Verbindungsfehler ───────────────────────────
    socket.on('error', (error) => {
      console.error(`⚠️ Socket-Fehler (${socket.id}):`, error);
    });
  });

  // ─── Periodischer Verbindungs-Check (30s) ──────────
  setInterval(() => {
    const count = io.engine.clientsCount;
    io.to('admin').emit('connection:count', {
      total: count,
      devices: Array.from(connectedDevices.values()),
    });
  }, 30000);
}

/**
 * Geräteliste an Admin senden
 */
function broadcastDeviceList(io, connectedDevices) {
  io.to('admin').emit('device:list', {
    devices: Array.from(connectedDevices.values()),
    count: connectedDevices.size,
  });
}

module.exports = { setupSocketHandlers };
