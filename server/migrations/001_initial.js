/**
 * Migration 001: Initiale Datenbank-Erstellung
 * Wird automatisch durch server/config/database.js ausgeführt.
 * Dieses Skript kann manuell mit `npm run db:init` aufgerufen werden.
 */

require('dotenv').config();
const { initDatabase } = require('../config/database');

console.log('🔨 Datenbank wird initialisiert...');
const db = initDatabase();
console.log('✅ Datenbank-Schema erstellt.');
db.close();
