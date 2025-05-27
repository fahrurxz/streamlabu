const Stream = require('../models/Stream');
const User = require('../models/User');
const mediaServer = require('../services/mediaServer');
const uploadService = require('../services/uploadService');
const path = require('path');
const fs = require('fs');

// Get all streams for a user
exports.getStreams = async (req, res) => {
  try {
    console.log('Getting streams for user:', req.user);
    
    // Check if user ID exists in request
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User identification missing from token' });
    }
    
    const streams = await Stream.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    
    console.log(`Found ${streams.length} streams for user ${req.user.id}`);
    res.json(streams);
  } catch (err) {
    console.error('Error in getStreams:', err.message);
    res.status(500).send('Server error');
  }
};

// Get a single stream
exports.getStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    res.json(stream);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Create a new stream
exports.createStream = async (req, res) => {
  const { platform, stream_key, stream_url, source_type, source_url, scheduled_at } = req.body;

  try {
    // Validate platform
    if (!['youtube', 'tiktok', 'shopee'].includes(platform.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid platform. Supported platforms are YouTube, TikTok, and Shopee' });
    }

    // Validate source type
    if (!['live_capture', 'upload_video'].includes(source_type)) {
      return res.status(400).json({ message: 'Invalid source type. Supported types are live_capture and upload_video' });
    }

    // For uploaded videos, verify file exists
    if (source_type === 'upload_video' && source_url) {
      const videoPath = path.join(uploadService.videoDir, path.basename(source_url));
      if (!fs.existsSync(videoPath)) {
        return res.status(400).json({ message: 'Uploaded video file not found' });
      }
    }

    // Create new stream
    const newStream = await Stream.create({
      user_id: req.user.id,
      platform: platform.toLowerCase(),
      stream_key,
      stream_url,
      source_type,
      source_url,
      status: 'inactive',
      scheduled_at: scheduled_at || null
    });

    res.json(newStream);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Start a stream
exports.startStream = async (req, res) => {
  try {
    const streamId = req.params.id;
    const stream = await Stream.findOne({
      where: {
        id: streamId,
        user_id: req.user.id
      }
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    const result = await mediaServer.startStreaming(streamId);
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Stop a stream
exports.stopStream = async (req, res) => {
  try {
    const streamId = req.params.id;
    const stream = await Stream.findOne({
      where: {
        id: streamId,
        user_id: req.user.id
      }
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    const result = await mediaServer.stopStreaming(streamId);
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update stream details
exports.updateStream = async (req, res) => {
  const { platform, stream_key, stream_url, source_type, source_url, scheduled_at } = req.body;

  try {
    // Check if stream exists and belongs to user
    const stream = await Stream.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // Only allow updates if stream is inactive
    if (stream.status === 'active') {
      return res.status(400).json({ message: 'Cannot update active stream. Stop the stream first.' });
    }

    // Update stream details
    const updatedStream = await stream.update({
      platform: platform || stream.platform,
      stream_key: stream_key || stream.stream_key,
      stream_url: stream_url || stream.stream_url,
      source_type: source_type || stream.source_type,
      source_url: source_url || stream.source_url,
      scheduled_at: scheduled_at !== undefined ? scheduled_at : stream.scheduled_at
    });

    res.json(updatedStream);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Delete a stream
exports.deleteStream = async (req, res) => {
  try {
    // Check if stream exists and belongs to user
    const stream = await Stream.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    // If stream is active, stop it first
    if (stream.status === 'active') {
      await mediaServer.stopStreaming(stream.id);
    }

    // Delete stream
    await stream.destroy();

    res.json({ message: 'Stream removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Handle video uploads
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Process the uploaded video (generate thumbnail, etc.)
    const processedVideo = await uploadService.processUploadedVideo(req.file);

    res.json({
      message: 'Video uploaded successfully',
      file: {
        filename: processedVideo.filename,
        originalname: processedVideo.originalname,
        path: processedVideo.path,
        thumbnailPath: processedVideo.thumbnailPath,
        size: processedVideo.size
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}; 