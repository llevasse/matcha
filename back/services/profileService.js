const db = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

async function getUserPictures(userId) {
    const [pictures] = await db.execute(
        'SELECT id, file_path, is_main, uploaded_at FROM profile_pictures WHERE user_id = ? ORDER BY is_main DESC, uploaded_at DESC',
        [userId]
    );

    return pictures;
}

async function uploadPicture(userId, file) {
    if (!file) {
        const error = new Error('No file uploaded');
        error.status = 400;
        throw error;
    }

    const filePath = `/uploads/profiles/${file.filename}`;
    const isMain = await _isFirstPicture(userId);

    const [result] = await db.execute(
        'INSERT INTO profile_pictures (user_id, file_path, is_main) VALUES (?, ?, ?)',
        [userId, filePath, isMain]
    );

    return {
        id: result.insertId,
        file_path: filePath,
        is_main: isMain
    };
}

async function setMainPicture(userId, pictureId) {
    await _throw404IfPictureNotFound(userId, pictureId);

    await db.execute(
        'UPDATE profile_pictures SET is_main = FALSE WHERE user_id = ?',
        [userId]
    );

    await db.execute(
        'UPDATE profile_pictures SET is_main = TRUE WHERE id = ?',
        [pictureId]
    );
}

async function deletePicture(userId, pictureId) {
    const [pictures] = await db.execute(
        'SELECT file_path FROM profile_pictures WHERE id = ? AND user_id = ?',
        [pictureId, userId]
    );

    if (pictures.length === 0) {
        const error = new Error('Picture not found');
        error.status = 404;
        throw error;
    }

    const filePath = pictures[0].file_path;

    await db.execute(
        'DELETE FROM profile_pictures WHERE id = ?',
        [pictureId]
    );

    await _deletePhysicalFile(filePath);
}

async function _isFirstPicture(userId) {
    const [existingPictures] = await db.execute(
        'SELECT COUNT(*) as count FROM profile_pictures WHERE user_id = ?',
        [userId]
    );

    return existingPictures[0].count === 0;
}

async function _throw404IfPictureNotFound(userId, pictureId) {
    const [pictures] = await db.execute(
        'SELECT id FROM profile_pictures WHERE id = ? AND user_id = ?',
        [pictureId, userId]
    );

    if (pictures.length === 0) {
        const error = new Error('Picture not found');
        error.status = 404;
        throw error;
    }
}

async function _deletePhysicalFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        await fs.unlink(fullPath);
    } catch (fileError) {
        console.error('Error deleting file:', fileError);
    }
}

module.exports = {
    getUserPictures,
    uploadPicture,
    setMainPicture,
    deletePicture
};