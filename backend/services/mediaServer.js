const NodeMediaServer = require('node-media-server');
const config = require('../config/mediaServer');
const ffmpegService = require('./ffmpeg');
const Stream = require('../models/Stream');

class MediaServer {
  constructor() {
    this.nms = new NodeMediaServer(config);
    this.activeStreams = new Map(); // To track active ffmpeg processes
  }

  // Initialize the media server
  init() {
    this.nms.run();
    this.setupEventHandlers();
    console.log('Media Server Initialized');
  }

  // Setup event handlers for the Node Media Server
  setupEventHandlers() {
    this.nms.on('prePublish', (id, StreamPath, args) => {
      console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    this.nms.on('postPublish', (id, StreamPath, args) => {
      console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    this.nms.on('donePublish', (id, StreamPath, args) => {
      console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });
  }

  // Start streaming for a specific stream ID
  async startStreaming(streamId) {
    try {
      const stream = await Stream.findByPk(streamId);
      if (!stream) throw new Error('Stream not found');
      
      if (stream.status === 'active') {
        throw new Error('Stream is already active');
      }

      const ffmpegProcess = await ffmpegService.startFFmpegProcess(stream);
      
      if (ffmpegProcess) {
        this.activeStreams.set(streamId, ffmpegProcess);
        
        // Update stream status to active
        await stream.update({ status: 'active' });
        
        return { success: true, message: 'Stream started successfully' };
      } else {
        throw new Error('Failed to start FFmpeg process');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      return { success: false, message: error.message };
    }
  }

  // Stop streaming for a specific stream ID
  async stopStreaming(streamId) {
    try {
      const stream = await Stream.findByPk(streamId);
      if (!stream) throw new Error('Stream not found');
      
      if (stream.status === 'inactive') {
        throw new Error('Stream is already inactive');
      }

      const ffmpegProcess = this.activeStreams.get(streamId);
      if (ffmpegProcess) {
        // Kill the FFmpeg process
        ffmpegProcess.kill();
        this.activeStreams.delete(streamId);
        
        // Update stream status to inactive
        await stream.update({ status: 'inactive' });
        
        return { success: true, message: 'Stream stopped successfully' };
      } else {
        throw new Error('No active FFmpeg process found for this stream');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      return { success: false, message: error.message };
    }
  }

  // Get RTMP ingest URL for the server
  getRtmpIngestUrl() {
    return `rtmp://${config.rtmp.host}:${config.rtmp.port}/live`;
  }
}

// Create and export a singleton instance
const mediaServer = new MediaServer();
module.exports = mediaServer; 