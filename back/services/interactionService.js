const db = require('../config/database');
const { getUserPublicInfoByIdSqlStatement, getUserPreviewInfoSqlStatement } = require('../utils/users');
const { sendMessage, messageType } = require('../websockets/wsServer');

async function performLike(fromUserId, toUserId) {
    if (toUserId == fromUserId) {
        const error = new Error('Cannot like yourself');
        error.status = 400;
        throw error;
    }

    await _throw404IfUserDoesNotExist(toUserId);
    await _throw400IfAlreadyLiked(fromUserId, toUserId);

    const isMatch = await _checkIfReverseInteractionExists(toUserId, fromUserId);
    await db.execute(
        'INSERT INTO interactions (from_user_id, to_user_id, is_match) VALUES (?, ?, ?)',
        [fromUserId, toUserId, isMatch]
    );

    if (isMatch) {
        await db.execute(
            'UPDATE interactions SET is_match = TRUE WHERE from_user_id = ? AND to_user_id = ?',
            [toUserId, fromUserId]
        );
    }

    await _updateFameOnLike(fromUserId, toUserId);
    await _sendLikeNotifications(fromUserId, toUserId, isMatch);

    return isMatch;
}

async function performDislike(fromUserId, toUserId) {

    _throw400ifUsersIdsAreTheSame(fromUserId, toUserId);

    const [existingInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
    );

    if (existingInteraction.length !== 0) {
        const error = new Error('Existing interaction for this users');
        error.status = 400;
        throw error;
    }

    await db.execute(
        'INSERT INTO interactions (from_user_id, to_user_id, is_like) VALUES (?, ?, FALSE)',
        [fromUserId, toUserId]
    );

    await db.execute('UPDATE users SET fame = fame - 3 WHERE id = ?', [toUserId]);

}

async function performUnlike(fromUserId, toUserId) {

    _throw400ifUsersIdsAreTheSame(fromUserId, toUserId);

    const [existingInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
    );

    if (existingInteraction.length === 0) {
        const error = new Error('No existing interaction for this users');
        error.status = 400;
        throw error;
    }

    const [reverseInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [toUserId, fromUserId]
    );
    const isMatch = reverseInteraction.length > 0;

    await db.execute('DELETE FROM interactions WHERE id = ?', [existingInteraction[0].id]);

    if (isMatch) {
        await db.execute(
            'UPDATE interactions SET is_match = FALSE WHERE from_user_id = ? AND to_user_id = ?',
            [toUserId, fromUserId]
        );
    }

    await db.execute('UPDATE users SET fame = fame - 10 WHERE id = ?', [toUserId]);
    await db.execute('UPDATE users SET fame = fame - 3 WHERE id = ?', [fromUserId]);

    sendMessage(fromUserId, toUserId, null, messageType.UNLIKED);
}

function _throw400ifUsersIdsAreTheSame(fromUserId, toUserId) {
    if (fromUserId == toUserId) {
        const error = new Error('fromUserId == toUserId');
        error.status = 400;
        throw error;
    }
}

async function getMatches(userId, userLocation) {
    _throw400IfUserHasNoLocation(userLocation);

    const query = getUserPreviewInfoSqlStatement + `, i.created_at as matched_at 
        FROM interactions i
        JOIN users u ON u.id = i.to_user_id
        WHERE i.from_user_id = ? AND i.is_match = TRUE
        ORDER BY i.created_at DESC`;

    const [matches] = await db.execute(query, [
        userLocation.latitude,
        userLocation.longitude,
        userLocation.latitude,
        userId,
        userId
    ]);

    return matches;
}

async function getMatchDetails(requesterId, targetUserId) {
    const [matches] = await db.execute(
        `SELECT is_match FROM interactions WHERE from_user_id = ? AND to_user_id = ? OR from_user_id = ? AND to_user_id = ?`,
        [targetUserId, requesterId, requesterId, targetUserId]
    );

    if (matches.length !== 2) {
        const error = new Error('Users are not matched');
        error.status = 404;
        throw error;
    }

    const [users] = await db.execute(getUserPublicInfoByIdSqlStatement, [targetUserId]);

    if (users.length === 0) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return users[0];
}

async function getLikesReceived(userId, userLocation) {
    _throw400IfUserHasNoLocation(userLocation);

    const query = getUserPreviewInfoSqlStatement + `, i.created_at as liked_at 
        FROM interactions i
        JOIN users u ON u.id = i.from_user_id
        WHERE i.to_user_id = ? AND i.is_match = FALSE
        ORDER BY i.created_at DESC`;

    const [likes] = await db.execute(query, [
        userLocation.latitude,
        userLocation.longitude,
        userLocation.latitude,
        userId,
        userId
    ]);

    return likes;
}

async function getLikesGiven(userId) {
    const userLocation = await db.execute(
        `SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
        [userId]
    );

    if (userLocation.length === 0 ||
        userLocation[0][0].location_latitude === undefined ||
        userLocation[0][0].location_longitude === undefined) {
        const error = new Error('Could not get user location');
        error.status = 400;
        throw error;
    }

    const userLat = userLocation[0][0].location_latitude;
    const userLng = userLocation[0][0].location_longitude;

    const query = getUserPreviewInfoSqlStatement + `, i.created_at as liked_at 
        FROM interactions i
        JOIN users u ON u.id = i.to_user_id
        WHERE i.from_user_id = ? AND i.is_match = FALSE AND i.is_like = TRUE
        ORDER BY i.created_at DESC`;

    const [likes] = await db.execute(query, [userLat, userLng, userLat, userId, userId]);

    return likes;
}

async function getLikeReceivedDetails(requesterId, likerUserId) {
    const [likes] = await db.execute(
        `SELECT * FROM interactions WHERE from_user_id = ? AND to_user_id = ? AND is_match = 0`,
        [likerUserId, requesterId]
    );

    if (likes.length === 0) {
        const error = new Error('User did not like you.');
        error.status = 404;
        throw error;
    }

    const [users] = await db.execute(getUserPublicInfoByIdSqlStatement, [likerUserId]);

    if (users.length === 0) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return users[0];
}

async function _throw404IfUserDoesNotExist(userId) {
    const [targetUser] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);

    if (targetUser.length === 0) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }
}

async function _throw400IfAlreadyLiked(fromUserId, toUserId) {
    const [existingInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
    );

    if (existingInteraction.length > 0) {
        const error = new Error('Already liked this user');
        error.status = 400;
        throw error;
    }
}

async function _checkIfReverseInteractionExists(fromUserId, toUserId) {
    const [reverseInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
    );

    return reverseInteraction.length > 0;
}

async function _updateFameOnLike(fromUserId, toUserId) {
    await db.execute('UPDATE users SET fame = fame + 10 WHERE id = ?', [toUserId]);
    await db.execute('UPDATE users SET fame = fame + 3 WHERE id = ?', [fromUserId]);
}

async function _sendLikeNotifications(fromUserId, toUserId, isMatch) {
    if (isMatch) {
        sendMessage(toUserId, fromUserId, null, messageType.MATCH);
        sendMessage(fromUserId, toUserId, null, messageType.MATCH);
    } else {
        sendMessage(fromUserId, toUserId, null, messageType.LIKED);
    }
}

function _throw400IfUserHasNoLocation(userLocation) {
    if (!userLocation.latitude || !userLocation.longitude) {
        const error = new Error('No location found for this user');
        error.status = 400;
        throw error;
    }
}

module.exports = {
    performLike,
    performUnlike,
    performDislike,
    getMatches,
    getMatchDetails,
    getLikesReceived,
    getLikesGiven,
    getLikeReceivedDetails
};