import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStream, getUploadedVideos } from '../services/api';
import { toast } from 'react-toastify';

const AddStream = () => {
  const [formData, setFormData] = useState({
    platform: 'youtube',
    stream_key: '',
    stream_url: '',
    source_type: 'upload_video',
    source_url: '',
    video_id: '', // New field for selected video
    scheduled_at: '',
    loop_enabled: false
  });
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const navigate = useNavigate();

  const { platform, stream_key, stream_url, source_type, source_url, video_id, scheduled_at, loop_enabled } = formData;
  // Load uploaded videos on component mount
  useEffect(() => {
    loadUploadedVideos();
  }, []);

  const loadUploadedVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const videos = await getUploadedVideos();
      // Only show ready videos for stream creation
      const readyVideos = videos.filter(video => video.status === 'ready');
      setUploadedVideos(readyVideos);
    } catch (error) {
      console.error('Error loading uploaded videos:', error);
      toast.error('Failed to load uploaded videos');
    } finally {
      setIsLoadingVideos(false);
    }
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };
  const handleSourceTypeChange = (e) => {
    const newSourceType = e.target.value;
    setFormData({ 
      ...formData, 
      source_type: newSourceType,
      source_url: '', // Reset source URL when type changes
      video_id: '' // Reset video selection when type changes
    });
  };

  const handleVideoSelection = (e) => {
    const selectedVideoId = e.target.value;
    const selectedVideo = uploadedVideos.find(video => video.id.toString() === selectedVideoId);
    
    setFormData({
      ...formData,
      video_id: selectedVideoId,
      source_url: selectedVideo ? selectedVideo.file_path : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!stream_key || !stream_url) {
      toast.error('Stream key and RTMP URL are required');
      return;
    }    if (source_type === 'upload_video' && !video_id) {
      toast.error('Please select an uploaded video');
      return;
    }

    if (source_type === 'live_capture' && !source_url) {
      toast.error('Source URL is required for live capture');
      return;
    }

    setIsCreatingStream(true);

    try {
      await createStream(formData);
      toast.success('Stream created successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Failed to create stream');
      console.error('Create stream error:', error);
    } finally {
      setIsCreatingStream(false);
    }
  };

  const getStreamUrlPlaceholder = () => {
    switch (platform) {
      case 'youtube':
        return 'rtmp://a.rtmp.youtube.com/live2';
      case 'tiktok':
        return 'rtmp://rtmp-push.tiktok.com/live';
      case 'shopee':
        return 'rtmp://rtmp.shopee.live/live';
      default:
        return 'RTMP URL';
    }
  };

  return (
    <div className="row">
      <div className="col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <div className="card shadow">
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">
              <i className="fas fa-plus-circle me-2"></i>
              Add New Stream
            </h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="platform" className="form-label">
                  Platform
                </label>
                <select
                  className="form-select"
                  id="platform"
                  name="platform"
                  value={platform}
                  onChange={handleChange}
                  required
                >
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="shopee">Shopee</option>
                </select>
                <div className="form-text">
                  Select the platform where you want to stream
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="stream_url" className="form-label">
                  RTMP URL
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="stream_url"
                  name="stream_url"
                  value={stream_url}
                  onChange={handleChange}
                  placeholder={getStreamUrlPlaceholder()}
                  required
                />
                <div className="form-text">
                  Enter the RTMP URL provided by the platform
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="stream_key" className="form-label">
                  Stream Key
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="stream_key"
                  name="stream_key"
                  value={stream_key}
                  onChange={handleChange}
                  placeholder="Stream key from your platform"
                  required
                />
                <div className="form-text">
                  Enter the stream key provided by the platform
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="source_type" className="form-label">
                  Source Type
                </label>
                <select
                  className="form-select"
                  id="source_type"
                  name="source_type"
                  value={source_type}
                  onChange={handleSourceTypeChange}
                  required
                >
                  <option value="upload_video">Upload Video</option>
                  <option value="live_capture">Live Capture</option>
                </select>
                <div className="form-text">
                  Select the source type for your stream
                </div>
              </div>
                {source_type === 'upload_video' ? (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label htmlFor="video_selection" className="form-label">
                      Select Video
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => navigate('/upload-video')}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Upload New Video
                    </button>
                  </div>
                  
                  {isLoadingVideos ? (
                    <div className="text-center py-3">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading videos...
                    </div>
                  ) : uploadedVideos.length === 0 ? (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      No videos uploaded yet. 
                      <button
                        type="button"
                        className="btn btn-link p-0 ms-1"
                        onClick={() => navigate('/upload-video')}
                      >
                        Upload your first video
                      </button>
                    </div>                  ) : (
                    <>
                      {/* Video Selection Cards */}
                      <div className="border rounded p-3">
                        <div className="mb-3">
                          <label className="form-label">Choose from your uploaded videos:</label>
                        </div>
                        
                        {!video_id && (
                          <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Please select a video to continue
                          </div>
                        )}
                        
                        <div className="row">
                          {uploadedVideos.map(video => (
                            <div key={video.id} className="col-md-6 col-lg-4 mb-3">
                              <div 
                                className={`card h-100 cursor-pointer ${video_id === video.id.toString() ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                                onClick={() => handleVideoSelection({ target: { value: video.id.toString() } })}
                                style={{ cursor: 'pointer' }}
                              >
                                {/* Thumbnail */}
                                <div className="position-relative">
                                  {video.thumbnail_url ? (
                                    <img 
                                      src={video.thumbnail_url} 
                                      alt={video.title}
                                      className="card-img-top"
                                      style={{ 
                                        height: '120px', 
                                        objectFit: 'cover',
                                        backgroundColor: '#f8f9fa'
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  {/* Fallback when no thumbnail or image fails to load */}
                                  {/* <div 
                                    className="card-img-top d-flex align-items-center justify-content-center bg-light"
                                    style={{ 
                                      height: '120px',
                                      display: video.thumbnail_url ? 'none' : 'flex'
                                    }}
                                  >
                                    <i className="fas fa-video fa-2x text-muted"></i>
                                  </div> */}
                                  
                                  {/* Selection indicator */}
                                  {video_id === video.id.toString() && (
                                    <div className="position-absolute top-0 start-0 m-2">
                                      <span className="badge bg-primary">
                                        <i className="fas fa-check me-1"></i>
                                        Selected
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Duration badge */}
                                  {video.duration && (
                                    <span className="position-absolute bottom-0 end-0 m-2">
                                      <span className="badge bg-dark bg-opacity-75">
                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="card-body p-2">
                                  <h6 className="card-title mb-1" style={{ fontSize: '0.9rem' }}>
                                    {video.title}
                                  </h6>
                                  <small className="text-muted">
                                    <i className="fas fa-calendar me-1"></i>
                                    {new Date(video.created_at).toLocaleDateString()}
                                  </small>
                                  {video.file_size && (
                                    <small className="text-muted d-block">
                                      <i className="fas fa-hdd me-1"></i>
                                      {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                                    </small>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {video_id && (
                        <div className="mt-2">
                          {(() => {
                            const selectedVideo = uploadedVideos.find(v => v.id.toString() === video_id);
                            return selectedVideo ? (
                              <div className="card border-success">
                                <div className="card-body p-3">
                                  <div className="d-flex align-items-start">
                                    <div className="flex-grow-1">
                                      <h6 className="card-title mb-1">{selectedVideo.title}</h6>
                                      {selectedVideo.description && (
                                        <p className="card-text small text-muted mb-1">{selectedVideo.description}</p>
                                      )}
                                      <small className="text-muted">
                                        <i className="fas fa-calendar me-1"></i>
                                        Uploaded: {new Date(selectedVideo.created_at).toLocaleDateString()}
                                        {selectedVideo.file_size && (
                                          <>
                                            <span className="mx-2">•</span>
                                            <i className="fas fa-hdd me-1"></i>
                                            {(selectedVideo.file_size / (1024 * 1024)).toFixed(2)} MB
                                          </>
                                        )}
                                      </small>
                                    </div>
                                    <span className="badge bg-success">
                                      <i className="fas fa-check me-1"></i>
                                      Selected
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="form-text">
                    Select a previously uploaded video to use as the stream source
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label htmlFor="source_url" className="form-label">
                    Source URL
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="source_url"
                    name="source_url"
                    value={source_url}
                    onChange={handleChange}
                    placeholder="RTMP URL or HTTP stream URL to capture"
                    required={source_type === 'live_capture'}
                  />
                  <div className="form-text">
                    Enter the URL of the live stream to capture
                  </div>
                </div>
              )}
                <div className="mb-3">
                <label htmlFor="scheduled_at" className="form-label">
                  Schedule Stream (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  id="scheduled_at"
                  name="scheduled_at"
                  value={scheduled_at}
                  onChange={handleChange}
                />
                <div className="form-text">
                  Schedule the stream for a future time (optional)
                </div>
              </div>
              
              {source_type === 'upload_video' && (
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="loop_enabled"
                      name="loop_enabled"
                      checked={loop_enabled}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="loop_enabled">
                      <i className="fas fa-repeat me-2"></i>
                      Loop video continuously
                    </label>
                  </div>
                  <div className="form-text">
                    When enabled, the video will loop infinitely until the stream is stopped
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreatingStream}
                >
                  {isCreatingStream ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus-circle me-2"></i>
                      Create Stream
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStream; 