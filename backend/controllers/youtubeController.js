const youtubeService = require('../services/youtubeService');

/**
 * Get stream URL from YouTube video ID (Simulasi)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
exports.getStreamUrl = async (req, res) => {
  try {
    const { videoId, url } = req.query;
    
    // Extract video ID from URL or use provided videoId
    let targetVideoId = videoId;
    
    if (!targetVideoId && url) {
      targetVideoId = youtubeService.extractVideoId(url);
    }
    
    if (!targetVideoId) {
      return res.status(400).json({ 
        message: 'Invalid request. Please provide a valid YouTube video ID or URL' 
      });
    }
    
    // Get the stream URL (simulasi)
    const streamUrl = await youtubeService.getStreamUrl(targetVideoId);
    
    res.json({ 
      videoId: targetVideoId,
      streamUrl,
      mode: 'simulation',
      note: 'This is a simulated URL for testing purposes only. It does not actually stream video content.'
    });
  } catch (error) {
    console.error('YouTube controller error:', error);
    res.status(500).json({ message: error.message });
  }
}; 