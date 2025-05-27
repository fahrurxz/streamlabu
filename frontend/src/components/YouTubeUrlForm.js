import React, { useState } from 'react';
import { getYoutubeStreamUrl } from '../services/api';
import { toast } from 'react-toastify';

const YouTubeUrlForm = ({ onStreamUrlObtained }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!youtubeUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }
    
    setLoading(true);
    setIsSimulation(false);
    
    try {
      const result = await getYoutubeStreamUrl({ url: youtubeUrl });
      
      if (result && result.streamUrl) {
        // Deteksi apakah ini mode simulasi
        if (result.mode === 'simulation') {
          setIsSimulation(true);
          toast.info('Simulation mode: Using simulated stream URL for testing');
        } else {
          toast.success('YouTube stream URL obtained successfully!');
        }
        
        // Call the callback with the stream URL
        if (onStreamUrlObtained) {
          onStreamUrlObtained(result.streamUrl, {
            videoId: result.videoId,
            youtubeUrl,
            isSimulation: result.mode === 'simulation'
          });
        }
      } else {
        toast.error('Failed to obtain stream URL');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to get YouTube stream URL');
      console.error('YouTube URL error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="fab fa-youtube me-2"></i>
          Get YouTube Stream URL
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="youtubeUrl" className="form-label">
              YouTube Video URL
            </label>
            <input
              type="text"
              className="form-control"
              id="youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
            />
            <div className="form-text">
              Enter the URL of a YouTube video to use as streaming source
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Getting URL...
              </>
            ) : (
              <>
                <i className="fas fa-link me-2"></i>
                Get Stream URL
              </>
            )}
          </button>
        </form>
        
        {isSimulation && (
          <div className="alert alert-info mt-3">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Simulation Mode:</strong> Using simulated stream URL for testing purposes.
            In production, you would need to implement a real YouTube API integration.
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeUrlForm; 