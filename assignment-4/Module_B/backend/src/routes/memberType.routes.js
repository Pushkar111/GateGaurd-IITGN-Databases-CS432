// src/routes/memberType.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const memberTypeModel = require("../models/memberType.model");
const { sendSuccess } = require("../utils/helpers");
const AppError = require("../utils/AppError");

router.get("/", authenticate, async (req, res, next) => {
    try {
        const types = await memberTypeModel.findAll();
        return sendSuccess(res, { types });
    } catch (err) {
        next(err);
    }
});

router.get("/:id", authenticate, async (req, res, next) => {
    try {
        const type = await memberTypeModel.findById(Number(req.params.id));
        if (!type) throw new AppError(`MemberType ${req.params.id} not found.`, 404);
        return sendSuccess(res, { type });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
