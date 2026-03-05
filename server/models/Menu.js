/**
 * Menu Model - Speisekarten-Verwaltung
 */

class MenuModel {
  constructor(db) {
    this.db = db;
    this._prepareStatements();
  }

  _prepareStatements() {
    this.stmts = {
      getAll: this.db.prepare(`
        SELECT mi.*, c.name as category_name, c.target, c.icon as category_icon
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.is_available = 1 AND c.is_active = 1
        ORDER BY c.sort_order, mi.sort_order, mi.name
      `),
      getAllWithUnavailable: this.db.prepare(`
        SELECT mi.*, c.name as category_name, c.target, c.icon as category_icon
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        ORDER BY c.sort_order, mi.sort_order, mi.name
      `),
      getById: this.db.prepare(`SELECT * FROM menu_items WHERE id = ?`),
      getByCategory: this.db.prepare(`
        SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1
        ORDER BY sort_order, name
      `),
      getCategories: this.db.prepare(`
        SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name
      `),
      getAllCategories: this.db.prepare(`
        SELECT * FROM categories ORDER BY sort_order, name
      `),
      createCategory: this.db.prepare(`
        INSERT INTO categories (name, sort_order, target, icon)
        VALUES (@name, @sort_order, @target, @icon)
      `),
      createItem: this.db.prepare(`
        INSERT INTO menu_items (category_id, name, description, price, preparation_time, allergens, sort_order)
        VALUES (@category_id, @name, @description, @price, @preparation_time, @allergens, @sort_order)
      `),
      updateItem: this.db.prepare(`
        UPDATE menu_items SET
          category_id = @category_id, name = @name, description = @description,
          price = @price, preparation_time = @preparation_time,
          allergens = @allergens, sort_order = @sort_order,
          updated_at = datetime('now', 'localtime')
        WHERE id = @id
      `),
      toggleAvailability: this.db.prepare(`
        UPDATE menu_items SET is_available = NOT is_available,
        updated_at = datetime('now', 'localtime') WHERE id = ?
      `),
      search: this.db.prepare(`
        SELECT mi.*, c.name as category_name, c.target
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.name LIKE ? OR mi.description LIKE ?
        ORDER BY mi.name
      `),
    };
  }

  getAll(includeUnavailable = false) {
    const items = includeUnavailable
      ? this.stmts.getAllWithUnavailable.all()
      : this.stmts.getAll.all();

    // Nach Kategorie gruppieren
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.category_name]) {
        grouped[item.category_name] = {
          category: item.category_name,
          target: item.target,
          icon: item.category_icon,
          items: [],
        };
      }
      grouped[item.category_name].items.push(item);
    }
    return Object.values(grouped);
  }

  getById(id) {
    return this.stmts.getById.get(id);
  }

  getCategories(includeInactive = false) {
    return includeInactive
      ? this.stmts.getAllCategories.all()
      : this.stmts.getCategories.all();
  }

  createCategory(data) {
    const result = this.stmts.createCategory.run({
      name: data.name,
      sort_order: data.sort_order || 0,
      target: data.target || 'kitchen',
      icon: data.icon || null,
    });
    return { id: result.lastInsertRowid, ...data };
  }

  createItem(data) {
    const result = this.stmts.createItem.run({
      category_id: data.category_id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      preparation_time: data.preparation_time || 15,
      allergens: data.allergens || null,
      sort_order: data.sort_order || 0,
    });
    return this.getById(result.lastInsertRowid);
  }

  updateItem(id, data) {
    this.stmts.updateItem.run({ id, ...data });
    return this.getById(id);
  }

  toggleAvailability(id) {
    this.stmts.toggleAvailability.run(id);
    return this.getById(id);
  }

  search(query) {
    const searchTerm = `%${query}%`;
    return this.stmts.search.all(searchTerm, searchTerm);
  }
}

module.exports = MenuModel;
