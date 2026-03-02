/**
 * Order Model - Bestellungs-Logik
 */

const { v4: uuidv4 } = require('uuid');

class OrderModel {
  constructor(db) {
    this.db = db;
    this._prepareStatements();
  }

  _prepareStatements() {
    this.stmts = {
      create: this.db.prepare(`
        INSERT INTO orders (order_number, table_id, waiter_name, target, notes, total_price)
        VALUES (@order_number, @table_id, @waiter_name, @target, @notes, @total_price)
      `),
      addItem: this.db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
        VALUES (@order_id, @menu_item_id, @quantity, @unit_price, @notes)
      `),
      getById: this.db.prepare(`
        SELECT o.*, t.number as table_number, t.name as table_name
        FROM orders o
        JOIN tables t ON o.table_id = t.id
        WHERE o.id = ?
      `),
      getItems: this.db.prepare(`
        SELECT oi.*, mi.name as item_name, mi.description, c.name as category_name
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN categories c ON mi.category_id = c.id
        WHERE oi.order_id = ?
      `),
      getByTarget: this.db.prepare(`
        SELECT o.*, t.number as table_number, t.name as table_name
        FROM orders o
        JOIN tables t ON o.table_id = t.id
        WHERE o.target = ? AND o.status IN ('new', 'in_progress')
        ORDER BY o.created_at ASC
      `),
      getByTable: this.db.prepare(`
        SELECT o.*, t.number as table_number
        FROM orders o
        JOIN tables t ON o.table_id = t.id
        WHERE o.table_id = ? AND o.status NOT IN ('served', 'cancelled')
        ORDER BY o.created_at DESC
      `),
      getActive: this.db.prepare(`
        SELECT o.*, t.number as table_number, t.name as table_name
        FROM orders o
        JOIN tables t ON o.table_id = t.id
        WHERE o.status IN ('new', 'in_progress', 'ready')
        ORDER BY o.created_at ASC
      `),
      updateStatus: this.db.prepare(`
        UPDATE orders SET status = @status, updated_at = datetime('now', 'localtime')
        WHERE id = @id
      `),
      updateItemStatus: this.db.prepare(`
        UPDATE order_items SET status = @status WHERE id = @id
      `),
      complete: this.db.prepare(`
        UPDATE orders SET status = 'served', completed_at = datetime('now', 'localtime'),
        updated_at = datetime('now', 'localtime') WHERE id = ?
      `),
      cancel: this.db.prepare(`
        UPDATE orders SET status = 'cancelled', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `),
      getToday: this.db.prepare(`
        SELECT o.*, t.number as table_number
        FROM orders o
        JOIN tables t ON o.table_id = t.id
        WHERE date(o.created_at) = date('now', 'localtime')
        ORDER BY o.created_at DESC
      `),
      getTodayStats: this.db.prepare(`
        SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total_price), 0) as total_revenue,
          COUNT(CASE WHEN status = 'served' THEN 1 END) as served_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
          COUNT(CASE WHEN status IN ('new', 'in_progress') THEN 1 END) as pending_count
        FROM orders
        WHERE date(created_at) = date('now', 'localtime')
      `),
    };
  }

  /**
   * Neue Bestellung erstellen
   */
  create(orderData) {
    const createOrder = this.db.transaction((data) => {
      const orderNumber = this._generateOrderNumber();
      const totalPrice = data.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity, 0
      );

      const result = this.stmts.create.run({
        order_number: orderNumber,
        table_id: data.table_id,
        waiter_name: data.waiter_name || null,
        target: data.target,
        notes: data.notes || null,
        total_price: totalPrice,
      });

      const orderId = result.lastInsertRowid;

      // Positionen hinzufügen
      for (const item of data.items) {
        this.stmts.addItem.run({
          order_id: orderId,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || null,
        });
      }

      return this.getById(orderId);
    });

    return createOrder(orderData);
  }

  /**
   * Bestellung mit allen Details holen
   */
  getById(id) {
    const order = this.stmts.getById.get(id);
    if (!order) return null;
    order.items = this.stmts.getItems.all(id);
    return order;
  }

  /**
   * Bestellungen nach Ziel (kitchen/bar)
   */
  getByTarget(target) {
    const orders = this.stmts.getByTarget.all(target);
    return orders.map((order) => {
      order.items = this.stmts.getItems.all(order.id);
      return order;
    });
  }

  /**
   * Bestellungen nach Tisch
   */
  getByTable(tableId) {
    const orders = this.stmts.getByTable.all(tableId);
    return orders.map((order) => {
      order.items = this.stmts.getItems.all(order.id);
      return order;
    });
  }

  /**
   * Alle aktiven Bestellungen
   */
  getActive() {
    const orders = this.stmts.getActive.all();
    return orders.map((order) => {
      order.items = this.stmts.getItems.all(order.id);
      return order;
    });
  }

  /**
   * Status aktualisieren
   */
  updateStatus(id, status) {
    this.stmts.updateStatus.run({ id, status });
    return this.getById(id);
  }

  /**
   * Einzelne Position Status aktualisieren
   */
  updateItemStatus(itemId, status) {
    this.stmts.updateItemStatus.run({ id: itemId, status });
  }

  /**
   * Bestellung als serviert markieren
   */
  complete(id) {
    this.stmts.complete.run(id);
    return this.getById(id);
  }

  /**
   * Bestellung stornieren
   */
  cancel(id) {
    this.stmts.cancel.run(id);
    return this.getById(id);
  }

  /**
   * Heutige Bestellungen
   */
  getToday() {
    const orders = this.stmts.getToday.all();
    return orders.map((order) => {
      order.items = this.stmts.getItems.all(order.id);
      return order;
    });
  }

  /**
   * Tagesstatistiken
   */
  getTodayStats() {
    return this.stmts.getTodayStats.get();
  }

  /**
   * Bestellnummer generieren (Format: YYYYMMDD-XXXX)
   */
  _generateOrderNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.db.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now', 'localtime')`
    ).get().count;
    return `${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}

module.exports = OrderModel;
