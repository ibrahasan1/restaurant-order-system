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

    -- Verbundene Geräte (für Heartbeat/Monitoring)
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('waiter', 'kitchen', 'bar', 'admin')),
      is_online INTEGER DEFAULT 0,
      last_seen TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tagesabschluss / Statistiken
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      avg_preparation_time REAL DEFAULT 0,
      peak_hour INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

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
