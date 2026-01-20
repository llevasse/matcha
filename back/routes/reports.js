const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { reportUser } = require('../services/blockService');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot report yourself' });
        }

        await reportUser(req.user.id, to_user_id);

        res.status(201).json({
            message: 'The user specified has been successfully reported',
            userId: to_user_id,
        });
    } catch (error) {
        console.log("error catched :", error);
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        
        res.status(statusCode).json({ error: message });
        }
}));

module.exports = router;