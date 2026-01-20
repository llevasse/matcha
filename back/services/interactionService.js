const db = require('../config/database');

async function performUnlike(fromUserId, toUserId) {
    console.log("performUnlike");
    if (fromUserId == toUserId) {
        throw { status: 400, message: 'Cannot unlike yourself' };
    }

    const [existingInteraction] = await db.execute(
        'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
    );

    if (existingInteraction.length === 0) {
        const error = new Error('No existing interaction for this users');
        error.status = 404;
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

    console.log("performUnlike done");
}

module.exports = { performUnlike };