const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');
const asyncHandler = require('../middleware/asyncHandler');
const {
    sendMessage,
    getConversation,
    getConversations
} = require('../services/messageService');

const router = express.Router();

router.post('/', authenticateToken, validateMessage, asyncHandler(async (req, res) => {
    const { receiver_id, content } = req.body;
    if (content.length > 100) {
        const error = new Error('Content should be < 100 char');
        error.status = 400;
        throw error;
    }

    const message = await sendMessage(req.user.id, receiver_id, content);

    res.status(201).json({
        ...message,
        message: 'Message sent successfully'
    });
}));

router.get('/conversation/:user_id', authenticateToken, asyncHandler(async (req, res) => {
    const otherUserId = req.params.user_id;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await getConversation(req.user.id, otherUserId, limit, offset);
    res.json(messages);
}));

router.get('/conversations', authenticateToken, asyncHandler(async (req, res) => {
    const conversations = await getConversations(req.user.id);
    res.json(conversations);
}));

module.exports = router;