const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { blockUser, unblockUser} = require('../services/blockService');
const { getUserPreviewInfoSqlStatement } = require('../utils/users');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        await blockUser(req.user.id, to_user_id);

        res.status(201).json({
            message: 'The user specified has been successfully blocked',
            userId: to_user_id,
        });
    } catch (error) {
        console.log("error catched :", error);
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        
        res.status(statusCode).json({ error: message });
        }
});

router.post('/unblock', authenticateToken, async (req, res) => {
  console.log("/unblock");
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot unblock yourself' });
        }

        await unblockUser(req.user.id, to_user_id);

        res.status(201).json({
            message: 'The user specified has been successfully unblocked',
            userId: to_user_id,
        });
    } catch (error) {
        console.log("error catched :", error);
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        
        res.status(statusCode).json({ error: message });
        }
});

router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const { lat, lng } = await _getUserLocation(userId);
        const blockedUsers = await _getBlockedUsersDetails(userId, lat, lng);
        if (blockedUsers.length == 0){
          return res.status(204).json(blockedUsers);
        }
        res.json(blockedUsers);
    } catch (error) {
        console.error(`[Error Get Blocked] User ${userId}:`, error.message);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
    }
});

async function _getUserLocation(userId) {
    const [rows] = await db.execute(
        'SELECT location_latitude, location_longitude FROM users WHERE id = ?',
        [userId]
    );
    
    const user = rows[0];

    return {
        lat: user.location_latitude,
        lng: user.location_longitude
    };
}

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