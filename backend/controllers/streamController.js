const Stream = require('../models/Stream');
const User = require('../models/User');
const Video = require('../models/Video');
const mediaServer = require('../services/mediaServer');
const uploadService = require('../services/uploadService');
const thumbnailService = require('../services/thumbnailService');
const googleDriveService = require('../services/googleDriveService');
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
  const { platform, stream_key, stream_url, source_type, source_url, video_id, scheduled_at, loop_enabled } = req.body;

  try {
    // Validate platform
    if (!['youtube', 'tiktok', 'shopee'].includes(platform.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid platform. Supported platforms are YouTube, TikTok, and Shopee' });
    }

    // Validate source type
    if (!['live_capture', 'upload_video'].includes(source_type)) {
      return res.status(400).json({ message: 'Invalid source type. Supported types are live_capture and upload_video' });
    }

    let finalSourceUrl = source_url;
    let finalVideoId = video_id;

    // Handle video selection for upload_video type
    if (source_type === 'upload_video') {
      if (!video_id) {
        return res.status(400).json({ message: 'Video selection is required for upload_video type' });
      }

      // Verify video exists and belongs to user
      const video = await Video.findOne({
        where: {
          id: video_id,
          user_id: req.user.id,
          status: 'ready'
        }
      });

      if (!video) {
        return res.status(400).json({ message: 'Selected video not found or not ready' });
      }

      finalSourceUrl = video.file_path;
      finalVideoId = video.id;
    }

    // Create new stream
    const newStream = await Stream.create({
      user_id: req.user.id,
      platform: platform.toLowerCase(),
      stream_key,
      stream_url,
      source_type,
      source_url: finalSourceUrl,
      video_id: finalVideoId,
      status: 'inactive',
      scheduled_at: scheduled_at || null,
      loop_enabled: loop_enabled || false
    });

    res.json(newStream);
  } catch (err) {
    console.error('Create stream error:', err.message);
    res.status(500).json({ message: 'Failed to create stream', error: err.message });
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
  const { platform, stream_key, stream_url, source_type, source_url, scheduled_at, loop_enabled } = req.body;

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
    }    // Update stream details
    const updatedStream = await stream.update({
      platform: platform || stream.platform,
      stream_key: stream_key || stream.stream_key,
      stream_url: stream_url || stream.stream_url,
      source_type: source_type || stream.source_type,
      source_url: source_url || stream.source_url,
      scheduled_at: scheduled_at !== undefined ? scheduled_at : stream.scheduled_at,
      loop_enabled: loop_enabled !== undefined ? loop_enabled : stream.loop_enabled
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

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Video title is required' });
    }

    // Process the uploaded video (generate thumbnail, get duration, etc.)
    const processedVideo = await uploadService.processUploadedVideo(req.file);

    // Save video metadata to database
    const video = await Video.create({
      user_id: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : null,
      file_name: processedVideo.filename,
      file_path: processedVideo.path,
      file_size: processedVideo.size,
      duration: processedVideo.duration,
      mime_type: processedVideo.mimetype,
      upload_type: 'local',
      thumbnail_path: processedVideo.thumbnailPath,
      status: 'ready'
    });

    res.json({
      message: 'Video uploaded successfully',
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        file_path: video.file_path,
        file_size: video.file_size,
        duration: video.duration,
        thumbnail_path: video.thumbnail_path,
        created_at: video.created_at
      }
    });
  } catch (err) {
    console.error('Upload video error:', err.message);
    res.status(500).json({ message: 'Failed to upload video', error: err.message });
  }
};

// Handle Google Drive video import
exports.uploadVideoFromGoogleDrive = async (req, res) => {
  try {
    const { googleDriveFileId, googleDriveLink, title, description } = req.body;

    if (!googleDriveLink || !title) {
      return res.status(400).json({ 
        message: 'Google Drive link and title are required' 
      });
    }

    // Validate Google Drive URL
    if (!googleDriveService.isValidGoogleDriveUrl(googleDriveLink)) {
      return res.status(400).json({
        message: 'Invalid Google Drive URL format'
      });
    }

    // Extract file ID from the link if not provided
    const fileId = googleDriveFileId || googleDriveService.extractFileId(googleDriveLink);
    if (!fileId) {
      return res.status(400).json({
        message: 'Could not extract file ID from Google Drive link'
      });
    }

    // Create video record with processing status
    const video = await Video.create({
      user_id: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : null,
      file_name: `gdrive_${fileId}_processing`,
      file_path: googleDriveLink, // Temporary - will be updated after download
      upload_type: 'google_drive',
      google_drive_file_id: fileId,
      google_drive_link: googleDriveLink,
      status: 'processing' // Mark as processing while downloading
    });

    // Send immediate response with processing status
    res.json({
      message: 'Video import started. The video is being downloaded from Google Drive.',
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        upload_type: video.upload_type,
        google_drive_link: video.google_drive_link,
        status: video.status,
        created_at: video.created_at
      }
    });

    // Process the download asynchronously
    processGoogleDriveDownload(video.id, googleDriveLink, req.user.id, title);

  } catch (err) {
    console.error('Google Drive import error:', err.message);
    res.status(500).json({ message: 'Failed to import video from Google Drive', error: err.message });
  }
};

// Async function to handle Google Drive download and processing
const processGoogleDriveDownload = async (videoId, googleDriveLink, userId, title) => {
  try {
    console.log(`Starting Google Drive download for video ${videoId}`);

    // Download the video from Google Drive
    const downloadResult = await googleDriveService.downloadAndProcessVideo(
      googleDriveLink, 
      userId,
      title
    );

    console.log(`Download completed for video ${videoId}:`, downloadResult);

    // Generate thumbnail from the downloaded video
    const thumbnailPath = await thumbnailService.generateVideoThumbnail(downloadResult.localPath);

    // Update video record with local file information
    await Video.update({
      file_name: downloadResult.filename,
      file_path: downloadResult.localPath,
      file_size: downloadResult.fileSize,
      thumbnail_path: thumbnailPath,
      status: 'ready'
    }, {
      where: { id: videoId }
    });

    console.log(`Video ${videoId} processing completed successfully`);

  } catch (error) {
    console.error(`Error processing Google Drive video ${videoId}:`, error);

    // Update video record with error status
    await Video.update({
      status: 'error',
      error_message: error.message
    }, {
      where: { id: videoId }
    });

    // Clean up any partial files
    try {
      const video = await Video.findByPk(videoId);
      if (video && video.file_path && video.file_path !== googleDriveLink) {
        // If file_path was updated to local path but processing failed
        if (fs.existsSync(video.file_path)) {
          fs.unlinkSync(video.file_path);
        }
      }
    } catch (cleanupError) {
      console.error(`Error cleaning up failed download for video ${videoId}:`, cleanupError);
    }
  }
};

// Get all uploaded videos for a user
exports.getUploadedVideos = async (req, res) => {
  try {
    const videos = await Video.findAll({
      where: { 
        user_id: req.user.id
      },
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'title', 'description', 'file_path', 'file_size', 
        'duration', 'upload_type', 'google_drive_link', 'thumbnail_path', 
        'status', 'error_message', 'created_at'
      ]
    });

    // Add thumbnail URLs to the response
    const videosWithThumbnails = videos.map(video => {
      const videoData = video.toJSON();
      if (videoData.thumbnail_path) {
        const thumbnailFilename = path.basename(videoData.thumbnail_path);
        videoData.thumbnail_url = `${req.protocol}://${req.get('host')}/uploads/thumbnails/${thumbnailFilename}`;
      }
      return videoData;
    });

    res.json(videosWithThumbnails);
  } catch (err) {
    console.error('Get uploaded videos error:', err.message);
    res.status(500).json({ message: 'Failed to get uploaded videos', error: err.message });
  }
};

// Delete an uploaded video
exports.deleteUploadedVideo = async (req, res) => {
  try {
    const video = await Video.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if video is being used in any active streams
    const streamsUsingVideo = await Stream.findAll({
      where: {
        video_id: video.id,
        status: 'active'
      }
    });

    if (streamsUsingVideo.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete video that is being used in active streams' 
      });
    }    // Delete physical file if it exists locally (both local uploads and downloaded Google Drive files)
    if (video.file_path && !video.file_path.startsWith('http')) {
      try {
        let fullPath;
        if (path.isAbsolute(video.file_path)) {
          fullPath = video.file_path;
        } else {
          fullPath = path.join(__dirname, '../../uploads/videos', path.basename(video.file_path));
        }
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted video file: ${fullPath}`);
        }
      } catch (fileError) {
        console.error('Error deleting video file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete thumbnail if exists (for both local and Google Drive videos)
    if (video.thumbnail_path) {
      thumbnailService.deleteThumbnail(video.thumbnail_path);
    }

    // Delete video record
    await video.destroy();

    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error('Delete video error:', err.message);
    res.status(500).json({ message: 'Failed to delete video', error: err.message });
  }
};

// Get video processing status
exports.getVideoStatus = async (req, res) => {
  try {
    const video = await Video.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      attributes: ['id', 'status', 'error_message', 'updated_at']
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json(video);
  } catch (err) {
    console.error('Get video status error:', err.message);
    res.status(500).json({ message: 'Failed to get video status', error: err.message });
  }
};