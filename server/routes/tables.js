/**
 * Tables API Routes
 */

const express = require('express');
const router = express.Router();
const TableModel = require('../models/Table');

router.use((req, res, next) => {
  req.tableModel = new TableModel(req.app.locals.db);
  next();
});

// GET /api/tables - Alle Tische (mit aktiven Bestellungen)
router.get('/', (req, res, next) => {
  try {
    const tables = req.tableModel.getAllWithOrders();
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

// GET /api/tables/:id
router.get('/:id', (req, res, next) => {
  try {
    const table = req.tableModel.getById(parseInt(req.params.id));
    if (!table) return res.status(404).json({ error: 'Tisch nicht gefunden.' });
    res.json(table);
  } catch (error) {
    next(error);
  }
});

// POST /api/tables
router.post('/', (req, res, next) => {
  try {
    const { number, name, seats, zone } = req.body;
    if (!number) return res.status(400).json({ error: 'Tischnummer ist erforderlich.' });
    const table = req.tableModel.create({ number, name, seats, zone });
    req.io.emit('table:created', table);
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tables/:id/status
router.put('/:id/status', (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['free', 'occupied', 'reserved', 'blocked'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status muss sein: ${valid.join(', ')}` });
    }
    const table = req.tableModel.updateStatus(parseInt(req.params.id), status);
    req.io.emit('table:statusUpdate', table);
    res.json(table);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
