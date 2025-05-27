import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStream, uploadVideo } from '../services/api';
import { toast } from 'react-toastify';

const AddStream = () => {
  const [formData, setFormData] = useState({
    platform: 'youtube',
    stream_key: '',
    stream_url: '',
    source_type: 'upload_video',
    source_url: '',
    scheduled_at: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isCreatingStream, setIsCreatingStream] = useState(false);

  const navigate = useNavigate();

  const { platform, stream_key, stream_url, source_type, source_url, scheduled_at } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSourceTypeChange = (e) => {
    const newSourceType = e.target.value;
    setFormData({ 
      ...formData, 
      source_type: newSourceType,
      source_url: '' // Reset source URL when type changes
    });
    setVideoFile(null);
  };

  const handleVideoFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video file first');
      return;
    }

    try {
      setIsUploadingVideo(true);
      const uploadResult = await uploadVideo(videoFile);
      
      // Set source_url to the path of the uploaded file
      setFormData({ 
        ...formData, 
        source_url: uploadResult.file.path 
      });
      
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to upload video');
      console.error('Video upload error:', error);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!stream_key || !stream_url) {
      toast.error('Stream key and RTMP URL are required');
      return;
    }

    if (source_type === 'upload_video' && !source_url) {
      toast.error('Please upload a video file first');
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
                  <label htmlFor="video_file" className="form-label">
                    Video File
                  </label>
                  <div className="input-group">
                    <input
                      type="file"
                      className="form-control"
                      id="video_file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleVideoUpload}
                      disabled={!videoFile || isUploadingVideo}
                    >
                      {isUploadingVideo ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Uploading...
                        </>
                      ) : (
                        <>Upload</>
                      )}
                    </button>
                  </div>
                  {source_url && (
                    <div className="alert alert-success mt-2">
                      <i className="fas fa-check-circle me-2"></i>
                      Video uploaded successfully
                    </div>
                  )}
                  <div className="form-text">
                    Upload a video file to use as the stream source
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