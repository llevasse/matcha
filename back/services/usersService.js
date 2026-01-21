const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { getUserPrivateInfoByIdSqlStatement, getUserPublicInfoByIdSqlStatement, getUserPreviewInfoSqlStatement } = require('../utils/users');
const { hasBeenBlockedByOrIsBlocking } = require('./blockService');

async function getPrivateProfile(userId) {
    const [users] = await db.execute(getUserPrivateInfoByIdSqlStatement, [userId]);

    if (users.length === 0) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;
    return users[0];
}

async function getPublicProfile(requesterId, targetUserId) {
    if (await hasBeenBlockedByOrIsBlocking(targetUserId, requesterId)) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    const [users] = await db.execute(getUserPublicInfoByIdSqlStatement, [targetUserId]);

    if (users.length === 0) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;
    return users[0];
}

async function updateProfile(userId, profileData) {
    const connection = await db.getConnection();

    try {
        const { username, firstname, lastname, email, bio, city, gender, preferences, birthdate, location_latitude, location_longitude } = profileData;

        await connection.beginTransaction();

        await _validateAge(birthdate);
        const genderId = await _getGenderId(connection, gender);
        
        await connection.execute(
            `UPDATE users SET username = ?, firstname = ?, lastname = ?, email = ?, bio = ?, city = ?, gender_id = ?, birthdate = ?, location_latitude = ?, location_longitude = ? WHERE id = ?`,
            [username, firstname, lastname, email, bio, city, genderId, birthdate, location_latitude, location_longitude, userId]
        );
        await connection.commit();

        await _updateUserPreferences(connection, userId, preferences);
        await updateProfileValidity(userId);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updatePassword(userId, currentPassword, newPassword) {
    const [users] = await db.execute(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
    );

    const user = users[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
        const error = new Error('Current password is incorrect');
        error.status = 400;
        throw error;
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
    );
}

async function addToViewingHistory(viewerId, viewedUserId) {
    await _throw404IfUserDoesNotExist(viewedUserId);

    await db.execute(
        'INSERT INTO viewing_history (viewer_user_id, viewed_user_id) VALUES (?, ?)',
        [viewerId, viewedUserId]
    );
}

async function getViewingHistory(userId) {
    const [users] = await db.execute(`
        SELECT vh.viewer_user_id AS viewer_id, vh.viewed_user_id AS viewed_id, vh.created_at AS time,
            (SELECT u.username FROM users u WHERE u.id = vh.viewer_user_id) as viewer_name,
            (SELECT pp.file_path FROM profile_pictures pp WHERE pp.user_id = vh.viewer_user_id AND is_main=TRUE LIMIT 1) AS viewer_pfp,
            (SELECT u.username FROM users u WHERE u.id = vh.viewed_user_id) as viewed_name,
            (SELECT pp.file_path FROM profile_pictures pp WHERE pp.user_id = vh.viewed_user_id AND is_main=TRUE LIMIT 1) AS viewed_pfp
        FROM viewing_history vh 
        WHERE vh.viewer_user_id = ? OR vh.viewed_user_id = ?`,
        [userId, userId]
    );

    return users;
}

async function searchUsers(userId, userGenderId, searchParams) {
    const { age_min, age_max, fame_min, fame_max, whitelist_interest, blacklist_interest, radius = 42, city, lat, lon, sort_by, limit = 20, offset = 0 } = searchParams;

    const [interestWhitelist, interestBlacklist] = await _getInterestBlackWhiteList(whitelist_interest, blacklist_interest, userId);
    const { orderBy, order } = _getSortingParams(sort_by);
    const { searchOriginLat, searchOriginLon } = await _getSearchOrigin(userId, lat, lon, age_min);

    const { query, params } = _buildSearchQuery(
        userId,
        userGenderId,
        searchOriginLat,
        searchOriginLon,
        interestWhitelist,
        interestBlacklist,
        { age_min, age_max, fame_min, fame_max, city, radius },
        orderBy,
        order,
        limit,
        offset
    );

    const [users] = await db.execute(query, params);
    return users;
}

async function updateProfileValidity(userId) {
    let isConfirmed = true;
    const connection = await db.getConnection();

    const [users] = await connection.execute(
        `SELECT id, username, firstname, lastname, birthdate FROM users WHERE id = ?`,
        [userId]
    );

    if (users.length !== 0) {
        Object.values(users[0]).forEach((value) => {
            if (value == null || value == undefined) {
                isConfirmed = false;
            }
        });
    }

    const [pictures] = await connection.execute(
        'SELECT id FROM profile_pictures WHERE user_id = ? LIMIT 1',
        [userId]
    );

    if (pictures.length === 0) {
        isConfirmed = false;
    }

    await connection.execute(
        `UPDATE users SET is_valid = ? WHERE id = ?`,
        [isConfirmed, userId]
    );
    await connection.commit();
    connection.release();
}

async function _throw404IfUserDoesNotExist(userId) {
    const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
        const error = new Error('User does not exist');
        error.status = 404;
        throw error;
    }
}

async function _validateAge(birthdate) {
    const dob = Date.parse(birthdate);
    const maxDob = new Date(Date.parse((new Date()).toDateString()));
    maxDob.setFullYear(maxDob.getFullYear() - 18);

    if (dob - maxDob > 0) {
        throw new Error("User must be at least 18 years old.");
    }
}

async function _getGenderId(connection, gender) {
    const [genderRows] = await connection.execute(
        `SELECT id FROM genders WHERE label = ?`,
        [gender]
    );

    if (genderRows.length === 0) {
        throw new Error("Genre invalide.");
    }

    return genderRows[0].id;
}

async function _updateUserPreferences(connection, userId, preferences) {
    await connection.execute(
        `DELETE FROM user_preferences WHERE user_id = ?`,
        [userId]
    );

    for (const prefLabel of preferences) {
        const [prefRows] = await connection.execute(
            `SELECT id FROM genders WHERE label = ?`,
            [prefLabel]
        );

        if (prefRows.length === 0) {
            throw new Error(`Préférence invalide: ${prefLabel}`);
        }

        const prefId = prefRows[0].id;
        await connection.execute(
            `INSERT INTO user_preferences (user_id, gender_id) VALUES (?, ?)`,
            [userId, prefId]
        );
    }
}

async function _getInterestBlackWhiteList(whitelistInterest, blacklistInterest, userId) {
    let interestWhitelistUserIdList = [];
    let interestBlacklistUserIdList = [];
    let whitelistInterestList = [];
    let blacklistInterestList = [];

    if (whitelistInterest) {
        whitelistInterestList = whitelistInterest.split(",");
    }
    if (blacklistInterest) {
        blacklistInterestList = blacklistInterest.split(",");
    }

    if (whitelistInterest && blacklistInterest) {
        const commonInterestList = blacklistInterestList.filter((element) => {
            return whitelistInterestList.includes(element);
        });
        whitelistInterestList = whitelistInterestList.filter((element) => !commonInterestList.includes(element));
        blacklistInterestList = blacklistInterestList.filter((element) => !commonInterestList.includes(element));
    }

    if (whitelistInterestList.length > 0) {
        interestWhitelistUserIdList = await _getUserIdsByInterests(whitelistInterestList, userId);
    }

    if (blacklistInterestList.length > 0) {
        interestBlacklistUserIdList = await _getUserIdsByInterests(blacklistInterestList, userId);
    }

    if (whitelistInterest && blacklistInterest) {
        const commonInterestList = interestBlacklistUserIdList.filter((element) => {
            return interestWhitelistUserIdList.includes(element);
        });
        interestWhitelistUserIdList = interestWhitelistUserIdList.filter((element) => !commonInterestList.includes(element));
        interestBlacklistUserIdList = interestBlacklistUserIdList.filter((element) => !commonInterestList.includes(element));
    }

    return [interestWhitelistUserIdList, interestBlacklistUserIdList];
}

async function _getUserIdsByInterests(interestList, userId) {
    const userIdList = [];
    interestList.forEach((value, index) => {
        interestList[index] = Number.parseInt(value);
    });

    const tokens = new Array(interestList.length).fill('?').join(',');
    interestList.push(userId);

    const interestQuery = `SELECT DISTINCT user_id FROM user_tags WHERE tag_id IN (${tokens}) AND user_id != ?`;
    const result = await db.execute(interestQuery, interestList);

    result[0].forEach((element) => {
        userIdList.push(element['user_id']);
    });

    return userIdList;
}

function _getSortingParams(sortBy) {
    let order = "ASC";
    let orderBy = "u.created_at";

    switch (sortBy) {
        case "age_ascending":
            orderBy = "age";
            break;
        case "distance_ascending":
            orderBy = "distance";
            break;
        case "interest_ascending":
            orderBy = "nb_tag_in_common";
            break;
        case "fame_ascending":
            orderBy = "u.fame";
            break;
        case "age_descending":
            order = "DESC";
            orderBy = "age";
            break;
        case "distance_descending":
            order = "DESC";
            orderBy = "distance";
            break;
        case "interest_descending":
            order = "DESC";
            orderBy = "nb_tag_in_common";
            break;
        case "fame_descending":
            order = "DESC";
            orderBy = "u.fame";
            break;
        default:
            order = "DESC";
            orderBy = "u.created_at";
    }

    return { orderBy, order };
}

async function _getSearchOrigin(userId, lat, lon, ageMin) {
    let searchOriginLat, searchOriginLon;

    if (lat && lon) {
        searchOriginLat = lat;
        searchOriginLon = lon;
    } else {
        const userLocation = await db.execute(
            `SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
            [userId]
        );

        if (userLocation.length === 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined) {
            const error = new Error("Could not get user location");
            error.status = 400;
            throw error;
        }

        searchOriginLat = userLocation[0][0].location_latitude;
        searchOriginLon = userLocation[0][0].location_longitude;
    }

    if (ageMin && parseInt(ageMin) < 18) {
        const error = new Error("There is no underage user allowed in this site.");
        error.status = 400;
        throw error;
    }

    return { searchOriginLat, searchOriginLon };
}

function _buildSearchQuery(userId, userGenderId, searchOriginLat, searchOriginLon, interestWhitelist, interestBlacklist, filters, orderBy, order, limit, offset) {
    let query = getUserPreviewInfoSqlStatement + ` FROM users u WHERE u.id != ? AND u.is_confirmed=true`;

    query += ` AND u.id NOT IN (SELECT i.from_user_id from interactions i where i.to_user_id = ?)`;
    query += ` AND u.gender_id IN (SELECT up.gender_id FROM user_preferences up WHERE up.user_id = ?)`;
    query += ` AND u.id IN (SELECT up.user_id FROM user_preferences up where up.gender_id = ?)`;
    query += ` AND u.id NOT IN (
        SELECT to_user_id FROM blocks WHERE from_user_id = ?
        UNION
        SELECT from_user_id FROM blocks WHERE to_user_id = ?
    )`;

    const params = [
        searchOriginLat,
        searchOriginLon,
        searchOriginLat,
        userId,
        userId,
        userId,
        userId,
        userGenderId,
        userId,
        userId
    ];

    if (interestWhitelist.length > 0) {
        const tokens = new Array(interestWhitelist.length).fill('?').join(',');
        query += ` AND u.id IN (${tokens})`;
        interestWhitelist.forEach((element) => {
            params.push(element);
        });
    }

    if (interestBlacklist.length > 0) {
        const tokens = new Array(interestBlacklist.length).fill('?').join(',');
        query += ` AND u.id NOT IN (${tokens})`;
        interestBlacklist.forEach((element) => {
            params.push(element);
        });
    }

    if (filters.fame_min) {
        query += ' AND u.fame >= ?';
        params.push(filters.fame_min);
    }
    if (filters.fame_max) {
        query += ' AND u.fame <= ?';
        params.push(filters.fame_max);
    }

    if (filters.city) {
        query += ' AND u.city LIKE ?';
        params.push(`%${filters.city}%`);
    }

    query += ` HAVING distance < ${filters.radius}`;

    if (filters.age_min) {
        query += ' AND age >= ?';
        params.push(filters.age_min);
    }
    if (filters.age_max) {
        query += ' AND age <= ?';
        params.push(filters.age_max);
    }

    query += ` ORDER BY ${orderBy} ${order} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    return { query, params };
}

module.exports = {
    getPrivateProfile,
    getPublicProfile,
    updateProfile,
    updatePassword,
    addToViewingHistory,
    getViewingHistory,
    searchUsers,
    updateProfileValidity
};