/**
 * Menu API Routes
 * GET  /api/menu              - Komplette Speisekarte (gruppiert)
 * GET  /api/menu/categories   - Alle Kategorien
 * GET  /api/menu/search       - Suche
 * GET  /api/menu/:id          - Einzelnes Item
 * POST /api/menu/categories   - Kategorie erstellen
 * POST /api/menu/items        - Item erstellen
 * PUT  /api/menu/items/:id    - Item aktualisieren
 * PUT  /api/menu/items/:id/toggle - Verfügbarkeit umschalten
 */

const express = require('express');
const router = express.Router();
const MenuModel = require('../models/Menu');

router.use((req, res, next) => {
  req.menuModel = new MenuModel(req.app.locals.db);
  next();
});

// GET /api/menu - Komplette Speisekarte
router.get('/', (req, res, next) => {
  try {
    const includeUnavailable = req.query.all === 'true';
    const menu = req.menuModel.getAll(includeUnavailable);
    res.json(menu);
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/categories
router.get('/categories', (req, res, next) => {
  try {
    const categories = req.menuModel.getCategories(req.query.all === 'true');
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/search?q=...
router.get('/search', (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Suchbegriff muss mindestens 2 Zeichen haben.' });
    }
    const results = req.menuModel.search(q);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/:id
router.get('/:id', (req, res, next) => {
  try {
    const item = req.menuModel.getById(parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: 'Menü-Item nicht gefunden.' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// POST /api/menu/categories
router.post('/categories', (req, res, next) => {
  try {
    const { name, target, sort_order, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name ist erforderlich.' });
    const category = req.menuModel.createCategory({ name, target, sort_order, icon });
    req.io.emit('menu:updated');
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// POST /api/menu/items
router.post('/items', (req, res, next) => {
  try {
    const { category_id, name, price } = req.body;
    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'category_id, name und price sind erforderlich.' });
    }
    const item = req.menuModel.createItem(req.body);
    req.io.emit('menu:updated');
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// PUT /api/menu/items/:id
router.put('/items/:id', (req, res, next) => {
  try {
    const item = req.menuModel.updateItem(parseInt(req.params.id), req.body);
    req.io.emit('menu:updated');
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// PUT /api/menu/items/:id/toggle - Verfügbarkeit umschalten
router.put('/items/:id/toggle', (req, res, next) => {
  try {
    const item = req.menuModel.toggleAvailability(parseInt(req.params.id));
    req.io.emit('menu:updated');
    req.io.emit('menu:itemToggled', {
      itemId: item.id,
      name: item.name,
      is_available: item.is_available,
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
