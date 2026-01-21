const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { blockUser, unblockUser } = require('../services/blockService');
const { getUserPreviewInfoSqlStatement } = require('../utils/users');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    const { to_user_id } = req.body;

    if (to_user_id == req.user.id) {
        return res.status(400).json({ error: 'Cannot block yourself' });
    }

    await blockUser(req.user.id, to_user_id);

    res.status(201).json({
        message: 'The user specified has been successfully blocked',
        userId: to_user_id,
    });
}));

router.post('/unblock', authenticateToken, asyncHandler(async (req, res) => {
    console.log("/unblock");
    const { to_user_id } = req.body;

    if (to_user_id == req.user.id) {
        return res.status(400).json({ error: 'Cannot unblock yourself' });
    }

    await unblockUser(req.user.id, to_user_id);

    res.status(201).json({
        message: 'The user specified has been successfully unblocked',
        userId: to_user_id,
    });
}));

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const blockedUsers = await _getBlockedUsersDetails(
        req.user.id,
        req.user.id.location_latitude,
        req.user.id.location_longitude);
    res.json(blockedUsers);
}));

async function _getBlockedUsersDetails(userId, lat, lng) {
    const query = `
        ${getUserPreviewInfoSqlStatement} 
        FROM users u 
        WHERE u.id IN (SELECT to_user_id FROM blocks WHERE from_user_id = ?)
    `;

    const [rows] = await db.query(query, [lat, lng, lat, userId, userId]);

    return rows;
}

module.exports = router;