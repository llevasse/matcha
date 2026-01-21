const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
  performLike,
  performUnlike,
  getMatches,
  getMatchDetails,
  getLikesReceived,
  getLikesGiven,
  getLikeReceivedDetails
} = require('../services/interactionService');

const router = express.Router();

router.post('/like', authenticateToken, asyncHandler(async (req, res) => {
  const { to_user_id } = req.body;
  const isMatch = await performLike(req.user.id, to_user_id);

  res.json({
    message: isMatch ? 'It\'s a match!' : 'Like sent successfully',
    is_match: isMatch
  });
}));

router.post('/unlike', authenticateToken, asyncHandler(async (req, res) => {
  const { to_user_id } = req.body;
  await performUnlike(req.user.id, to_user_id);

  res.json({ message: 'Unlike sent successfully' });
}));

router.get('/matches', authenticateToken, asyncHandler(async (req, res) => {
  const userLocation = {
    latitude: req.user.location_latitude,
    longitude: req.user.location_longitude
  };

  const matches = await getMatches(req.user.id, userLocation);
  res.json(matches);
}));

router.get('/matches/:user_id', authenticateToken, asyncHandler(async (req, res) => {
  const matchDetails = await getMatchDetails(req.user.id, req.params.user_id);
  res.json(matchDetails);
}));

router.get('/likes-received', authenticateToken, asyncHandler(async (req, res) => {
  const userLocation = {
    latitude: req.user.location_latitude,
    longitude: req.user.location_longitude
  };

  const likes = await getLikesReceived(req.user.id, userLocation);
  res.json(likes);
}));

router.get('/likes-given', authenticateToken, asyncHandler(async (req, res) => {
  const likes = await getLikesGiven(req.user.id);
  res.json(likes);
}));

router.get('/likes-received/:user_id', authenticateToken, asyncHandler(async (req, res) => {
  const likeDetails = await getLikeReceivedDetails(req.user.id, req.params.user_id);
  res.json(likeDetails);
}));

module.exports = router;