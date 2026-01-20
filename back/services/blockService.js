const db = require('../config/database');
const { performUnlike } = require('../services/interactionService');

async function blockUser(userId, toUserId) {

    await _throw404IfUserDoesNotExist(toUserId);

    await _throw204IfBlockAlreadyExist(userId, toUserId);

    await _addBlockToThisUser(userId, toUserId);

    await _unlikeAndUnmatchUsers(userId, toUserId);

}

async function unblockUser(userId, toUserId) {

    await _throw404IfUserDoesNotExist(toUserId);

    await _throw204IfUnblockAlreadyExist(userId, toUserId);

    await _addUnblockToThisUser(userId, toUserId);

}

async function reportUser(userId, toUserId) {

    await _throw404IfUserDoesNotExist(toUserId);

    await _throw204IfReportAlreadyExist(userId, toUserId);

    await _addBlockToThisUser(userId, toUserId);

    await _unlikeAndUnmatchUsers(userId, toUserId);

    await _addReportToThisUser(userId, toUserId);
}

async function hasBeenBlockedByOrIsBlocking(id1, id2) {

    const [result] = await db.execute(
        `SELECT id FROM blocks 
         WHERE (from_user_id = ? AND to_user_id = ?) 
            OR (from_user_id = ? AND to_user_id = ?)`,
        [id1, id2, id2, id1]
    );

    return result.length > 0;
}

async function _unlikeAndUnmatchUsers(userId, toUserId) {
    await _unlikeAndUnmatchUser(userId, toUserId);
    await _unlikeAndUnmatchUser(toUserId, userId);
}

async function _unlikeAndUnmatchUser(userId, toUserId) {
    try {
        await performUnlike(userId, toUserId);
    } catch (error) {
        if (error.status == 404) {
            return; //no existing like, it's ok
        }
        throw (error);
    }
}

async function _throw404IfUserDoesNotExist(toUserId) {
    if (!await _checkIfUserExist(toUserId)) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    };
}

async function _throw204IfBlockAlreadyExist(userId, toUserId) {
    if (await _checkIfBlockAlreadyExist(userId, toUserId)) {
        const error = new Error('User already blocked');
        error.status = 204;
        throw error;
    };
}

async function _throw204IfUnblockAlreadyExist(userId, toUserId) {
    if (! await _checkIfBlockAlreadyExist(userId, toUserId)) {
        const error = new Error('User already unblocked');
        error.status = 204;
        throw error;
    };
}

async function _throw204IfReportAlreadyExist(userId, toUserId) {
    if (await _checkIfReportAlreadyExist(userId, toUserId)) {
        const error = new Error('User already reported');
        error.status = 204;
        throw error;
    };
}

async function _addBlockToThisUser(userId, toUserId) {
    if (! await _checkIfBlockAlreadyExist(userId, toUserId)) {
        await db.execute(
            'INSERT INTO blocks (from_user_id, to_user_id) VALUES (?, ?)',
            [userId, toUserId]
        );
    }
}

async function _addUnblockToThisUser(userId, toUserId) {
    await db.execute(
        'DELETE FROM blocks WHERE from_user_id = ? AND to_user_id = ?',
        [userId, toUserId]
    );
}

async function _addReportToThisUser(userId, toUserId) {
    await db.execute(
        'INSERT INTO reports (from_user_id, to_user_id) VALUES (?, ?)',
        [userId, toUserId]
    );
}

async function _checkIfBlockAlreadyExist(userId, toUserId) {
    const [existingBlock] = await db.execute(
        'SELECT id FROM blocks WHERE from_user_id = ? AND to_user_id = ?',
        [userId, toUserId]
    );

    return (existingBlock.length > 0);
}

async function _checkIfReportAlreadyExist(userId, toUserId) {
    const [existingBlock] = await db.execute(
        'SELECT id FROM blocks WHERE from_user_id = ? AND to_user_id = ?',
        [userId, toUserId]
    );

    return (existingBlock.length > 0);
}

async function _checkIfUserExist(toUserId) {
    const [targetUser] = await db.execute(
        'SELECT id FROM users WHERE id = ?',
        [toUserId]
    );

    return (targetUser.length !== 0);
}

module.exports = { blockUser, unblockUser, reportUser, hasBeenBlockedByOrIsBlocking };