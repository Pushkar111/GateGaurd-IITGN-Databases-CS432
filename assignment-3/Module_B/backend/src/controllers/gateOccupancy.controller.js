// src/controllers/gateOccupancy.controller.js
const gateService          = require('../services/gate.service');
const { sendSuccess }      = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS }          = require('../utils/constants');

async function getAll(req, res, next) {
  try { return sendSuccess(res, { occupancy: await gateService.getAllOccupancy() }); }
  catch (err) { next(err); }
}

async function updateOccupancy(req, res, next) {
  try {
    const oldValue = await gateService.getById(req.params.id);
    const occupancy = await gateService.updateOccupancy(
      req.params.id,
      req.body.occupancyCount,
      {
        capacityLimit: req.body.capacityLimit,
        emergencyOverride: req.body.emergencyOverride,
        incidentNote: req.body.incidentNote,
      },
      req.user
    );
    await writeAuditRecord({
      user: req.user,
      tableName: 'GateOccupancy',
      recordId: Number(req.params.id),
      action: ACTIONS.UPDATE,
      oldValue: {
        occupancyCount: oldValue?.OccupancyCount,
      },
      newValue: {
        occupancyCount: req.body.occupancyCount,
        capacityLimit: req.body.capacityLimit,
        emergencyOverride: !!req.body.emergencyOverride,
        incidentNote: req.body.incidentNote || null,
      },
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: 200,
      ip: req.ip,
    });
    return sendSuccess(res, { occupancy });
  } catch (err) { next(err); }
}

module.exports = { getAll, updateOccupancy };
