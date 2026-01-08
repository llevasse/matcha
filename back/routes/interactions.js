const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendMessage, messageType } = require('../websockets/wsServer');
const { getUserPublicInfoByIdSqlStatement } = require('../utils/users');

const router = express.Router();

// Liker un utilisateur
router.post('/like', authenticateToken, async (req, res) => {
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot like yourself' });
        }

        // Vérifier si l'utilisateur cible existe
        const [targetUser] = await db.execute(
            'SELECT id FROM users WHERE id = ?',
            [to_user_id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Vérifier si l'interaction existe déjà
        const [existingInteraction] = await db.execute(
            'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
            [req.user.id, to_user_id]
        );

        if (existingInteraction.length > 0) {
            sendMessage(req.user.id, to_user_id, null, messageType.LIKED);   // TODO remove after test
          
            return res.status(400).json({ error: 'Already liked this user' });
        }

        // Vérifier si l'autre utilisateur nous a déjà liké
        const [reverseInteraction] = await db.execute(
            'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
            [to_user_id, req.user.id]
        );

        const isMatch = reverseInteraction.length > 0;

        // Créer l'interaction
        await db.execute(
            'INSERT INTO interactions (from_user_id, to_user_id, is_match) VALUES (?, ?, ?)',
            [req.user.id, to_user_id, isMatch]
        );

        // Si c'est un match, mettre à jour l'interaction inverse
        if (isMatch) {
            await db.execute(
                'UPDATE interactions SET is_match = TRUE WHERE from_user_id = ? AND to_user_id = ?',
                [to_user_id, req.user.id]
            );
        }
        
        // mettre a jour la fame de l'utilisateur liké
        await db.execute(
            'UPDATE users SET fame = fame + 10 WHERE id = ?',
            [to_user_id]
        );

        // mettre a jour la fame de l'utilisateur qui like
        await db.execute(
            'UPDATE users SET fame = fame + 3 WHERE id = ?',
            [req.user.id]
        );
        if (isMatch){
          sendMessage(to_user_id, req.user.id, null, messageType.MATCH);
          sendMessage(req.user.id, to_user_id, null, messageType.MATCH);
        }
        else{
          sendMessage(req.user.id, to_user_id, null, messageType.LIKED);
        }
        res.json({
            message: isMatch ? 'It\'s a match!' : 'Like sent successfully',
            is_match: isMatch
        });
    } catch (error) {
        throw error;
    }
});

// Unliker un utilisateur
router.post('/unlike', authenticateToken, async (req, res) => {
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot unlike yourself' });
        }

        // Vérifier si l'utilisateur cible existe
        const [targetUser] = await db.execute(
            'SELECT id FROM users WHERE id = ?',
            [to_user_id]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Vérifier si l'interaction existe
        const [existingInteraction] = await db.execute(
            'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
            [req.user.id, to_user_id]
        );

        if (existingInteraction.length == 0) {          
            return res.status(400).json({ error: 'No likes present' });
        }

        // Vérifier si l'autre utilisateur nous a liké
        const [reverseInteraction] = await db.execute(
            'SELECT id FROM interactions WHERE from_user_id = ? AND to_user_id = ?',
            [to_user_id, req.user.id]
        );

        const isMatch = reverseInteraction.length > 0;

        // Créer l'interaction
        await db.execute(
            'DELETE FROM interactions WHERE id = ?',
            [existingInteraction[0].id]
        );

        // Si c'est un match, mettre à jour l'interaction inverse
        if (isMatch) {
            await db.execute(
                'UPDATE interactions SET is_match = FALSE WHERE from_user_id = ? AND to_user_id = ?',
                [to_user_id, req.user.id]
            );
        }
        
        // mettre a jour la fame de l'utilisateur liké
        await db.execute(
            'UPDATE users SET fame = fame - 10 WHERE id = ?',
            [to_user_id]
        );

        // mettre a jour la fame de l'utilisateur qui like
        await db.execute(
            'UPDATE users SET fame = fame - 3 WHERE id = ?',
            [req.user.id]
        );
        
        sendMessage(req.user.id, to_user_id, null, messageType.UNLIKED);
        
        res.json({
            message: 'Unlike sent successfully',
        });
    } catch (error) {
        throw error;
    }
});


// Obtenir la liste des matchs
router.get('/matches', authenticateToken, async (req, res) => {
    try {
        userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
          [req.user.id]);
        if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
          throw ("could not get user location")
        }
        userLat = userLocation[0][0].location_latitude;
        userLng = userLocation[0][0].location_longitude;
        
        const [matches] = await db.execute(`
            SELECT u.id, u.username, u.bio, u.location_latitude, u.location_longitude, u.fame, pp.file_path as profile_picture,
                   i.created_at as matched_at,
                   (6371 * acos ( cos ( radians( ? ) ) * cos( radians( location_latitude ) ) 
                            * cos( radians( location_longitude ) - radians( ? ) ) 
                              + sin ( radians( ? ) ) * sin( radians( location_latitude ) ) ) ) AS distance
            FROM interactions i
            JOIN users u ON u.id = i.to_user_id
            LEFT JOIN profile_pictures pp ON u.id = pp.user_id AND pp.is_main = TRUE
            WHERE i.from_user_id = ? AND i.is_match = TRUE
            ORDER BY i.created_at DESC
        `, [userLat, userLng, userLat, req.user.id]);

        res.json(matches);
    } catch (error) {
        throw error;
    }
});

router.get('/matches/:user_id', authenticateToken, async (req, res) => {
  try {
    const [matches] = await db.execute(
      `SELECT is_match FROM interactions WHERE from_user_id = ? AND to_user_id = ? OR from_user_id = ? AND to_user_id = ?`,
      [req.params.user_id, req.user.id, req.user.id, req.params.user_id]
    );
    
    if (matches.length !== 2){  // Match is invalid even if there is only one entry stored in db
      return res.status(404).json({ error: 'Users are not matched' });
    }
    
    
    const [users] = await db.execute(
      getUserPublicInfoByIdSqlStatement,
      [req.params.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    throw error;
  }
});

// Obtenir les likes reçus
router.get('/likes-received', authenticateToken, async (req, res) => {
    try {
        userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
          [req.user.id]);
        if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
          throw ("could not get user location")
        }
        userLat = userLocation[0][0].location_latitude;
        userLng = userLocation[0][0].location_longitude;

        const [likes] = await db.execute(`
            SELECT u.id, u.username, u.bio, u.location_latitude, u.location_longitude, u.fame, pp.file_path as profile_picture,
                   i.created_at as liked_at,
                   (6371 * acos ( cos ( radians( ? ) ) * cos( radians( location_latitude ) ) 
                            * cos( radians( location_longitude ) - radians( ? ) ) 
                              + sin ( radians( ? ) ) * sin( radians( location_latitude ) ) ) ) AS distance
            FROM interactions i
            JOIN users u ON u.id = i.from_user_id
            LEFT JOIN profile_pictures pp ON u.id = pp.user_id AND pp.is_main = TRUE
            WHERE i.to_user_id = ? AND i.is_match = FALSE
            ORDER BY i.created_at DESC
        `, [userLat, userLng, userLat, req.user.id]);

        res.json(likes);
    } catch (error) {
        throw error;
    }
});

router.get('/likes-received/:user_id', authenticateToken, async (req, res) => {
  try {
    const [likes] = await db.execute(
      `SELECT * FROM interactions WHERE from_user_id = ? AND to_user_id = ? AND is_match = 0`,
      [req.params.user_id, req.user.id]
    );
    
    if (likes.length === 0){
      return res.status(404).json({ error: 'User did not like you.' });
    }
    
    
    const [users] = await db.execute(
      getUserPublicInfoByIdSqlStatement,
      [req.params.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    throw error;
  }
});


module.exports = router;
