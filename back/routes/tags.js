const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();


router.get('/', asyncHandler(async (req, res) => {
    const [tags] = await db.execute('SELECT * FROM tags ORDER BY name');
    res.json(tags);
}));


router.post('/', authenticateToken, asyncHandler(async (req, res) => {
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Tag name is required' });
        }

        const [result] = await db.execute(
            'INSERT INTO tags (name) VALUES (?)',
            [name.trim().toLowerCase()]
        );

        res.status(201).json({
            id: result.insertId,
            name: name.trim().toLowerCase(),
            message: 'Tag created successfully'
        });
}));


router.get('/user/:user_id', asyncHandler(async (req, res) => {
    const userId = req.params.user_id;

    const [userTags] = await db.execute(`
            SELECT t.id, t.name 
            FROM user_tags ut
            JOIN tags t ON ut.tag_id = t.id
            WHERE ut.user_id = ?
            ORDER BY t.name
        `, [userId]);
    // (SELECT JSON_ARRAYAGG(t.id, t.name) FROM user_tags ut JOIN tags t ON ut.tag_id = t.id WHERE ut.user_id = ? GROUP BY ut.user_id) as tags
    res.json(userTags);

}));


router.post('/user', authenticateToken, asyncHandler(async (req, res) => {
    const { tag_id } = req.body;

    
    const [tags] = await db.execute('SELECT id FROM tags WHERE id = ?', [tag_id]);
    if (tags.length === 0) {
        return res.status(404).json({ error: 'Tag not found' });
    }

    
    await db.execute(
        'INSERT IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)',
        [req.user.id, tag_id]
    );

    res.json({ message: 'Tag added successfully' });

}));


router.delete('/user/:tag_id', authenticateToken, asyncHandler(async (req, res) => {
    const tagId = req.params.tag_id;

    const [result] = await db.execute(
        'DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?',
        [req.user.id, tagId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Tag not found for this user' });
    }

    res.json({ message: 'Tag removed successfully' });
}));

module.exports = router;