const fs = require('fs');
const path = require('path');
const ffmpegService = require('./ffmpeg');

class ThumbnailService {
  constructor() {
    this.thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
    this.defaultThumbnailPath = path.join(this.thumbnailDir, 'default-video-thumbnail.png');
    
    // Ensure thumbnails directory exists
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
    
    // Create default thumbnail if it doesn't exist
    this.createDefaultThumbnail();
  }
  
  // Create a simple default thumbnail using text
  createDefaultThumbnail() {
    if (!fs.existsSync(this.defaultThumbnailPath)) {
      // Create a simple SVG as default thumbnail
      const svgContent = `
        <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#f8f9fa"/>
          <rect x="140" y="100" width="40" height="40" fill="#6c757d" rx="8"/>
          <polygon points="160,110 175,120 160,130" fill="white"/>
          <text x="160" y="160" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Video</text>
        </svg>
      `;
      
      try {
        fs.writeFileSync(this.defaultThumbnailPath, svgContent);
      } catch (error) {
        console.error('Error creating default thumbnail:', error);
      }
    }
  }
  
  // Generate thumbnail for local video file
  async generateVideoThumbnail(videoPath, customFilename = null) {
    try {
      return await ffmpegService.generateThumbnail(videoPath, this.thumbnailDir, customFilename);
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
      return this.getDefaultThumbnail();
    }
  }
  
  // Get default thumbnail for Google Drive or when generation fails
  getDefaultThumbnail() {
    const filename = `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    const destinationPath = path.join(this.thumbnailDir, filename);
    
    try {
      // Copy default thumbnail with unique name
      fs.copyFileSync(this.defaultThumbnailPath, destinationPath);
      return destinationPath;
    } catch (error) {
      console.error('Error copying default thumbnail:', error);
      return null;
    }
  }
  
  // Delete thumbnail file
  deleteThumbnail(thumbnailPath) {
    try {
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        return true;
      }
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
    }
    return false;
  }
  
  // Get thumbnail filename from path
  getThumbnailFilename(thumbnailPath) {
    return thumbnailPath ? path.basename(thumbnailPath) : null;
  }
}

// Create and export singleton instance
const thumbnailService = new ThumbnailService();
module.exports = thumbnailService;
