import React from 'react';

const StreamEmbed = ({ platform, streamUrl }) => {
  // Extract video ID from YouTube URL
  const getYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Extract username from TikTok URL
  const getTikTokUsername = (url) => {
    const regExp = /https:\/\/(www\.)?tiktok\.com\/@([^\/]+)/;
    const match = url.match(regExp);
    return match ? match[2] : null;
  };

  // Extract stream ID from Shopee URL
  const getShopeeStreamId = (url) => {
    const regExp = /https:\/\/(www\.)?shopee\.[^\/]+\/live\/([^\/\?]+)/;
    const match = url.match(regExp);
    return match ? match[2] : null;
  };

  const renderEmbed = () => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        const youtubeId = getYoutubeVideoId(streamUrl);
        if (!youtubeId) return <div className="alert alert-danger">Invalid YouTube URL</div>;
        
        return (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title="YouTube Live Stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        );
      
      case 'tiktok':
        const tiktokUsername = getTikTokUsername(streamUrl);
        if (!tiktokUsername) return <div className="alert alert-danger">Invalid TikTok URL</div>;
        
        return (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.tiktok.com/embed/@${tiktokUsername}`}
            title="TikTok Live Stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        );
      
      case 'shopee':
        // For Shopee, direct embedding might not be supported
        // This is a placecholder that would need to be updated with actual embed code if available
        return (
          <div className="d-flex flex-column align-items-center justify-content-center h-100">
            <i className="fas fa-shopping-bag fa-3x mb-3 text-danger"></i>
            <h5 className="text-center">Shopee Live Stream</h5>
            <p className="text-center">Shopee does not support direct embedding.</p>
            <a 
              href={streamUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-danger"
            >
              Open Shopee Live
            </a>
          </div>
        );
      
      default:
        return <div className="alert alert-danger">Unsupported platform</div>;
    }
  };

  return (
    <div className="embed-container">
      {renderEmbed()}
    </div>
  );
};

export default StreamEmbed; 