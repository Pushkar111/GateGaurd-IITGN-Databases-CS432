// src/routes/dashboard.routes.js
const router = require('express').Router();
const { authenticate }      = require('../middleware/auth');
const dashboardController   = require('../controllers/dashboard.controller');

router.get('/stats',           authenticate, dashboardController.getStats);
router.get('/recent-activity', authenticate, dashboardController.getRecentActivity);
router.get('/visit-trend',     authenticate, dashboardController.getVisitTrend);

module.exports = router;
