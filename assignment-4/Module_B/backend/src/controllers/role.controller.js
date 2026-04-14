// src/controllers/role.controller.js
// Simple read-only controller for roles
// Roles are managed via the Role table, not via an API

const roleModel      = require('../models/role.model');
const { sendSuccess, sendError } = require('../utils/helpers');
const AppError = require('../utils/AppError');

async function getAll(req, res, next) {
  try {
    const roles = await roleModel.findAll();
    return sendSuccess(res, { roles });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const role = await roleModel.findById(Number(req.params.id));
    if (!role) {
      throw new AppError(`Role with ID ${req.params.id} not found.`, 404);
    }
    return sendSuccess(res, { role });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById };
