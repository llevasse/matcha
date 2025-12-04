const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { validateProfileUpdate } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, firstname, lastname, email, gender_id, bio, birthdate,
                    city, location_latitude, location_longitude, fame, is_confirmed, created_at 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;

        const [rows] = await db.execute(
            `SELECT g.label
            FROM user_preferences up
            JOIN genders g ON up.gender_id = g.id
            WHERE up.user_id = ?`,
            [req.user.id]
        );
        users[0].preferences = rows.map(r => r.label);

        const [gender] = await db.execute(
            `SELECT label FROM genders WHERE id = ?`,
            [users[0].gender_id]
        );
        if (gender.length == 0)
          users[0].gender = null;
        else
          users[0].gender = gender[0].label;
        
        res.json(users[0]);
    } catch (error) {
        throw error;
    }
});

// Obtenir les info d'un utilisateur
router.get('/profile/:user_id', async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, firstname, lastname, gender_id, bio, birthdate, 
                    city, location_latitude, location_longitude, fame, last_connection_date, is_confirmed, created_at 
             FROM users WHERE id = ?`,
            [req.params.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;

        const [rows] = await db.execute(
            `SELECT g.label
            FROM user_preferences up
            JOIN genders g ON up.gender_id = g.id
            WHERE up.user_id = ?`,
            [req.params.user_id]
        );
        users[0].preferences = rows.map(r => r.label);

        const [gender] = await db.execute(
            `SELECT label FROM genders WHERE id = ?`,
            [users[0].gender_id]
        );
        if (gender.length == 0)
          users[0].gender = null;
        else
          users[0].gender = gender[0].label;

        res.json(users[0]);
    } catch (error) {
        throw error;
    }
});

router.post('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { username, firstname, lastname, email, bio, city, gender, preferences, birthdate, location_latitude, location_longitude } = req.body;
      const userId = req.user.id;
      
        await connection.beginTransaction();
        
        dob = Date.parse(birthdate);
        
        maxDob = new Date(Date.parse((new Date()).toDateString()));
        maxDob.setFullYear(maxDob.getFullYear() - 18);
        if (dob - maxDob > 0){
            throw new Error("User must be at least 18 years old.");
        }

        // Trouver l'id du genre principal
        const [genderRows] = await connection.execute(
            `SELECT id FROM genders WHERE label = ?`,
            [gender]
        );
        if (genderRows.length === 0) {
            throw new Error("Genre invalide.");
        }
        const genderId = genderRows[0].id;

        await connection.execute(
            `UPDATE users SET username = ?, firstname = ?, lastname = ?, email = ?, bio = ?, city = ?, gender_id = ?, birthdate = ?, location_latitude = ?, location_longitude = ? WHERE id = ?`,
            [username, firstname, lastname, email, bio, city, genderId, birthdate, location_latitude, location_longitude, userId]
        );

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
        checkProfileValidity(userId);
        

        await connection.commit();
        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
      await connection.rollback();
      // console.error(error);
      res.status(400).json({ error: error.message });
    } finally {
      connection.release();
    }
});

async function checkProfileValidity(userId){
  var is_confirmed = true;	
  const connection = await db.getConnection();  
  const [users] = await connection.execute(
      `SELECT id, username, firstname, lastname, birthdate
        FROM users WHERE id = ?`,
      [userId]
  );
  if (users.length != 0){
    Object.values(users[0]).forEach((value)=>{
      if (value == null || value == undefined){
        is_confirmed = false;
      }
    });
  }

  const [pictures] = await db.execute(
      'SELECT id FROM profile_pictures WHERE user_id = ? LIMIT 1',
      [userId]
  );
  if (pictures.length == 0){   // bug when pictures are uploaded for the first time, need further checking
      is_confirmed = false;
      console.log("User need at least one picture to be confirmed")
  }
  
  await connection.execute(
            `UPDATE users SET is_confirmed = ? WHERE id = ?`,
      [is_confirmed, userId]
  );
  console.log(`User with id = ${userId} is confirmed status is now : ${is_confirmed}!`);
}

// Changer le mot de passe
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Vérifier le mot de passe actuel
        const [users] = await db.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        const user = users[0];
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hasher le nouveau mot de passe
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Mettre à jour
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, req.user.id]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        throw error;
    }
});

// Rechercher des utilisateurs
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { age_min, age_max, radius = 42, city, limit = 20, offset = 0 } = req.query;

        userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
          [req.user.id]);
        if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
          throw ("could not get user location")
        }
        userLat = userLocation[0][0].location_latitude;
        userLng = userLocation[0][0].location_longitude;

        let query = `
            SELECT u.id, u.username, u.bio, u.birthdate, u.city, u.location_latitude, u.location_longitude, u.gender_id, u.fame,
              (6371 * acos ( cos ( radians( ? ) ) * cos( radians( location_latitude ) ) 
                            * cos( radians( location_longitude ) - radians( ? ) ) 
                              + sin ( radians( ? ) ) * sin( radians( location_latitude ) ) ) ) AS distance,
                   pp.file_path as profile_picture
            FROM users u LEFT JOIN profile_pictures pp ON u.id = pp.user_id AND pp.is_main = TRUE
            WHERE u.id != ? AND u.is_confirmed=true
        `;
        const params = [userLat, userLng, userLat, req.user.id];
        
        if (age_min || age_max) {
            if (age_min) {
                query += ' AND TIMESTAMPDIFF(YEAR, u.birthdate, CURDATE()) >= ?';
                params.push(age_min);
            }
            if (age_max) {
                query += ' AND TIMESTAMPDIFF(YEAR, u.birthdate, CURDATE()) <= ?';
                params.push(age_max);
            }
        }

        if (city) {
            query += ' AND u.city LIKE ?';
            params.push(`%${city}%`);
        }

        query += `HAVING distance < ${radius} ORDER BY u.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [users] = await db.execute(query,params);
        res.json(users);
    } catch (error) {
        throw error;
    }
});

module.exports = {router, checkProfileValidity};
