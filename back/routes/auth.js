const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../config/database');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const { send } = require('process');
const { error } = require('console');

const router = express.Router();

router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { username, firstname, lastname, email, password } = req.body;

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await connection.beginTransaction();

        // Check if user with same username || email exist
        const [duplicates] = await connection.execute(
            `SELECT id FROM users WHERE username = ? OR email = ?`,
            [username, email]
        );

        if (duplicates.length > 0) {
            res.status(400).json({
                error: 'User with same username or email already exist',
            });
            connection.release();
            return;
        }
        // Insérer l'utilisateur
        const [result] = await connection.execute(
            `INSERT INTO users (username, firstname, lastname, email, password_hash, is_confirmed)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, firstname, lastname, email, passwordHash, false]
        );
        const userId = result.insertId;

        await connection.commit();

        sendConfirmationEmail(email, userId);

        res.status(201).json({
            message: 'User created successfully',
            userId: userId,
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(400).json({ error: 'Unexpected error when creating user' });
    } finally {
        connection.release();
    }
}));

async function sendConfirmationEmail(email, userId) {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        const token = jwt.sign(
            { userId: userId },
            process.env.EMAIL_CONFIRMATION_SECRET,
            { expiresIn: '1d' }
        );

        const confirmationLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

        console.log(`email de confirmation à ${email} avec le lien : ${confirmationLink}`);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Confirmation de votre compte",
            html: `
                <h3>Confirmation d'inscription</h3>
                <p>Cliquez sur le lien ci-dessous pour confirmer votre compte :</p>
                <a href="${confirmationLink}">Confirmer mon compte</a>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Erreur lors de l’envoi de l’email de confirmation :', error);
    }
}

router.get('/confirm-email', asyncHandler(async (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.EMAIL_CONFIRMATION_SECRET);
        const userId = decoded.userId;

        await db.execute(
            'UPDATE users SET is_confirmed = ? WHERE id = ?',
            [true, userId]
        );

        console.log(`User with ID ${userId} has confirmed their email.`);
        return res.json({ message: 'Email confirmed successfully' });
    } catch (error) {
        console.error('Erreur lors de la confirmation de l’email :', error);
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await db.execute(
        `SELECT id FROM users WHERE email = ?`,
        [email]
    );

    if (users.length === 0) {
        return res.sendStatus(200);
    }
    const userId = users[0].id;

    const token = jwt.sign(
        { userId: userId },
        process.env.PASSWORD_RESET_SECRET,
        { expiresIn: '1h' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
                <h3>Password Reset</h3>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset My Password</a>
            `
    };

    await transporter.sendMail(mailOptions);

    return res.sendStatus(200);
}));

router.post('/reset-password/confirm', asyncHandler(async (req, res) => {

    let decoded;
    let userId;
    const token = req.body.token;
    const { password } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    try {
        decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
        userId = decoded.userId;
        if (!userId) {
            throw new error("Invalid token");
        }
    }
    catch {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    try {
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );
        res.status(200).json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Password update error : ' + error.message });
    }

}));


router.post('/login', validateLogin, asyncHandler(async (req, res) => {
    console.log("Login request received :", req.body);
    const { username, password } = req.body;

    const [users] = await db.execute(
        'SELECT id, username, email, password_hash, is_confirmed FROM users WHERE username = ?',
        [username]
    );

    console.log("User lookup result for {", username, "}:", users);
    if (users.length !== 1) {
        // 401 to protect against user enumeration
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (users[0].is_confirmed === 0) {
        return res.status(403).json({ message: 'Account not confirmed. Please check your email.' });
    }

    const user = users[0];
    console.log("Found user:", user);

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log("password valid for user:", user.username);

    const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isConfirmed: user.is_confirmed,
        }
    });
}));

router.get('/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
