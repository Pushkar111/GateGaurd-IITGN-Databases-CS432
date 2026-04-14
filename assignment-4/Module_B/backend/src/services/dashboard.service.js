// src/services/dashboard.service.js
const dashboardModel = require('../models/dashboard.model');

async function getStats() {
  return dashboardModel.getStats();
}

async function getVisitTrend() {
  return dashboardModel.getVisitTrend();
}

async function getRecentActivity() {
  return dashboardModel.getRecentActivity();
}

module.exports = { getStats, getVisitTrend, getRecentActivity };
