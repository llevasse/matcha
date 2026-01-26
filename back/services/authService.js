const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

async function registerUser(userData) {
    const connection = await db.getConnection();

    try {
        const { username, firstname, lastname, email, password, consentLocation } = userData;

        _throw400IfPasswordIsNotStrongEnough(password);

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await connection.beginTransaction();

        await _throw400IfUserAlreadyExists(connection, username, email);

        const [result] = await connection.execute(
            `INSERT INTO users (username, firstname, lastname, email, password_hash, is_confirmed)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, firstname, lastname, email, passwordHash, false]
        );

        const userId = result.insertId;
        await connection.commit();

        await _sendConfirmationEmail(email, userId);

        return userId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function confirmEmail(token) {
    if (!token) {
        const error = new Error('Token is required');
        error.status = 400;
        throw error;
    }

    try {
        const decoded = jwt.verify(token, process.env.EMAIL_CONFIRMATION_SECRET);
        const userId = decoded.userId;

        await db.execute(
            'UPDATE users SET is_confirmed = ? WHERE id = ?',
            [true, userId]
        );

        return userId;
    } catch (error) {
        const err = new Error('Invalid or expired token');
        err.status = 400;
        throw err;
    }
}

async function requestPasswordReset(email) {
    if (!email) {
        const error = new Error('Email is required');
        error.status = 400;
        throw error;
    }

    const [users] = await db.execute(
        `SELECT id FROM users WHERE email = ?`,
        [email]
    );

    if (users.length === 0) {
        return;
    }

    const userId = users[0].id;
    const token = jwt.sign(
        { userId: userId },
        process.env.PASSWORD_RESET_SECRET,
        { expiresIn: '1h' }
    );

    await _sendPasswordResetEmail(email, token);
}

async function confirmPasswordReset(token, password) {
    let userId = _throw400IfInvalidResetToken(token);

    _throw400IfPasswordIsNotStrongEnough(password)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );
    } catch (error) {
        const err = new Error('Password update error: ' + error.message);
        err.status = 500;
        throw err;
    }
}

function _throw400IfInvalidResetToken(token) {
    if (!token) {
        const error = new Error('Token is required');
        error.status = 400;
        throw error;
    }

    let decoded;
    let userId;

    try {
        decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
        userId = decoded.userId;

        if (!userId) {
            throw new Error("Invalid token");
        }
    } catch (error) {
        const err = new Error('Invalid or expired token');
        err.status = 400;
        throw err;
    }
    return userId;
}

async function loginUser(username, password) {
    const [users] = await db.execute(
        'SELECT id, username, email, password_hash, is_confirmed FROM users WHERE username = ?',
        [username]
    );

    if (users.length !== 1) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
    }

    if (users[0].is_confirmed === 0) {
        const error = new Error('Account not confirmed. Please check your email.');
        error.status = 403;
        throw error;
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isConfirmed: user.is_confirmed,
        }
    };
}


function _throw400IfPasswordIsNotStrongEnough(password) {
    if (!_passwordIsValid(password)) {
        const error = new Error('Password must be at least 8 characters long and contain letters, numbers, and special characters.');
        error.status = 400;
        throw error;
    }
}

function _passwordIsValid(password) {
    const longEnough = password.length >= 8;
    const hasNumbers = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (longEnough && hasNumbers && hasLetters && hasSpecialChar)
}

async function _throw400IfUserAlreadyExists(connection, username, email) {
    const [duplicates] = await connection.execute(
        `SELECT id FROM users WHERE username = ? OR email = ?`,
        [username, email]
    );

    if (duplicates.length > 0) {
        const error = new Error('User with same username or email already exist');
        error.status = 400;
        throw error;
    }
}

async function _sendConfirmationEmail(email, userId) {
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
        console.log("email sent with confirmation link : ", confirmationLink);

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de confirmation :', error);
    }
}

async function _sendPasswordResetEmail(email, token) {
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

    console.log("Sent mail to reset password : ", resetLink);

    await transporter.sendMail(mailOptions);
}

module.exports = {
    registerUser,
    confirmEmail,
    requestPasswordReset,
    confirmPasswordReset,
    loginUser,
};