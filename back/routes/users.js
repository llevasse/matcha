const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { validateProfileUpdate } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { getUserPrivateInfoByIdSqlStatement, getUserPublicInfoByIdSqlStatement, getUserPreviewInfoSqlStatement } = require('../utils/users');
const { hasBeenBlockedByOrIsBlocking } = require('../services/blockService');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
        const [users] = await db.execute(getUserPrivateInfoByIdSqlStatement, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;
        res.json(users[0]);

}));

// Obtenir les info d'un utilisateur
router.get('/profile/:user_id', authenticateToken, asyncHandler(async (req, res) => {
        const { user_id } = req.params;
        if (await hasBeenBlockedByOrIsBlocking(user_id, req.user.id)){
          return res.status(404).json({ error: 'User not found' });
        }

        const [users] = await db.execute(getUserPublicInfoByIdSqlStatement, [req.params.user_id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[0].birthdate = users[0].birthdate ? users[0].birthdate.toISOString().split('T')[0] : null;
        res.json(users[0]);

}));

router.post('/profile', authenticateToken, validateProfileUpdate, asyncHandler(async (req, res) => {
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
        updateProfileValidity(userId);
        

        await connection.commit();
        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
      await connection.rollback();
      // console.error(error);
      res.status(400).json({ error: error.message });
    } finally {
      connection.release();
    }
}));

router.post('/add_to_history', authenticateToken, asyncHandler(async (req, res) => {
  const { user_id } = req.body;
  const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [user_id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User does not exist' });
  }
  try{
    await db.execute('INSERT INTO viewing_history (viewer_user_id, viewed_user_id) VALUES (?, ?)', [req.user.id, user_id]);
    res.json({ message: 'Successfully added to history' });
  }catch(e){
    console.log(e);
    return res.status(400).json({ error: 'Error occured' });
  }
}));

router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
  try{    
    const [users] = await db.execute(`
      SELECT vh.viewer_user_id AS viewer_id, vh.viewed_user_id AS viewed_id, vh.created_at AS time,
        (SELECT u.username FROM users u WHERE u.id = vh.viewer_user_id) as viewer_name,
        (SELECT pp.file_path FROM profile_pictures pp WHERE pp.user_id = vh.viewer_user_id AND is_main=TRUE LIMIT 1) AS viewer_pfp,
        (SELECT u.username FROM users u WHERE u.id = vh.viewed_user_id) as viewed_name,
        (SELECT pp.file_path FROM profile_pictures pp WHERE pp.user_id = vh.viewed_user_id AND is_main=TRUE LIMIT 1) AS viewed_pfp
      FROM viewing_history vh 
      WHERE vh.viewer_user_id = ? OR vh.viewed_user_id = ?`,
      [req.user.id, req.user.id]);
    if (users.length === 0) {
      return res.status(204).json([]);
    }
    return res.json(users);
  }catch(e){
    console.log(e);
    return res.status(400).json({ error: 'Error occured' });
  }
}));

async function updateProfileValidity(userId){
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
            `UPDATE users SET is_valid = ? WHERE id = ?`,
      [is_confirmed, userId]
  );
  console.log(`User with id = ${userId} is confirmed status is now : ${is_confirmed}!`);
}

router.put('/password', authenticateToken, asyncHandler(async (req, res) => {
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
}));

async function _getInterestBlackWhiteList(whitelist_interest, blacklist_interest, user_id){
  var interest_whitelist_user_id_list = [];
  var interest_blacklist_user_id_list = [];
  var whitelist_interest_list = [];
  var blacklist_interest_list = [];
  if (whitelist_interest){
    whitelist_interest_list = whitelist_interest.split(",");
  }
  if (blacklist_interest){
    blacklist_interest_list = blacklist_interest.split(",");
  }
  
  if (whitelist_interest && blacklist_interest){
    var common_interest_list = blacklist_interest_list.filter((element)=>{
      return whitelist_interest_list.includes(element);
    });
    whitelist_interest_list = whitelist_interest_list.filter((element)=>{return !common_interest_list.includes(element)});
    blacklist_interest_list = blacklist_interest_list.filter((element)=>{return !common_interest_list.includes(element)});
  }
  
  if (whitelist_interest_list.length > 0){
    whitelist_interest_list.forEach((value, index)=>{whitelist_interest_list[index] = Number.parseInt(value)});
    var tokens = new Array(whitelist_interest_list.length).fill('?').join(',');
    whitelist_interest_list.push(user_id);
    interest_query = `SELECT DISTINCT user_id FROM user_tags WHERE tag_id IN (${tokens}) AND user_id != ?`
    result = await db.execute(interest_query, whitelist_interest_list);
    
    result[0].forEach((element)=>{
      interest_whitelist_user_id_list.push(element['user_id']);
    });
  }
  
  if (blacklist_interest_list.length > 0){
    blacklist_interest_list.forEach((value, index)=>{blacklist_interest_list[index] = Number.parseInt(value)});
    var tokens = new Array(blacklist_interest_list.length).fill('?').join(',');
    blacklist_interest_list.push(user_id);
    interest_query = `SELECT DISTINCT user_id FROM user_tags WHERE tag_id IN (${tokens}) AND user_id != ?`
    result = await db.execute(interest_query, blacklist_interest_list);
    
    result[0].forEach((element)=>{
      interest_blacklist_user_id_list.push(element['user_id']);
    });
  }
  
  if (whitelist_interest && blacklist_interest){
    var common_interest_list = interest_blacklist_user_id_list.filter((element)=>{
      return interest_whitelist_user_id_list.includes(element);
    });
    interest_whitelist_user_id_list = interest_whitelist_user_id_list.filter((element)=>{return !common_interest_list.includes(element)});
    interest_blacklist_user_id_list = interest_blacklist_user_id_list.filter((element)=>{return !common_interest_list.includes(element)});
  }
  return [interest_whitelist_user_id_list, interest_blacklist_user_id_list];
}

const allowed_sort_value = [
  "age_ascending",
  "age_descending",
  "distance_ascending",
  "distance_descending",
  "interest_ascending",
  "interest_descending",
  "fame_ascending",
  "fame_descending",
]

router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
        const { age_min, age_max, fame_min, fame_max, whitelist_interest, blacklist_interest, radius = 42, city, lat, lon, sort_by, limit = 20, offset = 0 } = req.query;

        [interest_whitelist_user_id_list, interest_blacklist_user_id_list] = await _getInterestBlackWhiteList(whitelist_interest, blacklist_interest, req.user.id)
      
        let order = "ASC";
        let order_by = "u.created_at";
        
        switch(sort_by){
          case "age_ascending": {
            order_by = "age";
            break;
          }
          case "distance_ascending": {
            order_by = "distance";
            break;
          }
          case "interest_ascending": {
            order_by = "nb_tag_in_common";
            break;
          }
          case "fame_ascending": {
            order_by = "u.fame";
            break;
          }
          case "age_descending": {
            order = "DESC";
            order_by = "age";
            break;
          }
          case "distance_descending": {
            order = "DESC";
            order_by = "distance";
            break;
          }
          case "interest_descending": {
            order = "DESC";
            order_by = "nb_tag_in_common";
            break;
          }
          case "fame_descending": {
            order = "DESC";
            order_by = "u.fame";
            break;
          }
          default:{
            order = "DESC";
            order_by = "u.created_at";
          }
        }
        
        let searchOriginLat, searchOriginLon;
        
        if (lat && lon){
          searchOriginLat = lat;
          searchOriginLon = lon;
        }else{
          let userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
            [req.user.id]);
          
          if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
            res.status(400).json({message : "could not get user location",users : []}).end();
            return ;
          }
          if (age_min && parseInt(age_min) < 18){
            res.status(400).json({message : "There is no underage user allowed in this site.", users : []}).end();
            return ;
          }
          
          searchOriginLat = userLocation[0][0].location_latitude;
          searchOriginLon = userLocation[0][0].location_longitude;
        }
        

        let query = getUserPreviewInfoSqlStatement + ` FROM users u WHERE u.id != ? AND u.is_confirmed=true`;
        
        // this SQL clause is responsible for only returning users client has not liked/is matched with
        query += ` AND u.id NOT IN (SELECT i.from_user_id from interactions i where i.to_user_id = ?)`
        // This SQL clause is responsible for only return users gender that req.user is attracted to
        query += ` AND u.gender_id IN (SELECT up.gender_id FROM user_preferences up WHERE up.user_id = ?)`
        // This SQL clause is responsible for only return users that are attracted to the req.user gender
        query += ` AND u.id IN (SELECT up.user_id FROM user_preferences up where up.gender_id = ?)`

        //This filters blocked users ( or the users that have blocked the user)
        query += ` AND u.id NOT IN (
            SELECT to_user_id FROM blocks WHERE from_user_id = ?
            UNION
            SELECT from_user_id FROM blocks WHERE to_user_id = ?
        )`;

        const params = [
            searchOriginLat, 
            searchOriginLon, 
            searchOriginLat,
            req.user.id, 
            req.user.id, 
            req.user.id, 
            req.user.id, 
            req.user.gender_id,
            req.user.id,
            req.user.id
        ];       

        if (interest_whitelist_user_id_list.length > 0){
          var tokens = new Array(interest_whitelist_user_id_list.length).fill('?').join(',');
        
          query += ` AND u.id IN (${tokens})`;
          interest_whitelist_user_id_list.forEach((element)=>{
            params.push(element);
          });
        }
        
        if (interest_blacklist_user_id_list.length > 0){
          var tokens = new Array(interest_blacklist_user_id_list.length).fill('?').join(',');
        
          query += ` AND u.id NOT IN (${tokens})`;
          interest_blacklist_user_id_list.forEach((element)=>{
            params.push(element);
          });
        }
        
        if (fame_min) {
            query += ' AND u.fame >= ?';
            params.push(fame_min);
          }
        if (fame_max) {
          query += ' AND u.fame <= ?';
          params.push(fame_max);
        }
        
        if (city) {
          query += ' AND u.city LIKE ?';
          params.push(`%${city}%`);
        }        
        
        // Every query adition from here are in the HAVING clause
        
        query += ` HAVING distance < ${radius}`
        
        // age clause needs to be in HAVING section because 'age' is an alias
        if (age_min) {
            query += ' AND age >= ?';
            params.push(age_min);
        }
        if (age_max) {
            query += ' AND age <= ?';
            params.push(age_max);
        }
        
        query += ` ORDER BY ${order_by} ${order} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [users] = await db.execute(query,params);
        res.json(users);

}));

module.exports = {router, checkProfileValidity: updateProfileValidity};
