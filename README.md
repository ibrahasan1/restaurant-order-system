# 🍽️ Restaurant Order System (ROS)

Ein stabiles, internes Echtzeit-Bestellsystem für Restaurants – optimiert für lokalen Betrieb über WLAN.

## 📋 Überblick

| Gerät | Anzahl | Funktion |
|-------|--------|----------|
| 📱 Kellner-Handys | 3 | Bestellungen aufgeben |
| 📟 Küchen-Tablets | 3 | Speise-Bestellungen bearbeiten |
| 🍺 Bar-Tablets | 2 | Getränke-Bestellungen bearbeiten |
| 💻 Lokaler Server | 1 | Backend, Datenbank, API |

## 🏗️ Architektur

```
┌──────────────┐     WebSocket/HTTP      ┌──────────────┐
│  Kellner (3) │◄──────────────────────►│  Express.js  │
│  Mobile PWA  │                         │  + Socket.IO │
└──────────────┘                         │  + SQLite    │
                                         └──────┬───────┘
┌──────────────┐     WebSocket/HTTP              │
│  Küche (3)   │◄───────────────────────────────┤
│  Tablet View │                                 │
└──────────────┘                                 │
                                                 │
┌──────────────┐     WebSocket/HTTP              │
│  Bar (2)     │◄───────────────────────────────┘
│  Tablet View │
└──────────────┘
```

## 🛠️ Tech-Stack

- **Backend:** Node.js, Express.js, Socket.IO
- **Datenbank:** SQLite3 (mit WAL-Mode für Performance)
- **Frontend:** React 18 (Vite)
- **Echtzeit:** Socket.IO (WebSockets mit Fallback)
- **Process Manager:** PM2 (Auto-Restart, Monitoring)
- **PWA:** Service Worker für Offline-Fallback

## 📁 Projektstruktur

```
restaurant-order-system/
├── server/                    # Backend
│   ├── index.js               # Server-Einstiegspunkt
│   ├── config/
│   │   └── database.js        # DB-Konfiguration
│   ├── models/
│   │   ├── Menu.js            # Speisekarte
│   │   ├── Order.js           # Bestellungen
│   │   └── Table.js           # Tische
│   ├── routes/
│   │   ├── menu.js            # /api/menu
│   │   ├── orders.js          # /api/orders
│   │   └── tables.js          # /api/tables
│   ├── socket/
│   │   └── handlers.js        # WebSocket Event-Handler
│   ├── middleware/
│   │   └── errorHandler.js    # Fehlerbehandlung
│   └── migrations/
│       └── 001_initial.js     # DB-Schema
│
├── client/                    # Frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json      # PWA-Manifest
│   │   └── sw.js              # Service Worker
│   ├── src/
│   │   ├── App.jsx            # Haupt-App mit Routing
│   │   ├── main.jsx           # Einstiegspunkt
│   │   ├── views/
│   │   │   ├── WaiterView/    # Kellner-Interface
│   │   │   ├── KitchenView/   # Küchen-Interface
│   │   │   ├── BarView/       # Bar-Interface
│   │   │   └── AdminView/     # Admin-Interface
│   │   ├── components/        # Wiederverwendbare Komponenten
│   │   ├── hooks/             # Custom React Hooks
│   │   ├── utils/             # Hilfsfunktionen
│   │   └── styles/            # Globale Styles
│   ├── vite.config.js
│   └── package.json
│
├── scripts/
│   ├── setup.sh               # Erstinstallation
│   ├── backup.sh              # Datenbank-Backup
│   └── start-production.sh    # Produktionsstart
│
├── docs/
│   ├── SETUP.md               # Installationsanleitung
│   ├── HARDWARE.md            # Hardware-Empfehlungen
│   └── API.md                 # API-Dokumentation
│
├── .env.example               # Umgebungsvariablen-Vorlage
├── .gitignore
├── package.json               # Root-Paket
├── ecosystem.config.js        # PM2-Konfiguration
└── LICENSE
```

## 🚀 Schnellstart

### Voraussetzungen
- Node.js >= 18.x
- npm >= 9.x
- Git

### Installation

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/restaurant-order-system.git
cd restaurant-order-system

# Setup-Skript ausführen
chmod +x scripts/setup.sh
./scripts/setup.sh

# ODER manuell:
npm install
cd client && npm install && cd ..

# Datenbank initialisieren
npm run db:init

# Beispieldaten laden
npm run db:seed
```

### Entwicklung

```bash
# Server + Client gleichzeitig starten
npm run dev

# Nur Server
npm run dev:server

# Nur Client
npm run dev:client
```

### Produktion

```bash
# Client bauen
npm run build

# Mit PM2 starten (Auto-Restart, Monitoring)
npm run start:prod

# PM2 Status prüfen
npx pm2 status
```

## 🌐 Zugang (lokales Netzwerk)

Nach dem Start ist das System im WLAN erreichbar:

| Interface | URL | Gerät |
|-----------|-----|-------|
| Kellner | `http://SERVER-IP:3000/waiter` | Handy |
| Küche | `http://SERVER-IP:3000/kitchen` | Tablet |
| Bar | `http://SERVER-IP:3000/bar` | Tablet |
| Admin | `http://SERVER-IP:3000/admin` | PC |

> **Tipp:** Statische IP im Router für den Server vergeben (z.B. `192.168.1.100`)

## 📱 PWA-Installation

Die App kann als PWA auf Handys/Tablets installiert werden:
1. URL im Chrome/Safari öffnen
2. "Zum Startbildschirm hinzufügen"
3. App startet im Vollbild-Modus

## 🔧 Konfiguration

Kopiere `.env.example` nach `.env` und passe die Werte an:

```bash
cp .env.example .env
```

## 🛡️ Stabilität

- **PM2** startet den Server automatisch neu bei Absturz
- **SQLite WAL-Mode** verhindert Datenbank-Sperren
- **Auto-Reconnect** bei Verbindungsverlust (Socket.IO)
- **Heartbeat-System** erkennt offline Geräte
- **Tägliche Backups** via Cron-Job
- **Service Worker** für kurzzeitigen Offline-Betrieb

## 🤝 Mitwirken

1. Fork erstellen
2. Feature-Branch: `git checkout -b feature/mein-feature`
3. Commit: `git commit -m 'feat: Beschreibung'`
4. Push: `git push origin feature/mein-feature`
5. Pull Request erstellen

## 📄 Lizenz

MIT License – siehe [LICENSE](LICENSE)
