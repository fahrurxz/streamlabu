const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class FFmpegService {
  constructor() {
    // Set ffmpeg path if using a specific binary location
    // ffmpeg.setFfmpegPath('/path/to/ffmpeg');
  }

  // Start an FFmpeg process for streaming
  async startFFmpegProcess(stream) {
    try {
      const { source_type, source_url, stream_url, stream_key, platform } = stream;
      
      const rtmpDestination = `${stream_url}/${stream_key}`;
      let ffmpegArgs = [];
      
      if (source_type === 'upload_video') {
        // For video file source
        if (!fs.existsSync(source_url)) {
          throw new Error(`Video file not found: ${source_url}`);
        }
        
        ffmpegArgs = this.getCommandForVideoFile(source_url, rtmpDestination, platform);
      } else if (source_type === 'live_capture') {
        // For live capture from another stream
        ffmpegArgs = this.getCommandForLiveCapture(source_url, rtmpDestination, platform);
      } else {
        throw new Error(`Unsupported source type: ${source_type}`);
      }
      
      console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));
      
      // Start FFmpeg process
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      // Log FFmpeg output
      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });
      
      ffmpegProcess.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data}`);
      });
      
      ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
      });
      
      return ffmpegProcess;
    } catch (error) {
      console.error('Error in startFFmpegProcess:', error);
      return null;
    }
  }

  // Get FFmpeg command args for video file source
  getCommandForVideoFile(videoPath, rtmpDestination, platform) {
    // Basic command for re-streaming a video file to RTMP
    const args = [
      '-re',                    // Read input at native frame rate
      '-i', videoPath,          // Input file
      '-c:v', 'libx264',        // Video codec
      '-preset', 'veryfast',    // Encoding preset
      '-b:v', '2500k',          // Video bitrate
      '-maxrate', '2500k',      // Maximum bitrate
      '-bufsize', '5000k',      // Buffer size
      '-pix_fmt', 'yuv420p',    // Pixel format
      '-g', '60',               // Keyframe interval
      '-c:a', 'aac',            // Audio codec
      '-b:a', '128k',           // Audio bitrate
      '-ar', '44100',           // Audio sample rate
      '-f', 'flv',              // Output format
      rtmpDestination           // RTMP destination
    ];
    
    // Platform-specific optimizations
    if (platform === 'youtube') {
      // YouTube recommendation
      args.splice(args.indexOf('-b:v') + 1, 1, '4000k');
    } else if (platform === 'tiktok') {
      // TikTok recommendation (vertical video)
      args.splice(args.indexOf('-preset') + 2, 0, '-vf', 'scale=720:1280');
    }
    
    return args;
  }

  // Get FFmpeg command args for live capture source
  getCommandForLiveCapture(sourceUrl, rtmpDestination, platform) {
    // Basic command for re-streaming from a live source to RTMP
    const args = [
      '-i', sourceUrl,          // Input URL
      '-c:v', 'libx264',        // Video codec
      '-preset', 'veryfast',    // Encoding preset
      '-b:v', '2500k',          // Video bitrate
      '-maxrate', '2500k',      // Maximum bitrate
      '-bufsize', '5000k',      // Buffer size
      '-pix_fmt', 'yuv420p',    // Pixel format
      '-g', '60',               // Keyframe interval
      '-c:a', 'aac',            // Audio codec
      '-b:a', '128k',           // Audio bitrate
      '-ar', '44100',           // Audio sample rate
      '-f', 'flv',              // Output format
      rtmpDestination           // RTMP destination
    ];
    
    // Platform-specific optimizations (same as video file source)
    if (platform === 'youtube') {
      args.splice(args.indexOf('-b:v') + 1, 1, '4000k');
    } else if (platform === 'tiktok') {
      args.splice(args.indexOf('-preset') + 2, 0, '-vf', 'scale=720:1280');
    }
    
    return args;
  }

  // Extract thumbnail from video
  async generateThumbnail(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:02'],
          filename: 'thumbnail.png',
          folder: outputPath,
          size: '320x240'
        })
        .on('end', () => {
          resolve(path.join(outputPath, 'thumbnail.png'));
        })
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
          reject(err);
        });
    });
  }
}

// Create and export a singleton instance
const ffmpegService = new FFmpegService();
module.exports = ffmpegService; 