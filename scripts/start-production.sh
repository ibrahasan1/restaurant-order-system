#!/bin/bash
# Produktionsstart mit PM2

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🏗️  Baue Client..."
npm run build

echo "🚀 Starte Server mit PM2..."
pm2 start ecosystem.config.js

echo ""
echo "✅ System läuft!"
echo "   Status:  pm2 status"
echo "   Logs:    pm2 logs restaurant-api"
echo "   Stopp:   pm2 stop restaurant-api"
echo "   Restart: pm2 restart restaurant-api"
echo ""

# PM2 Autostart bei Systemstart
pm2 save
pm2 startup 2>/dev/null || echo "⚠️  Für Autostart: sudo env PATH=\$PATH pm2 startup"
