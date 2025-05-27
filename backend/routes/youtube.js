const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const auth = require('../middlewares/auth');

// All routes should be protected with authentication
router.use(auth);

// @route   GET api/youtube/stream-url
// @desc    Get stream URL from YouTube video
// @access  Private
router.get('/stream-url', youtubeController.getStreamUrl);

module.exports = router; 