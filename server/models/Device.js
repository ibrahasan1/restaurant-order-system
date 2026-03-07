/**
 * Device Model - Geräte-Profile, Umsatz-Tracking, Belege
 */

class DeviceModel {
  constructor(db) {
    this.db = db;
    this._prepareStatements();
  }

  _prepareStatements() {
    this.stmts = {
      // ─── Geräte ──────────────────────────────
      getAll: this.db.prepare(`
        SELECT id, device_name, role, is_active, created_at FROM devices
        WHERE is_active = 1 ORDER BY id
      `),
      getById: this.db.prepare(`
        SELECT id, device_name, role, is_active, created_at FROM devices
        WHERE id = ?
      `),
      authenticateByPin: this.db.prepare(`
        SELECT id, device_name, role, is_active FROM devices
        WHERE pin = ? AND is_active = 1
      `),

      // ─── Umsatz ──────────────────────────────
      addRevenue: this.db.prepare(`
        INSERT INTO device_revenue (device_id, order_id, amount, date)
        VALUES (@device_id, @order_id, @amount, @date)
      `),
      getDeviceRevenue: this.db.prepare(`
        SELECT
          COALESCE(SUM(dr.amount), 0) as total_revenue,
          COUNT(dr.id) as order_count
        FROM device_revenue dr
        WHERE dr.device_id = ? AND dr.date = ?
      `),
      getAllRevenue: this.db.prepare(`
        SELECT
          d.id, d.device_name,
          COALESCE(SUM(dr.amount), 0) as total_revenue,
          COUNT(dr.id) as order_count
        FROM devices d
        LEFT JOIN device_revenue dr ON d.id = dr.device_id AND dr.date = ?
        WHERE d.role = 'waiter' AND d.is_active = 1
        GROUP BY d.id
        ORDER BY d.id
      `),
      resetDeviceRevenue: this.db.prepare(`
        DELETE FROM device_revenue WHERE device_id = ? AND date = ?
      `),
      resetAllRevenue: this.db.prepare(`
        DELETE FROM device_revenue WHERE date = ?
      `),
      getLastPayment: this.db.prepare(`
        SELECT r.table_number, r.total_amount, r.created_at
        FROM receipts r
        WHERE r.device_id = ? AND date(r.created_at) = ?
        ORDER BY r.created_at DESC LIMIT 1
      `),

      // ─── Belege ──────────────────────────────
      addReceipt: this.db.prepare(`
        INSERT INTO receipts (device_id, order_id, table_number, items_json, total_amount, payment_type)
        VALUES (@device_id, @order_id, @table_number, @items_json, @total_amount, @payment_type)
      `),
      getDeviceReceipts: this.db.prepare(`
        SELECT * FROM receipts
        WHERE device_id = ? AND date(created_at) = ?
        ORDER BY created_at DESC
      `),
    };
  }

  // ─── Authentifizierung ──────────────────────────

  /**
   * Gerät per PIN authentifizieren
   */
  authenticateByPin(pin) {
    return this.stmts.authenticateByPin.get(pin);
  }

  /**
   * Alle aktiven Geräte
   */
  getAll() {
    return this.stmts.getAll.all();
  }

  /**
   * Einzelnes Gerät per ID
   */
  getById(id) {
    return this.stmts.getById.get(id);
  }

  // ─── Umsatz-Tracking ───────────────────────────

  /**
   * Umsatz für ein Gerät an einem Tag
   */
  getDeviceRevenue(deviceId, date) {
    const device = this.stmts.getById.get(deviceId);
    if (!device) return null;

    const revenue = this.stmts.getDeviceRevenue.get(deviceId, date);
    const lastPayment = this.stmts.getLastPayment.get(deviceId, date);

    return {
      device_name: device.device_name,
      date,
      total_revenue: revenue.total_revenue,
      order_count: revenue.order_count,
      last_payment: lastPayment ? {
        table: lastPayment.table_number,
        amount: lastPayment.total_amount,
        time: new Date(lastPayment.created_at).toLocaleTimeString('de-DE', {
          hour: '2-digit', minute: '2-digit'
        }),
      } : null,
    };
  }

  /**
   * Alle Geräte-Umsätze für einen Tag (Admin)
   */
  getAllRevenue(date) {
    const devices = this.stmts.getAllRevenue.all(date);
    const grandTotal = devices.reduce((sum, d) => sum + d.total_revenue, 0);
    const totalOrders = devices.reduce((sum, d) => sum + d.order_count, 0);

    return {
      date,
      devices,
      grand_total: grandTotal,
      total_orders: totalOrders,
    };
  }

  /**
   * Umsatz für ein Gerät zurücksetzen
   */
  resetDeviceRevenue(deviceId, date) {
    const device = this.stmts.getById.get(deviceId);
    if (!device) return null;

    this.stmts.resetDeviceRevenue.run(deviceId, date);
    return { success: true, message: `Umsatz für ${device.device_name} zurückgesetzt` };
  }

  /**
   * Umsatz für alle Geräte zurücksetzen
   */
  resetAllRevenue(date) {
    this.stmts.resetAllRevenue.run(date);
    return { success: true, message: `Alle Umsätze für ${date} zurückgesetzt` };
  }

  // ─── Bezahlung & Belege ─────────────────────────

  /**
   * Bezahlung verarbeiten: Receipt + Revenue in einer Transaktion
   */
  processPayment(data) {
    const process = this.db.transaction((d) => {
      // Receipt erstellen
      const receiptResult = this.stmts.addReceipt.run({
        device_id: d.deviceId,
        order_id: d.orderId,
        table_number: d.tableNumber,
        items_json: JSON.stringify(d.items),
        total_amount: d.totalAmount,
        payment_type: d.paymentType,
      });

      // Revenue-Eintrag
      const today = new Date().toISOString().slice(0, 10);
      this.stmts.addRevenue.run({
        device_id: d.deviceId,
        order_id: d.orderId,
        amount: d.totalAmount,
        date: today,
      });

      return {
        receiptId: receiptResult.lastInsertRowid,
        amount: d.totalAmount,
      };
    });

    return process(data);
  }

  /**
   * Belege für ein Gerät an einem Tag
   */
  getDeviceReceipts(deviceId, date) {
    const device = this.stmts.getById.get(deviceId);
    if (!device) return null;

    const receipts = this.stmts.getDeviceReceipts.all(deviceId, date);
    return {
      device_name: device.device_name,
      date,
      receipts: receipts.map((r) => ({
        id: r.id,
        table_number: r.table_number,
        items: JSON.parse(r.items_json),
        total_amount: r.total_amount,
        payment_type: r.payment_type,
        created_at: r.created_at,
      })),
    };
  }
}

module.exports = DeviceModel;
