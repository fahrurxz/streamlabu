const NodeMediaServer = require('node-media-server');
const config = require('../config/mediaServer');
const ffmpegService = require('./ffmpeg');
const Stream = require('../models/Stream');

class MediaServer {
  constructor() {
    this.nms = new NodeMediaServer(config);
    this.activeStreams = new Map(); // To track active ffmpeg processes
    this.streamQueue = [];
    this.MAX_CONCURRENT_STREAMS = 2; // Bisa diubah sesuai resource server
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
      // Batasi jumlah stream aktif
      if (this.activeStreams.size >= this.MAX_CONCURRENT_STREAMS) {
        // Masukkan ke queue jika limit tercapai
        this.streamQueue.push(streamId);
        console.log(`Stream ${streamId} masuk antrian. Queue:`, this.streamQueue);
        return { success: false, message: `Server sedang penuh. Stream dimasukkan ke antrian (${this.streamQueue.length}).` };
      }

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
        
        // Cleanup otomatis jika proses ffmpeg selesai/error
        ffmpegProcess.on('close', () => {
          this.activeStreams.delete(streamId);
          stream.update({ status: 'inactive' });
          this._processQueue();
        });
        
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
        
        this._processQueue(); // Cek antrian setelah stop
        return { success: true, message: 'Stream stopped successfully' };
      } else {
        throw new Error('No active FFmpeg process found for this stream');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      return { success: false, message: error.message };
    }
  }

  // Proses queue jika ada slot kosong
  async _processQueue() {
    if (this.activeStreams.size < this.MAX_CONCURRENT_STREAMS && this.streamQueue.length > 0) {
      const nextStreamId = this.streamQueue.shift();
      console.log(`Menjalankan stream dari antrian: ${nextStreamId}`);
      await this.startStreaming(nextStreamId);
    }
  }

  // Get RTMP ingest URL for the server
  getRtmpIngestUrl() {
    return `rtmp://${config.rtmp.host}:${config.rtmp.port}/live`;
  }

  // Mendapatkan status antrian dan stream aktif
  getQueueStatus() {
    return {
      activeCount: this.activeStreams.size,
      queueCount: this.streamQueue.length,
      queue: [...this.streamQueue],
      maxConcurrent: this.MAX_CONCURRENT_STREAMS
    };
  }
}

// Create and export a singleton instance
const mediaServer = new MediaServer();
module.exports = mediaServer;