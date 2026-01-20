const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendMessage, messageType } = require('../websockets/wsServer');
const { getUserPublicInfoByIdSqlStatement, getUserPreviewInfoSqlStatement } = require('../utils/users');
const { performUnlike } = require('../services/interactionService');

const router = express.Router();

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
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(statusCode).json({ error: message });
    }
});


router.post('/unlike', authenticateToken, async (req, res) => {
    try {
        const { to_user_id } = req.body;

        const [targetUser] = await db.execute('SELECT id FROM users WHERE id = ?', [to_user_id]);
        if (targetUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await performUnlike(req.user.id, to_user_id);

        sendMessage(req.user.id, to_user_id, null, messageType.UNLIKED);

        return res.json({ message: 'Unlike sent successfully' });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Obtenir la liste des matchs
router.get('/matches', authenticateToken, async (req, res) => {
  try{
    _throw400IfUserHasNoLocation(req.user);

    let query = getUserPreviewInfoSqlStatement + `, i.created_at as matched_at 
    FROM interactions i
    JOIN users u ON u.id = i.to_user_id
    WHERE i.from_user_id = ? AND i.is_match = TRUE
    ORDER BY i.created_at DESC`
    
    const [matches] = await db.execute(query,
      [req.user.location_latitude,
        req.user.location_longitude,
        req.user.location_latitude,
        req.user.id, req.user.id]);
    return res.json(matches);
    } catch (error){
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(statusCode).json({ error: message });
    }

});

function _throw400IfUserHasNoLocation(user) {
    if (!user.location_latitude || !user.location_longitude){
        const error = new Error('No location found for this user');
        error.status = 400;
        throw error;
    }
}

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
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(statusCode).json({ error: message });
    } 
});

// Obtenir les likes reçus
router.get('/likes-received', authenticateToken, async (req, res) => {
    try {
      _throw400IfUserHasNoLocation(req.user);
      console.log(req.user.location_latitude);
      let query = getUserPreviewInfoSqlStatement + `, i.created_at as liked_at 
        FROM interactions i
        JOIN users u ON u.id = i.from_user_id
        WHERE i.to_user_id = ? AND i.is_match = FALSE
        ORDER BY i.created_at DESC`

      const [likes] = await db.execute(query, [userLat, userLng, userLat, req.user.id, req.user.id]);

      res.json(likes);
    } catch (error) {
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(statusCode).json({ error: message });
    }
});

router.get('/likes-given', authenticateToken, async (req, res) => {
    try {
        userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
          [req.user.id]);
        if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
          throw ("could not get user location")
        }
        userLat = userLocation[0][0].location_latitude;
        userLng = userLocation[0][0].location_longitude;

        let query = getUserPreviewInfoSqlStatement + `, i.created_at as liked_at 
          FROM interactions i
          JOIN users u ON u.id = i.to_user_id
          WHERE i.from_user_id = ? AND i.is_match = FALSE
          ORDER BY i.created_at DESC`

        const [likes] = await db.execute(query, [userLat, userLng, userLat, req.user.id, req.user.id]);

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
      const statusCode = error.status || 500;
      const message = error.message || 'Internal Server Error';
      res.status(statusCode).json({ error: message });
  }
});


module.exports = router;
