/**
 * Fehlerbehandlung Middleware
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: 'Nicht gefunden',
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  console.error('❌ Server-Fehler:', err);

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Interner Serverfehler'
    : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, errorHandler };
