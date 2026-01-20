const express = require('express');
const { validateProfileUpdate } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
    getPrivateProfile,
    getPublicProfile,
    updateProfile,
    updatePassword,
    addToViewingHistory,
    getViewingHistory,
    searchUsers,
    updateProfileValidity
} = require('../services/usersService');

const router = express.Router();

router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const profile = await getPrivateProfile(req.user.id);
    res.json(profile);
}));

router.get('/profile/:user_id', authenticateToken, asyncHandler(async (req, res) => {
    const profile = await getPublicProfile(req.user.id, req.params.user_id);
    res.json(profile);
}));

router.post('/profile', authenticateToken, validateProfileUpdate, asyncHandler(async (req, res) => {
    await updateProfile(req.user.id, req.body);
    res.json({ message: 'Profile updated successfully' });
}));

router.put('/password', authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await updatePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
}));

router.post('/add_to_history', authenticateToken, asyncHandler(async (req, res) => {
    const { user_id } = req.body;
    await addToViewingHistory(req.user.id, user_id);
    res.json({ message: 'Successfully added to history' });
}));

router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
    const users = await getViewingHistory(req.user.id);

    if (users.length === 0) {
        return res.status(204).json([]);
    }

    res.json(users);
}));

router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
    const users = await searchUsers(req.user.id, req.user.gender_id, req.query);
    res.json(users);
}));

module.exports = { router, checkProfileValidity: updateProfileValidity };