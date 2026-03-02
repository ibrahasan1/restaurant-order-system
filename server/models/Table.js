/**
 * Table Model - Tischverwaltung
 */

class TableModel {
  constructor(db) {
    this.db = db;
    this._prepareStatements();
  }

  _prepareStatements() {
    this.stmts = {
      getAll: this.db.prepare(`SELECT * FROM tables ORDER BY number`),
      getById: this.db.prepare(`SELECT * FROM tables WHERE id = ?`),
      getByNumber: this.db.prepare(`SELECT * FROM tables WHERE number = ?`),
      updateStatus: this.db.prepare(`UPDATE tables SET status = ? WHERE id = ?`),
      create: this.db.prepare(`
        INSERT INTO tables (number, name, seats, zone) VALUES (@number, @name, @seats, @zone)
      `),
      getWithOrders: this.db.prepare(`
        SELECT t.*,
          COUNT(CASE WHEN o.status IN ('new', 'in_progress', 'ready') THEN 1 END) as active_orders
        FROM tables t
        LEFT JOIN orders o ON t.id = o.table_id AND o.status NOT IN ('served', 'cancelled')
        GROUP BY t.id
        ORDER BY t.number
      `),
    };
  }

  getAll() {
    return this.stmts.getAll.all();
  }

  getById(id) {
    return this.stmts.getById.get(id);
  }

  getByNumber(number) {
    return this.stmts.getByNumber.get(number);
  }

  getAllWithOrders() {
    return this.stmts.getWithOrders.all();
  }

  updateStatus(id, status) {
    this.stmts.updateStatus.run(status, id);
    return this.getById(id);
  }

  create(data) {
    const result = this.stmts.create.run({
      number: data.number,
      name: data.name || `Tisch ${data.number}`,
      seats: data.seats || 4,
      zone: data.zone || 'main',
    });
    return this.getById(result.lastInsertRowid);
  }
}

module.exports = TableModel;
