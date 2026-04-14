// src/controllers/dashboard.controller.js
const dashboardService = require('../services/dashboard.service');
const { sendSuccess }  = require('../utils/helpers');

async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getStats();
    return sendSuccess(res, stats);
  } catch (err) { next(err); }
}

async function getRecentActivity(req, res, next) {
  try {
    const activity = await dashboardService.getRecentActivity();
    return sendSuccess(res, { activity });
  } catch (err) { next(err); }
}

async function getVisitTrend(req, res, next) {
  try {
    const trend = await dashboardService.getVisitTrend();
    return sendSuccess(res, { trend });
  } catch (err) { next(err); }
}

module.exports = { getStats, getRecentActivity, getVisitTrend };
