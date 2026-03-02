// PM2 Konfiguration für Produktionsbetrieb
// Starten mit: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'restaurant-api',
      script: 'server/index.js',
      instances: 1, // SQLite unterstützt nur eine Instanz
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart-Strategie
      exp_backoff_restart_delay: 100,
      max_restarts: 50,
      min_uptime: '10s',
      // Graceful Shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
