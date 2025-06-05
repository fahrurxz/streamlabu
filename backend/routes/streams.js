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

// @route   POST api/streams/upload-video
// @desc    Upload a video file to use as stream source
// @access  Private
router.post('/upload-video', uploadService.upload.single('video'), streamController.uploadVideo);

// @route   POST api/streams/upload-from-google-drive
// @desc    Import a video from Google Drive
// @access  Private
router.post('/upload-from-google-drive', streamController.uploadVideoFromGoogleDrive);

// @route   POST api/streams/validate-google-drive-link
// @desc    Validate Google Drive link before upload
// @access  Private
router.post('/validate-google-drive-link', streamController.validateGoogleDriveLink);

// @route   GET api/streams/uploaded-videos
// @desc    Get all uploaded videos for user
// @access  Private
router.get('/uploaded-videos', streamController.getUploadedVideos);

// @route   POST api/streams/uploaded-videos/:id/retry
// @desc    Retry failed Google Drive download
// @access  Private
router.post('/uploaded-videos/:id/retry', streamController.retryGoogleDriveDownload);

// @route   DELETE api/streams/uploaded-videos/:id
// @desc    Delete an uploaded video
// @access  Private
router.delete('/uploaded-videos/:id', streamController.deleteUploadedVideo);

// @route   GET api/streams/video-status/:id
// @desc    Get video processing status
// @access  Private
router.get('/video-status/:id', streamController.getVideoStatus);

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

module.exports = router;