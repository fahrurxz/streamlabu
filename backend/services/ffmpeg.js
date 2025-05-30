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
      const { source_type, source_url, stream_url, stream_key, platform, loop_enabled } = stream;
      
      const rtmpDestination = `${stream_url}/${stream_key}`;
      let ffmpegArgs = [];
      
      if (source_type === 'upload_video') {
        // For video file source
        if (!fs.existsSync(source_url)) {
          throw new Error(`Video file not found: ${source_url}`);
        }
        
        ffmpegArgs = this.getCommandForVideoFile(source_url, rtmpDestination, platform, loop_enabled);
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
  }  // Get FFmpeg command args for video file source
  getCommandForVideoFile(videoPath, rtmpDestination, platform, loopEnabled = false) {
    // Gunakan copy codec agar tidak re-encode jika file sudah kompatibel
    const args = [];
    
    // Stream loop harus berada sebelum -re dan -i
    if (loopEnabled) {
      args.push('-stream_loop', '-1');  // Loop infinitely
    }
    
    args.push(
      '-re',                    // Read input at native frame rate
      '-i', videoPath,          // Input file
      '-c', 'copy',             // Tidak re-encode, langsung copy stream
      '-f', 'flv',              // Output format
      rtmpDestination           // RTMP destination
    );
    
    return args;
  }
  // Get FFmpeg command args for live capture source
  getCommandForLiveCapture(sourceUrl, rtmpDestination, platform) {
    // Basic command for re-streaming from a live source to RTMP
    const args = [
      '-i', sourceUrl,          // Input URL
      '-c', 'copy',             // Copy codec (no re-encoding)
      '-f', 'flv',              // Output format
      rtmpDestination           // RTMP destination
    ];
    
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