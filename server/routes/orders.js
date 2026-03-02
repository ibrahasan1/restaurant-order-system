/**
 * Orders API Routes
 * POST /api/orders          - Neue Bestellung
 * GET  /api/orders           - Alle aktiven Bestellungen
 * GET  /api/orders/kitchen   - Küchen-Bestellungen
 * GET  /api/orders/bar       - Bar-Bestellungen
 * GET  /api/orders/table/:id - Bestellungen nach Tisch
 * GET  /api/orders/:id       - Einzelne Bestellung
 * PUT  /api/orders/:id/status - Status ändern
 * GET  /api/orders/today/stats - Tagesstatistiken
 */

const express = require('express');
const router = express.Router();
const OrderModel = require('../models/Order');

// Middleware: OrderModel initialisieren
router.use((req, res, next) => {
  req.orderModel = new OrderModel(req.app.locals.db);
  next();
});

// POST /api/orders - Neue Bestellung erstellen
router.post('/', (req, res, next) => {
  try {
    const { table_id, waiter_name, target, items, notes } = req.body;

    // Validierung
    if (!table_id || !target || !items || items.length === 0) {
      return res.status(400).json({
        error: 'table_id, target und mindestens ein Item sind erforderlich.',
      });
    }

    if (!['kitchen', 'bar'].includes(target)) {
      return res.status(400).json({ error: 'Target muss "kitchen" oder "bar" sein.' });
    }

    const order = req.orderModel.create({
      table_id,
      waiter_name,
      target,
      items,
      notes,
    });

    // ─── Echtzeit: Bestellung an Küche/Bar senden ────
    req.io.to(target).emit('order:new', order);
    req.io.to('admin').emit('order:new', order);
    req.io.to(`waiter`).emit('order:created', { orderId: order.id, status: 'new' });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders - Alle aktiven Bestellungen
router.get('/', (req, res, next) => {
  try {
    const orders = req.orderModel.getActive();
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/today/stats - Tagesstatistiken
router.get('/today/stats', (req, res, next) => {
  try {
    const stats = req.orderModel.getTodayStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/today - Heutige Bestellungen
router.get('/today', (req, res, next) => {
  try {
    const orders = req.orderModel.getToday();
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/kitchen - Küchen-Bestellungen
router.get('/kitchen', (req, res, next) => {
  try {
    const orders = req.orderModel.getByTarget('kitchen');
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/bar - Bar-Bestellungen
router.get('/bar', (req, res, next) => {
  try {
    const orders = req.orderModel.getByTarget('bar');
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/table/:id - Bestellungen nach Tisch
router.get('/table/:id', (req, res, next) => {
  try {
    const orders = req.orderModel.getByTable(parseInt(req.params.id));
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Einzelne Bestellung
router.get('/:id', (req, res, next) => {
  try {
    const order = req.orderModel.getById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/status - Status aktualisieren
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'in_progress', 'ready', 'served', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`,
      });
    }

    let order;
    if (status === 'served') {
      order = req.orderModel.complete(parseInt(req.params.id));
    } else if (status === 'cancelled') {
      order = req.orderModel.cancel(parseInt(req.params.id));
    } else {
      order = req.orderModel.updateStatus(parseInt(req.params.id), status);
    }

    if (!order) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden.' });
    }

    // ─── Echtzeit: Status-Update an alle senden ─────
    req.io.emit('order:statusUpdate', {
      orderId: order.id,
      status: order.status,
      order,
    });

    // Speziell an Kellner wenn "ready"
    if (status === 'ready') {
      req.io.to('waiter').emit('order:ready', {
        orderId: order.id,
        tableNumber: order.table_number,
        target: order.target,
      });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
