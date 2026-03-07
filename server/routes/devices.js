/**
 * Devices API Routes
 * POST /api/devices/login       - PIN-Login
 * GET  /api/devices              - Alle aktiven Geräte
 * GET  /api/devices/:id/revenue  - Tagesumsatz eines Geräts
 * GET  /api/devices/:id/receipts - Belege eines Geräts
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');

// Middleware: DeviceModel initialisieren
router.use((req, res, next) => {
  req.deviceModel = new DeviceModel(req.app.locals.db);
  next();
});

// POST /api/devices/login - PIN-Login
router.post('/login', (req, res, next) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: 'PIN muss 4-stellig sein.' });
    }

    const device = req.deviceModel.authenticateByPin(pin);
    if (!device) {
      return res.status(401).json({ error: 'Ungültiger PIN.' });
    }

    if (!device.is_active) {
      return res.status(403).json({ error: 'Gerät ist deaktiviert.' });
    }

    res.json(device);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices - Alle aktiven Geräte
router.get('/', (req, res, next) => {
  try {
    const devices = req.deviceModel.getAll();
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/revenue - Tagesumsatz
router.get('/:id/revenue', (req, res, next) => {
  try {
    const deviceId = parseInt(req.params.id);
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const revenue = req.deviceModel.getDeviceRevenue(deviceId, date);
    if (!revenue) {
      return res.status(404).json({ error: 'Gerät nicht gefunden.' });
    }

    res.json(revenue);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/receipts - Belege
router.get('/:id/receipts', (req, res, next) => {
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
