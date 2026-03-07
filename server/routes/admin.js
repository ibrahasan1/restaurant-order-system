/**
 * Admin API Routes
 * GET  /api/admin/revenue           - Alle Geräte-Umsätze
 * POST /api/admin/revenue/reset     - Umsatz eines Geräts zurücksetzen
 * POST /api/admin/revenue/reset-all - Alle Umsätze zurücksetzen
 * GET  /api/admin/devices/:id/receipts - Belege eines Geräts
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');

// Middleware: DeviceModel initialisieren
router.use((req, res, next) => {
  req.deviceModel = new DeviceModel(req.app.locals.db);
  next();
});

// GET /api/admin/revenue - Alle Geräte-Umsätze für einen Tag
router.get('/revenue', (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = req.deviceModel.getAllRevenue(date);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/revenue/reset - Umsatz eines Geräts zurücksetzen
router.post('/revenue/reset', (req, res, next) => {
  try {
    const { deviceId, date } = req.body;

    if (!deviceId || !date) {
      return res.status(400).json({ error: 'deviceId und date sind erforderlich.' });
    }

    const result = req.deviceModel.resetDeviceRevenue(deviceId, date);
    if (!result) {
      return res.status(404).json({ error: 'Gerät nicht gefunden.' });
    }

    // Aktualisierte Umsätze an Admin senden
    const updatedRevenue = req.deviceModel.getAllRevenue(date);
    req.io.to('admin').emit('admin:revenue:updated', updatedRevenue);

    // Reset-Event an das betroffene Gerät senden
    const device = req.deviceModel.getById(deviceId);
    req.io.emit('revenue:reset', {
      deviceId,
      device_name: device.device_name,
      message: 'Tagesumsatz wurde zurückgesetzt',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/revenue/reset-all - Alle Umsätze zurücksetzen
router.post('/revenue/reset-all', (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date ist erforderlich.' });
    }

    const result = req.deviceModel.resetAllRevenue(date);

    // Aktualisierte Umsätze an Admin senden
    const updatedRevenue = req.deviceModel.getAllRevenue(date);
    req.io.to('admin').emit('admin:revenue:updated', updatedRevenue);

    // Reset-Event an alle Kellner
    req.io.to('waiter').emit('revenue:reset', {
      deviceId: null,
      device_name: 'Alle',
      message: 'Alle Tagesumsätze wurden zurückgesetzt',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/devices/:id/receipts - Belege eines Geräts
router.get('/devices/:id/receipts', (req, res, next) => {
  try {
    const deviceId = parseInt(req.params.id);
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const result = req.deviceModel.getDeviceReceipts(deviceId, date);
    if (!result) {
      return res.status(404).json({ error: 'Gerät nicht gefunden.' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
