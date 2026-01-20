const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { blockUser } = require('../services/blockService');
const { getUserPublicInfoSqlStatement, getUserPreviewInfoSqlStatement } = require('../utils/users');

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { to_user_id } = req.body;

        if (to_user_id == req.user.id) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        await blockUser(req.user.id, to_user_id);

        res.status(201).json({
            message: 'The user specified has been successfully blocked',
            userId: to_user_id,
        });
    } catch (error) {
        console.log("error catched :", error);
        const statusCode = error.status || 500;
        const message = error.message || 'Internal Server Error';
        
        res.status(statusCode).json({ error: message });
        }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log("Get blocked user received from user with id : ", req.user.id);
    const userLocation = await db.execute(`SELECT id, location_latitude, location_longitude FROM users WHERE id = ?`,
      [req.user.id]);
    if (userLocation.length == 0 || userLocation[0][0].location_latitude == undefined || userLocation[0][0].location_longitude == undefined){
      throw ("could not get user location")
    }
    userLat = userLocation[0][0].location_latitude;
    userLng = userLocation[0][0].location_longitude;
    let query = getUserPreviewInfoSqlStatement + ` FROM users u WHERE u.id IN (SELECT to_user_id FROM blocks WHERE from_user_id = ?)`;
    const [result] = await db.query(query, [userLat, userLng, userLat, req.user.id, req.user.id])
    console.log("Returned values :");
    console.log(result);
    res.json(result);
  } catch (error) {
    console.log("error catched :", error);
    const statusCode = error.status || 500;
    const message = error.message || 'Internal Server Error';
    
    res.status(statusCode).json({ error: message });
  }
});

module.exports = router;