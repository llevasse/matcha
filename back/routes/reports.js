const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { reportUser } = require('../services/blockService');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post('/', authenticateToken, asyncHandler(async (req, res) => {
    const { to_user_id } = req.body;

    if (to_user_id == req.user.id) {
        return res.status(400).json({ error: 'Cannot report yourself' });
    }

    await reportUser(req.user.id, to_user_id);

    res.status(201).json({
        message: 'The user specified has been successfully reported',
        userId: to_user_id,
    });
}));

module.exports = router;