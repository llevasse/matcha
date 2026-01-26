const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { searchCity, searchCityByIp } = require('../services/locationService');

const router = express.Router();

router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
    const { content } = req.query
    const cities = await searchCity(content);

    res.status(200).json({cities});
}));

router.get('/locate', authenticateToken, asyncHandler(async (req, res) => {
    const { ip } = req.query
    const location = await searchCityByIp(ip);

    res.status(200).json({location});
}));

module.exports = router;