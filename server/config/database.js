/**
 * Datenbank-Konfiguration (SQLite mit better-sqlite3)
 * WAL-Mode für bessere Performance bei gleichzeitigen Zugriffen
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'restaurant.sqlite');

let db = null;

function initDatabase() {
  // Sicherstellen, dass das Verzeichnis existiert
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  });

  // ─── Performance-Optimierungen ──────────────────────
  db.pragma('journal_mode = WAL');        // Write-Ahead Logging
  db.pragma('synchronous = NORMAL');       // Guter Kompromiss: Sicherheit + Speed
  db.pragma('foreign_keys = ON');          // Fremdschlüssel aktivieren
  db.pragma('busy_timeout = 5000');        // 5s warten bei gesperrter DB
  db.pragma('cache_size = -20000');        // 20MB Cache

  // ─── Migration: Alte devices-Tabelle entfernen (TEXT PK → INTEGER PK) ──
  const oldDeviceSchema = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='devices'"
  ).get();
  if (oldDeviceSchema && oldDeviceSchema.sql && oldDeviceSchema.sql.includes('id TEXT PRIMARY KEY')) {
    db.exec('DROP TABLE IF EXISTS devices');
    console.log('🔄 Alte devices-Tabelle migriert');
  }

  // ─── Tabellen erstellen ─────────────────────────────
  db.exec(`
    -- Kategorien für die Speisekarte
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      target TEXT NOT NULL DEFAULT 'kitchen' CHECK(target IN ('kitchen', 'bar')),
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Speisekarte / Menü-Einträge
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      preparation_time INTEGER DEFAULT 15,
      allergens TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Tische
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      name TEXT,
      seats INTEGER DEFAULT 4,
      status TEXT DEFAULT 'free' CHECK(status IN ('free', 'occupied', 'reserved', 'blocked')),
      zone TEXT DEFAULT 'main',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Bestellungen
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      table_id INTEGER NOT NULL,
      waiter_name TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'in_progress', 'ready', 'served', 'cancelled')),
      target TEXT NOT NULL CHECK(target IN ('kitchen', 'bar')),
      notes TEXT,
      total_price REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    );

    -- Bestellpositionen
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'in_progress', 'ready', 'served', 'cancelled')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    -- Geräte-Profile (Login per PIN)
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT NOT NULL UNIQUE,
      pin TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'waiter' CHECK(role IN ('waiter', 'kitchen', 'bar', 'admin')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Umsatz-Tracking pro Gerät
    CREATE TABLE IF NOT EXISTS device_revenue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Belege / Rechnungshistorie pro Gerät
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_type TEXT DEFAULT 'full',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    -- Indizes für Umsatz-Abfragen
    CREATE INDEX IF NOT EXISTS idx_device_revenue_device ON device_revenue(device_id);
    CREATE INDEX IF NOT EXISTS idx_device_revenue_date ON device_revenue(date);
    CREATE INDEX IF NOT EXISTS idx_receipts_device ON receipts(device_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_created ON receipts(created_at);

    -- ─── Indizes für Performance ──────────────────────
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_target ON orders(target);
    CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
  `);

  // ─── Geräte-Seed-Daten (nur wenn leer) ─────────
  const deviceCount = db.prepare('SELECT COUNT(*) as count FROM devices').get().count;
  if (deviceCount === 0) {
    const insertDevice = db.prepare(
      'INSERT INTO devices (device_name, pin, role) VALUES (?, ?, ?)'
    );
    const defaultDevices = [
      ['Gerät 1', '1111', 'waiter'],
      ['Gerät 2', '2222', 'waiter'],
      ['Gerät 3', '3333', 'waiter'],
      ['Küche',   '4444', 'kitchen'],
      ['Bar',     '5555', 'bar'],
      ['Admin',   '0000', 'admin'],
    ];
    for (const [name, pin, role] of defaultDevices) {
      insertDevice.run(name, pin, role);
    }
    console.log(`📱 ${defaultDevices.length} Standard-Geräte erstellt`);
  }

  console.log(`📦 Datenbank initialisiert: ${DB_PATH}`);
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert. Bitte zuerst initDatabase() aufrufen.');
  }
  return db;
}

module.exports = { initDatabase, getDatabase };
