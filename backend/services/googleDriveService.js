const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

class GoogleDriveService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads/videos');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Extract file ID from Google Drive URL
  extractFileId(url) {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  // Get file info from Google Drive
  async getFileInfo(fileId) {
    try {
      const response = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
        timeout: 10000
      });
      
      // Try to extract filename from the page title or meta tags
      const html = response.data;
      let filename = 'video.mp4'; // default filename
      
      // Try to extract filename from title tag
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        let title = titleMatch[1].trim();
        // Remove " - Google Drive" suffix
        title = title.replace(/ - Google Drive$/i, '');
        if (title && title !== 'Google Drive') {
          filename = this.sanitizeFilename(title);
          // Add .mp4 extension if no extension present
          if (!path.extname(filename)) {
            filename += '.mp4';
          }
        }
      }
      
      return { filename };
    } catch (error) {
      console.error('Error getting file info:', error);
      return { filename: `gdrive_${fileId}.mp4` };
    }
  }

  // Sanitize filename to remove invalid characters
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }

  // Download file from Google Drive
  async downloadFile(fileId, destinationPath, onProgress = null) {
    try {
      // First, try the direct download URL
      let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      console.log(`Starting download from Google Drive: ${fileId}`);
      
      // Make initial request
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 30000,
        maxRedirects: 5
      });

      // Check if we got redirected to virus scan warning page
      if (response.request.res.responseUrl && response.request.res.responseUrl.includes('confirm=')) {
        // Extract the confirmation token
        const confirmMatch = response.request.res.responseUrl.match(/confirm=([^&]+)/);
        if (confirmMatch) {
          downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
          console.log('Using confirmed download URL for large file');
        }
      }

      // If the response looks like HTML (virus scan page), we need to handle it differently
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        // This might be the virus scan warning page
        // We need to parse it and get the actual download link
        return await this.handleVirusScanPage(fileId, destinationPath, onProgress);
      }

      // Track download progress
      const totalLength = parseInt(response.headers['content-length'], 10);
      let downloadedLength = 0;

      if (onProgress && totalLength) {
        response.data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const progress = Math.round((downloadedLength / totalLength) * 100);
          onProgress(progress);
        });
      }

      // Create write stream and download
      const writer = fs.createWriteStream(destinationPath);
      await pipelineAsync(response.data, writer);

      console.log(`Download completed: ${destinationPath}`);
      return destinationPath;

    } catch (error) {
      console.error('Download error:', error);
      
      // Clean up partial file if it exists
      if (fs.existsSync(destinationPath)) {
        try {
          fs.unlinkSync(destinationPath);
        } catch (cleanupError) {
          console.error('Error cleaning up partial file:', cleanupError);
        }
      }
      
      throw new Error(`Failed to download file from Google Drive: ${error.message}`);
    }
  }

  // Handle virus scan warning page for large files
  async handleVirusScanPage(fileId, destinationPath, onProgress = null) {
    try {
      // Get the virus scan page
      const response = await axios.get(`https://drive.google.com/uc?export=download&id=${fileId}`, {
        timeout: 15000
      });

      const html = response.data;
      
      // Look for the download link in the HTML
      const downloadLinkMatch = html.match(/href="([^"]*uc\?export=download[^"]*)"/);
      if (!downloadLinkMatch) {
        throw new Error('Could not find download link in virus scan page');
      }

      let downloadUrl = downloadLinkMatch[1];
      // Decode HTML entities
      downloadUrl = downloadUrl.replace(/&amp;/g, '&');
      
      // Make sure the URL is absolute
      if (downloadUrl.startsWith('/')) {
        downloadUrl = 'https://drive.google.com' + downloadUrl;
      }

      console.log('Found download URL from virus scan page');

      // Now download using the extracted URL
      const downloadResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000, // Longer timeout for large files
        maxRedirects: 5
      });

      // Track download progress
      const totalLength = parseInt(downloadResponse.headers['content-length'], 10);
      let downloadedLength = 0;

      if (onProgress && totalLength) {
        downloadResponse.data.on('data', (chunk) => {
          downloadedLength += chunk.length;
          const progress = Math.round((downloadedLength / totalLength) * 100);
          onProgress(progress);
        });
      }

      // Create write stream and download
      const writer = fs.createWriteStream(destinationPath);
      await pipelineAsync(downloadResponse.data, writer);

      console.log(`Large file download completed: ${destinationPath}`);
      return destinationPath;

    } catch (error) {
      console.error('Error handling virus scan page:', error);
      throw error;
    }
  }

  // Download and process Google Drive video
  async downloadAndProcessVideo(googleDriveLink, userId, filename = null) {
    const fileId = this.extractFileId(googleDriveLink);
    if (!fileId) {
      throw new Error('Invalid Google Drive link');
    }

    // Get file info if filename not provided
    if (!filename) {
      const fileInfo = await this.getFileInfo(fileId);
      filename = fileInfo.filename;
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFilename = `user-${userId}-${timestamp}-${filename}`;
    const destinationPath = path.join(this.uploadsDir, uniqueFilename);

    console.log(`Downloading Google Drive file to: ${destinationPath}`);

    // Download the file
    await this.downloadFile(fileId, destinationPath);

    // Verify file was downloaded and has content
    const stats = fs.statSync(destinationPath);
    if (stats.size === 0) {
      fs.unlinkSync(destinationPath);
      throw new Error('Downloaded file is empty');
    }

    console.log(`Downloaded file size: ${stats.size} bytes`);

    return {
      localPath: destinationPath,
      filename: uniqueFilename,
      fileSize: stats.size
    };
  }

  // Validate Google Drive URL
  isValidGoogleDriveUrl(url) {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }
}

// Create and export singleton instance
const googleDriveService = new GoogleDriveService();
module.exports = googleDriveService;
