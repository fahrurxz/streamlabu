import React, { useState } from 'react';
import { startStream, stopStream, deleteStream } from '../services/api';
import { toast } from 'react-toastify';

const StreamCard = ({ stream, refreshStreams }) => {
  const { id, platform, stream_key, stream_url, source_type, source_url, status } = stream;
  const [isLoading, setIsLoading] = useState(false);

  // Handle starting a stream
  const handleStartStream = async () => {
    try {
      setIsLoading(true);
      await startStream(id);
      toast.success('Stream started successfully');
      refreshStreams();
    } catch (error) {
      toast.error(error.message || 'Failed to start stream');
      console.error('Start stream error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle stopping a stream
  const handleStopStream = async () => {
    try {
      setIsLoading(true);
      await stopStream(id);
      toast.success('Stream stopped successfully');
      refreshStreams();
    } catch (error) {
      toast.error(error.message || 'Failed to stop stream');
      console.error('Stop stream error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a stream
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      try {
        setIsLoading(true);
        await deleteStream(id);
        toast.success('Stream deleted successfully');
        refreshStreams();
      } catch (error) {
        toast.error(error.message || 'Failed to delete stream');
        console.error('Delete stream error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Get badge class for platform
  const getBadgeClass = (platform) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'bg-danger';
      case 'tiktok':
        return 'bg-dark';
      case 'shopee':
        return 'badge platform-badge-shopee';
      default:
        return 'bg-secondary';
    }
  };

  // Get source type badge class
  const getSourceBadgeClass = (sourceType) => {
    switch (sourceType) {
      case 'live_capture':
        return 'bg-info';
      case 'upload_video':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  // Format source URL for display
  const formatSourceUrl = (url) => {
    if (!url) return 'No source URL';
    
    // If it's a file path, show only the filename
    if (url.startsWith('/') || url.includes('\\')) {
      return url.split(/[\/\\]/).pop();
    }
    
    // Otherwise show the full URL
    return url;
  };

  return (
    <div className="card stream-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <span className={`badge ${getBadgeClass(platform)} me-2`}>
            {platform.toUpperCase()}
          </span>
          <span className={`badge ${status === 'active' ? 'bg-success' : 'bg-secondary'} me-2`}>
            {status.toUpperCase()}
          </span>
          <span className={`badge ${getSourceBadgeClass(source_type)}`}>
            {source_type === 'live_capture' ? 'CAPTURE' : 'VIDEO'}
          </span>
        </div>
      </div>
      
      <div className="card-body">
        <h5 className="card-title">Stream Details</h5>
        <div className="mb-2">
          <strong>Platform:</strong> {platform}
        </div>
        <div className="mb-2">
          <strong>RTMP URL:</strong> 
          <div className="text-truncate small">{stream_url}</div>
        </div>
        <div className="mb-2">
          <strong>Stream Key:</strong> 
          <div className="text-truncate small">
            <span className="text-muted">••••••••</span>
            {stream_key.slice(-6)}
          </div>
        </div>
        <div className="mb-2">
          <strong>Source:</strong> 
          <div className="text-truncate small">{formatSourceUrl(source_url)}</div>
        </div>
        
        <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
          {status === 'inactive' ? (
            <button 
              className="btn btn-success" 
              onClick={handleStartStream}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <i className="fas fa-play me-2"></i>
              )}
              Start Stream
            </button>
          ) : (
            <button 
              className="btn btn-warning" 
              onClick={handleStopStream}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <i className="fas fa-stop me-2"></i>
              )}
              Stop Stream
            </button>
          )}
          <button 
            className="btn btn-danger" 
            onClick={handleDelete}
            disabled={isLoading || status === 'active'}
          >
            <i className="fas fa-trash me-2"></i>
            Delete
          </button>
        </div>
      </div>
      
      <div className="card-footer text-muted">
        <small>Created at: {new Date(stream.created_at).toLocaleString()}</small>
      </div>
    </div>
  );
};

export default StreamCard; 