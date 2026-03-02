#!/bin/bash
# ═══════════════════════════════════════════════
# Restaurant Order System - Erstinstallation
# ═══════════════════════════════════════════════

set -e

echo "🍽️  Restaurant Order System - Setup"
echo "════════════════════════════════════"

# Node.js Version prüfen
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js >= 18 erforderlich. Installiere: https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# npm Version
echo "✅ npm $(npm -v)"

# Verzeichnisse erstellen
echo "📁 Erstelle Verzeichnisse..."
mkdir -p data logs backups

# .env erstellen falls nicht vorhanden
if [ ! -f .env ]; then
  echo "📄 Erstelle .env aus Vorlage..."
  cp .env.example .env
  echo "   ⚠️  Bitte .env anpassen!"
fi

# Server-Dependencies
echo "📦 Installiere Server-Dependencies..."
npm install

# Client-Dependencies
echo "📦 Installiere Client-Dependencies..."
cd client && npm install && cd ..

# Datenbank initialisieren
echo "🔨 Initialisiere Datenbank..."
npm run db:init

# Beispieldaten laden
echo "🌱 Lade Beispieldaten..."
npm run db:seed

# PM2 global installieren (optional)
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installiere PM2 (Process Manager)..."
  npm install -g pm2
fi

echo ""
echo "✅ Setup abgeschlossen!"
echo "════════════════════════════════════"
echo ""
echo "Nächste Schritte:"
echo "  1. .env Datei prüfen und anpassen"
echo "  2. Entwicklung starten:  npm run dev"
echo "  3. Oder Produktion:      npm run build && npm run start:prod"
echo ""
echo "  📱 Kellner:  http://localhost:3000/waiter"
echo "  👨‍🍳 Küche:    http://localhost:3000/kitchen"
echo "  🍺 Bar:      http://localhost:3000/bar"
echo "  ⚙️  Admin:    http://localhost:3000/admin"
echo ""
