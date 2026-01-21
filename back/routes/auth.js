const express = require('express');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
    registerUser,
    confirmEmail,
    requestPasswordReset,
    confirmPasswordReset,
    loginUser
} = require('../services/authService');

const router = express.Router();

router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
    const userId = await registerUser(req.body);

    res.status(201).json({
        message: 'User created successfully',
        userId: userId,
    });
}));

router.get('/confirm-email', asyncHandler(async (req, res) => {
    const userId = await confirmEmail(req.query.token);

    res.json({ message: 'Email confirmed successfully' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email);
    res.sendStatus(200);
}));

router.post('/reset-password/confirm', asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    await confirmPasswordReset(token, password);

    res.status(200).json({ success: true });
}));

router.post('/login', validateLogin, asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const result = await loginUser(username, password);

    res.json({
        message: 'Login successful',
        token: result.token,
        user: result.user
    });
}));

router.get('/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;