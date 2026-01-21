const db = require('../config/database');

async function sendMessage(senderId, receiverId, content) {
    await _throw403IfNotMatched(senderId, receiverId);

    const [result] = await db.execute(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [senderId, receiverId, content]
    );

    return {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        sent_at: new Date()
    };
}

async function getConversation(userId, otherUserId, limit = 50, offset = 0) {
    await _throw403IfNotMatched(userId, otherUserId);

    const [messages] = await db.execute(`
        SELECT m.*, u.username as sender_username
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.id DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, [userId, otherUserId, otherUserId, userId]);

    return messages.reverse();
}

async function getConversations(userId) {
    const [conversations] = await db.execute(`
        SELECT 
            u.id, u.username, pp.file_path as profile_picture,
            m.content as last_message,
            m.sent_at as last_message_at,
            (SELECT COUNT(*) FROM messages 
             WHERE sender_id = u.id AND receiver_id = ? 
             AND sent_at > COALESCE(
                (SELECT MAX(sent_at) FROM messages WHERE sender_id = ? AND receiver_id = u.id), 
                '1970-01-01'
             )) as unread_count
        FROM users u
        JOIN interactions i ON (
            (i.from_user_id = u.id AND i.to_user_id = ?) OR 
            (i.from_user_id = ? AND i.to_user_id = u.id)
        ) AND i.is_match = TRUE
        LEFT JOIN profile_pictures pp ON u.id = pp.user_id AND pp.is_main = TRUE
        LEFT JOIN messages m ON (
            (m.sender_id = u.id AND m.receiver_id = ?) OR 
            (m.sender_id = ? AND m.receiver_id = u.id)
        )
        WHERE m.id = (
            SELECT MAX(id) FROM messages 
            WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
        ) OR m.id IS NULL
        ORDER BY m.sent_at DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    return conversations;
}

async function _throw403IfNotMatched(userId1, userId2) {
    const [match] = await db.execute(`
        SELECT 1 FROM interactions 
        WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
        AND is_match = TRUE
    `, [userId1, userId2, userId2, userId1]);

    if (match.length === 0) {
        const error = new Error('Can only message matched users');
        error.status = 403;
        throw error;
    }
}

module.exports = {
    sendMessage,
    getConversation,
    getConversations
};