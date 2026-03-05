/**
 * Restaurant Order System - Server
 * Einstiegspunkt für Express + Socket.IO
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { initDatabase } = require('./config/database');
const { setupSocketHandlers } = require('./socket/handlers');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');

// ─── Konfiguration ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Express App ────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Erlaubte Origins ───────────────────────────────────
// Lokales Netzwerk: Alle privaten IPs akzeptieren (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
function isAllowedOrigin(origin) {
  if (!origin) return true; // Same-origin Requests (kein Origin-Header)
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : isAllowedOrigin;

// ─── Socket.IO ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 10000,
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 5000,
  // Reconnection-Einstellungen für Stabilität
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 Minuten
    skipMiddlewares: true,
  },
});

// ─── Middleware ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  // Kein HSTS – wir laufen nur über HTTP im lokalen Netzwerk
  hsts: false,
  // Kein upgrade-insecure-requests – sonst blockiert der Browser HTTP-Assets
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(compression());
app.use(cors({
  origin: corsOrigin,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting (Schutz vor Überlastung)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
});
app.use('/api/', limiter);

// ─── Socket.IO als Middleware verfügbar machen ──────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    connectedClients: io.engine.clientsCount,
  });
});

// ─── Statische Dateien (Production Build) ───────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// SPA-Fallback: Alle nicht-API-Routen an React weiterleiten
app.get(/^\/(?!api).*/, (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Frontend nicht gefunden. Bitte "npm run build" ausführen.',
      });
    }
  });
});

// ─── Error Handling ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Datenbank & Server starten ─────────────────────────
async function startServer() {
  try {
    // Datenbank initialisieren
    const db = initDatabase();
    app.locals.db = db;
    console.log('✅ Datenbank verbunden');

    // Socket.IO Handler einrichten
    setupSocketHandlers(io, db);
    console.log('✅ WebSocket-Handler registriert');

    // Server starten
    server.listen(PORT, HOST, () => {
      console.log('');
      console.log('🍽️  Restaurant Order System gestartet!');
      console.log('─'.repeat(50));
      console.log(`📡 Server:    http://${HOST}:${PORT}`);
      console.log(`🌍 Umgebung:  ${NODE_ENV}`);
      console.log(`📱 Kellner:   http://SERVER-IP:${PORT}/waiter`);
      console.log(`👨‍🍳 Küche:     http://SERVER-IP:${PORT}/kitchen`);
      console.log(`🍺 Bar:       http://SERVER-IP:${PORT}/bar`);
      console.log(`⚙️  Admin:     http://SERVER-IP:${PORT}/admin`);
      console.log('─'.repeat(50));
      console.log('');
    });
  } catch (error) {
    console.error('❌ Server konnte nicht gestartet werden:', error);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ──────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n⚠️  ${signal} empfangen. Fahre Server herunter...`);
  
  // Alle Socket-Verbindungen benachrichtigen
  io.emit('server:shutdown', {
    message: 'Server wird neu gestartet. Verbindung wird automatisch wiederhergestellt.',
  });

  server.close(() => {
    console.log('✅ HTTP-Server geschlossen');
    
    // Datenbank schließen
    if (app.locals.db) {
      app.locals.db.close();
      console.log('✅ Datenbank geschlossen');
    }
    
    process.exit(0);
  });

  // Force-Close nach 10 Sekunden
  setTimeout(() => {
    console.error('❌ Erzwungener Shutdown nach Timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('❌ Unbehandelte Ausnahme:', error);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unbehandelte Promise-Rejection:', reason);
});

// ─── Start ──────────────────────────────────────────────
startServer();
