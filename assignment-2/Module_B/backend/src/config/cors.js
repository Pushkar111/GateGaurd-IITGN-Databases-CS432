// src/config/cors.js
// CORS configuration — only allow our frontend origin
// In production this would be the deployed frontend URL

const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like curl, Postman, mobile apps in dev)
    if (!origin) return callback(null, true);

    // allow the configured frontend URL
    if (origin === env.FRONTEND_URL) return callback(null, true);

    // also allow localhost variations during dev
    if (env.NODE_ENV === 'development') {
      const localOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ];
      if (localOrigins.includes(origin)) return callback(null, true);
    }

    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
