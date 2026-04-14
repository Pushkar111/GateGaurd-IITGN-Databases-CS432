// src/app.js
// Express application assembly
// All middleware and routes are registered here
// server.js calls app.listen(), keeping this file purely about the app setup

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');

const corsOptions        = require('./config/cors');
const errorHandler       = require('./middleware/errorHandler');
// const { globalLimiter }  = require('./middleware/rateLimiter');
const logger             = require('./utils/logger');

// route files
const authRoutes          = require('./routes/auth.routes');
const memberRoutes        = require('./routes/member.routes');
const memberTypeRoutes    = require('./routes/memberType.routes');
const vehicleRoutes       = require('./routes/vehicle.routes');
const vehicleTypeRoutes   = require('./routes/vehicleType.routes');
const gateRoutes          = require('./routes/gate.routes');
const gateOccupancyRoutes = require('./routes/gateOccupancy.routes');
const personVisitRoutes   = require('./routes/personVisit.routes');
const vehicleVisitRoutes  = require('./routes/vehicleVisit.routes');
const userRoutes          = require('./routes/user.routes');
const roleRoutes          = require('./routes/role.routes');
const dashboardRoutes     = require('./routes/dashboard.routes');
const auditRoutes         = require('./routes/audit.routes');

const app = express();

// -----------------------------------------------------------------------
// Security middleware
// -----------------------------------------------------------------------
app.use(helmet());
app.use(cors(corsOptions));

// -----------------------------------------------------------------------
// Body parsing
// -----------------------------------------------------------------------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------------------------------
// HTTP request logging (Morgan → Winston)
// -----------------------------------------------------------------------
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// -----------------------------------------------------------------------
// Rate limiting (global — applied to all /api routes)
// -----------------------------------------------------------------------
// Rate limiting disabled as requested.
// app.use('/api', globalLimiter);

// -----------------------------------------------------------------------
// Welcome / health check
// -----------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to GateGuard API', status: 'running', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// -----------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------
app.use('/api/auth',           authRoutes);
app.use('/api/members',        memberRoutes);
app.use('/api/member-types',   memberTypeRoutes);
app.use('/api/vehicles',       vehicleRoutes);
app.use('/api/vehicle-types',  vehicleTypeRoutes);
app.use('/api/gates',          gateRoutes);
app.use('/api/gate-occupancy', gateOccupancyRoutes);
app.use('/api/person-visits',  personVisitRoutes);
app.use('/api/vehicle-visits', vehicleVisitRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/roles',          roleRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/audit',          auditRoutes);

// -----------------------------------------------------------------------
// 404 handler for unmatched routes
// -----------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route '${req.method} ${req.originalUrl}' not found.` },
  });
});

// -----------------------------------------------------------------------
// Global error handler (must be last!)
// -----------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
