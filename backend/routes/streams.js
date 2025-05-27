const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const auth = require('../middlewares/auth');
const uploadService = require('../services/uploadService');

// All stream routes should be protected
router.use(auth);

// @route   GET api/streams
// @desc    Get all streams for a user
// @access  Private
router.get('/', streamController.getStreams);

// @route   GET api/streams/:id
// @desc    Get a single stream
// @access  Private
router.get('/:id', streamController.getStream);

// @route   POST api/streams
// @desc    Create a new stream
// @access  Private
router.post('/', streamController.createStream);

// @route   PUT api/streams/:id
// @desc    Update stream details
// @access  Private
router.put('/:id', streamController.updateStream);

// @route   DELETE api/streams/:id
// @desc    Delete a stream
// @access  Private
router.delete('/:id', streamController.deleteStream);

// @route   POST api/streams/:id/start
// @desc    Start a stream
// @access  Private
router.post('/:id/start', streamController.startStream);

// @route   POST api/streams/:id/stop
// @desc    Stop a stream
// @access  Private
router.post('/:id/stop', streamController.stopStream);

// @route   POST api/streams/upload-video
// @desc    Upload a video file to use as stream source
// @access  Private
router.post('/upload-video', uploadService.upload.single('video'), streamController.uploadVideo);

module.exports = router; 