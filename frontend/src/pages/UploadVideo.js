import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo, uploadVideoFromGoogleDrive, getUploadedVideos, deleteUploadedVideo, getVideoStatus, retryGoogleDriveDownload, validateGoogleDriveLink } from '../services/api';
import { toast } from 'react-toastify';

const UploadVideo = () => {
  const [uploadType, setUploadType] = useState('local'); // 'local' or 'google_drive'
  const [videoFile, setVideoFile] = useState(null);
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Video management state
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isDeletingVideo, setIsDeletingVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manage'

  // Google Drive validation state
  const [isValidatingLink, setIsValidatingLink] = useState(false);
  const [linkValidation, setLinkValidation] = useState(null);

  const navigate = useNavigate();
  // Load uploaded videos on component mount
  useEffect(() => {
    loadUploadedVideos();
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (handleGoogleDriveLinkChange.timeoutId) {
        clearTimeout(handleGoogleDriveLinkChange.timeoutId);
      }
    };
  }, []);

  // Auto-refresh for processing videos
  useEffect(() => {
    const processingVideos = uploadedVideos.filter(video => video.status === 'processing');
    
    if (processingVideos.length > 0) {
      const interval = setInterval(async () => {
        let hasUpdates = false;
        
        for (const video of processingVideos) {
          try {
            const statusUpdate = await getVideoStatus(video.id);
            if (statusUpdate.status !== video.status) {
              hasUpdates = true;
              break;
            }
          } catch (error) {
            console.error('Error checking video status:', error);
          }
        }
        
        if (hasUpdates) {
          loadUploadedVideos();
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [uploadedVideos]);

  const loadUploadedVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const videos = await getUploadedVideos();
      setUploadedVideos(videos);
    } catch (error) {
      console.error('Error loading uploaded videos:', error);
      toast.error('Failed to load uploaded videos');
    } finally {
      setIsLoadingVideos(false);
    }
  };
  const handleDeleteVideo = async (videoId, videoTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingVideo(videoId);
    try {
      await deleteUploadedVideo(videoId);
      toast.success('Video deleted successfully');
      // Reload the videos list
      loadUploadedVideos();
    } catch (error) {
      toast.error(error.message || 'Failed to delete video');
      console.error('Delete video error:', error);
    } finally {
      setIsDeletingVideo(null);
    }
  };
  const handleRetryGoogleDriveDownload = async (videoId) => {
    if (!window.confirm('Retry downloading this video from Google Drive?')) {
      return;
    }

    setIsDeletingVideo(videoId); // Reuse the loading state
    try {
      await retryGoogleDriveDownload(videoId);
      toast.success('Video download restarted successfully');
      // Reload the videos list
      loadUploadedVideos();
    } catch (error) {
      toast.error(error.message || 'Failed to retry download');
      console.error('Retry download error:', error);
    } finally {
      setIsDeletingVideo(null);
    }
  };

  // Validate Google Drive link
  const handleValidateGoogleDriveLink = async (link) => {
    if (!link || !link.trim()) {
      setLinkValidation(null);
      return;
    }

    setIsValidatingLink(true);
    try {
      const result = await validateGoogleDriveLink(link.trim());
      setLinkValidation(result);
    } catch (error) {
      setLinkValidation({
        valid: false,
        message: error.message || 'Failed to validate link'
      });
    } finally {
      setIsValidatingLink(false);
    }
  };
  // Handle Google Drive link change with validation
  const handleGoogleDriveLinkChange = (e) => {
    const link = e.target.value;
    setGoogleDriveLink(link);
    
    // Clear previous validation
    setLinkValidation(null);
    
    // If link is empty, don't validate
    if (!link || !link.trim()) {
      return;
    }
    
    // Check basic format first
    if (!validateGoogleDriveLink(link)) {
      setLinkValidation({
        valid: false,
        message: 'Invalid Google Drive link format'
      });
      return;
    }
    
    // Debounce API validation
    const timeoutId = setTimeout(() => {
      handleValidateGoogleDriveLink(link);
    }, 1000);
    
    // Store timeout to clear it if needed
    if (handleGoogleDriveLinkChange.timeoutId) {
      clearTimeout(handleGoogleDriveLinkChange.timeoutId);
    }
    handleGoogleDriveLinkChange.timeoutId = timeoutId;
  };

  const handleVideoFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      // Auto-generate title from filename if not set
      if (!videoTitle) {
        const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
        setVideoTitle(nameWithoutExtension);
      }
    }
  };

  const validateGoogleDriveLink = (link) => {
    // Check if it's a valid Google Drive link
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    return patterns.some(pattern => pattern.test(link));
  };

  const extractGoogleDriveFileId = (link) => {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const handleLocalUpload = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }

    if (!videoTitle.trim()) {
      toast.error('Please enter a video title');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data with metadata
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', videoTitle.trim());
      formData.append('description', videoDescription.trim());

      const result = await uploadVideo(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });      toast.success('Video uploaded successfully!');
      // Reload videos list and switch to manage tab
      loadUploadedVideos();
      setActiveTab('manage');
      // Reset form
      setVideoFile(null);
      setVideoTitle('');
      setVideoDescription('');
      document.getElementById('videoFile').value = '';
    } catch (error) {
      toast.error(error.message || 'Failed to upload video');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleGoogleDriveUpload = async (e) => {
    e.preventDefault();
    
    if (!googleDriveLink.trim()) {
      toast.error('Please enter a Google Drive link');
      return;
    }

    if (!validateGoogleDriveLink(googleDriveLink)) {
      toast.error('Please enter a valid Google Drive share link');
      return;
    }

    if (!videoTitle.trim()) {
      toast.error('Please enter a video title');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileId = extractGoogleDriveFileId(googleDriveLink);
      const uploadData = {
        googleDriveFileId: fileId,
        googleDriveLink: googleDriveLink.trim(),
        title: videoTitle.trim(),
        description: videoDescription.trim()
      };      const result = await uploadVideoFromGoogleDrive(uploadData);
      
      toast.success('Video imported from Google Drive successfully!');
      // Reload videos list and switch to manage tab
      loadUploadedVideos();
      setActiveTab('manage');
      // Reset form
      setGoogleDriveLink('');
      setVideoTitle('');
      setVideoDescription('');
    } catch (error) {
      toast.error(error.message || 'Failed to import video from Google Drive');
      console.error('Google Drive upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ready': return 'bg-success';
      case 'processing': return 'bg-warning';
      case 'error': return 'bg-danger';
      case 'uploading': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return <i className="fas fa-check-circle me-1"></i>;
      case 'processing': return <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>;
      case 'error': return <i className="fas fa-exclamation-circle me-1"></i>;
      case 'uploading': return <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>;
      default: return <i className="fas fa-question-circle me-1"></i>;
    }
  };
  const getStatusText = (status) => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'processing': return 'Processing';
      case 'error': return 'Error';
      case 'uploading': return 'Uploading';
      default: return 'Unknown';
    }
  };
  return (
    <div className="row">
      <div className="col-md-10 offset-md-1">
        <div className="card shadow">
          <div className="card-header bg-success text-white">
            <h4 className="mb-0">
              <i className="fas fa-cloud-upload-alt me-2"></i>
              Video Management
            </h4>
          </div>
          <div className="card-body p-0">
            {/* Tab Navigation */}
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                  type="button"
                >
                  <i className="fas fa-upload me-2"></i>
                  Upload Video
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === 'manage' ? 'active' : ''}`}
                  onClick={() => setActiveTab('manage')}
                  type="button"
                >
                  <i className="fas fa-video me-2"></i>
                  Manage Videos ({uploadedVideos.length})
                </button>
              </li>
            </ul>

            {/* Tab Content */}
            <div className="tab-content p-4">
              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="tab-pane fade show active">
                  {/* Upload Type Selection */}
                  <div className="mb-4">
                    <label className="form-label">Upload Source</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="uploadType"
                        id="local"
                        value="local"
                        checked={uploadType === 'local'}
                        onChange={(e) => setUploadType(e.target.value)}
                      />
                      <label className="btn btn-outline-primary" htmlFor="local">
                        <i className="fas fa-desktop me-2"></i>
                        Local File
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="uploadType"
                        id="google_drive"
                        value="google_drive"
                        checked={uploadType === 'google_drive'}
                        onChange={(e) => setUploadType(e.target.value)}
                      />
                      <label className="btn btn-outline-primary" htmlFor="google_drive">
                        <i className="fab fa-google-drive me-2"></i>
                        Google Drive
                      </label>
                    </div>
                  </div>

                  {/* Common Fields */}
                  <div className="mb-3">
                    <label htmlFor="videoTitle" className="form-label">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="videoTitle"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Enter video title"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="videoDescription" className="form-label">
                      Description (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      id="videoDescription"
                      rows="3"
                      value={videoDescription}
                      onChange={(e) => setVideoDescription(e.target.value)}
                      placeholder="Enter video description (optional)"
                    ></textarea>
                  </div>

                  {/* Local Upload Form */}
                  {uploadType === 'local' && (
                    <form onSubmit={handleLocalUpload}>
                      <div className="mb-3">
                        <label htmlFor="videoFile" className="form-label">
                          Select Video File *
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          id="videoFile"
                          accept="video/*"
                          onChange={handleVideoFileChange}
                          required
                        />
                        <div className="form-text">
                          Supported formats: MP4, AVI, MOV, WMV, FLV, MKV (Max: 500MB)
                        </div>
                      </div>

                      {videoFile && (
                        <div className="alert alert-info">
                          <i className="fas fa-info-circle me-2"></i>
                          Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </div>
                      )}

                      {isUploading && (
                        <div className="mb-3">
                          <label className="form-label">Upload Progress</label>
                          <div className="progress">
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated"
                              role="progressbar"
                              style={{ width: `${uploadProgress}%` }}
                              aria-valuenow={uploadProgress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            >
                              {uploadProgress}%
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="d-flex gap-2 mt-4">
                        <button
                          type="submit"
                          className="btn btn-success"
                          disabled={isUploading || !videoFile}
                        >
                          {isUploading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-upload me-2"></i>
                              Upload Video
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => navigate('/dashboard')}
                          disabled={isUploading}
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Google Drive Upload Form */}
                  {uploadType === 'google_drive' && (
                    <form onSubmit={handleGoogleDriveUpload}>                      <div className="mb-3">
                        <label htmlFor="googleDriveLink" className="form-label">
                          Google Drive Share Link *
                        </label>
                        <input
                          type="url"
                          className={`form-control ${
                            linkValidation 
                              ? linkValidation.valid 
                                ? 'is-valid' 
                                : 'is-invalid'
                              : ''
                          }`}
                          id="googleDriveLink"
                          value={googleDriveLink}
                          onChange={handleGoogleDriveLinkChange}
                          placeholder="https://drive.google.com/file/d/..."
                          required
                        />
                        
                        {/* Validation Feedback */}
                        {isValidatingLink && (
                          <div className="d-flex align-items-center mt-2 text-info">
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            <small>Validating link...</small>
                          </div>
                        )}
                        
                        {linkValidation && (
                          <div className={`mt-2 ${linkValidation.valid ? 'text-success' : 'text-danger'}`}>
                            <small>
                              <i className={`fas ${linkValidation.valid ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1`}></i>
                              {linkValidation.message}
                            </small>
                          </div>
                        )}
                        
                        <div className="form-text">
                          Make sure the file is shared publicly or with link access
                        </div>
                      </div><div className="alert alert-info mb-3">
                        <h6 className="alert-heading">
                          <i className="fab fa-google-drive me-2"></i>
                          Google Drive Import Instructions
                        </h6>
                        <ul className="mb-0 small">
                          <li>Make sure the file is shared with "Anyone with the link" permission</li>
                          <li>Large files (200MB+) may take longer to process due to Google's virus scanning</li>
                          <li>Supported formats: MP4, AVI, MOV, WMV, FLV, MKV</li>
                          <li>If the download fails, you can use the retry button</li>
                        </ul>
                      </div>

                      {isUploading && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center">
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Importing video from Google Drive...
                          </div>
                        </div>
                      )}

                      <div className="d-flex gap-2 mt-4">                        <button
                          type="submit"
                          className="btn btn-success"
                          disabled={
                            isUploading || 
                            !googleDriveLink.trim() || 
                            isValidatingLink ||
                            (linkValidation && !linkValidation.valid)
                          }
                        >
                          {isUploading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Importing...
                            </>
                          ) : (
                            <>
                              <i className="fab fa-google-drive me-2"></i>
                              Import from Google Drive
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => navigate('/dashboard')}
                          disabled={isUploading}
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Manage Videos Tab */}
              {activeTab === 'manage' && (
                <div className="tab-pane fade show active">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">
                      <i className="fas fa-video me-2"></i>
                      My Uploaded Videos
                    </h5>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => setActiveTab('upload')}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Upload New Video
                    </button>
                  </div>

                  {isLoadingVideos ? (
                    <div className="text-center py-5">
                      <span className="spinner-border spinner-border-lg" role="status" aria-hidden="true"></span>
                      <p className="mt-3 text-muted">Loading videos...</p>
                    </div>
                  ) : uploadedVideos.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-video fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No videos uploaded yet</h5>
                      <p className="text-muted">Upload your first video to get started</p>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => setActiveTab('upload')}
                      >
                        <i className="fas fa-upload me-2"></i>
                        Upload Video
                      </button>
                    </div>
                  ) : (                    <div className="row">
                      {uploadedVideos.map(video => (
                        <div key={video.id} className="col-md-6 col-lg-4 mb-4">
                          <div className="card h-100 border-0 shadow-sm">
                            {/* Thumbnail */}
                            <div className="position-relative">
                              {video.thumbnail_url ? (
                                <img 
                                  src={video.thumbnail_url} 
                                  alt={video.title}
                                  className="card-img-top"
                                  style={{ 
                                    height: '180px', 
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
                                  height: '180px',
                                  display: video.thumbnail_url ? 'none' : 'flex'
                                }}
                              >
                                <i className="fas fa-video fa-3x text-muted"></i>
                              </div>             */}
                                {/* Upload type badge */}
                              <span className="position-absolute top-0 end-0 m-2">
                                <span className={`badge ${video.status === 'ready' ? 'bg-success' : video.status === 'processing' ? 'bg-warning' : video.status === 'error' ? 'bg-danger' : 'bg-secondary'}`}>
                                  <i className={`${video.upload_type === 'google_drive' ? 'fab fa-google-drive' : 'fas fa-desktop'} me-1`}></i>
                                  {video.upload_type === 'google_drive' ? 'Drive' : 'Local'}
                                </span>
                              </span>
                              {/* Duration badge */}
                              {video.duration && (
                                <span className="position-absolute bottom-0 end-0 m-2">
                                  <span className="badge bg-dark bg-opacity-75">
                                    {formatDuration(video.duration)}
                                  </span>
                                </span>
                              )}
                            </div>
                              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                              <small className="text-muted">
                                <i className="fas fa-calendar me-1"></i>
                                {new Date(video.created_at).toLocaleDateString()}
                              </small>
                              <span className={`badge ${getStatusBadgeClass(video.status)}`}>
                                {getStatusIcon(video.status)}
                                {getStatusText(video.status)}
                              </span>
                            </div>                            <div className="card-body">
                              <h6 className="card-title">{video.title}</h6>
                              {video.description && (
                                <p className="card-text small text-muted">{video.description}</p>
                              )}
                                {/* Show error message if video processing failed */}
                              {video.status === 'error' && video.error_message && (
                                <div className="alert alert-danger alert-sm p-2 mb-2">
                                  <small>
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    <strong>Error:</strong> {video.error_message}
                                    {video.upload_type === 'google_drive' && (
                                      <div className="mt-1">
                                        <em>Tip: Try using the retry button below, or ensure the Google Drive file is publicly accessible.</em>
                                      </div>
                                    )}
                                  </small>
                                </div>
                              )}

                              {/* Show processing message */}
                              {video.status === 'processing' && (
                                <div className="alert alert-warning alert-sm p-2 mb-2">
                                  <small>
                                    <i className="fas fa-download me-1"></i>
                                    Downloading from Google Drive...
                                  </small>
                                </div>
                              )}

                              <div className="mb-2">
                                {video.file_size && (
                                  <small className="text-muted d-block">
                                    <i className="fas fa-hdd me-1"></i>
                                    Size: {formatFileSize(video.file_size)}
                                  </small>
                                )}
                              </div>
                            </div>                            <div className="card-footer bg-transparent">
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm flex-grow-1"
                                  onClick={() => navigate('/add-stream', { state: { selectedVideoId: video.id } })}
                                  disabled={video.status !== 'ready'}
                                >
                                  <i className="fas fa-stream me-1"></i>
                                  Use for Stream
                                </button>
                                
                                {/* Retry button for failed Google Drive downloads */}
                                {video.status === 'error' && video.upload_type === 'google_drive' && (
                                  <button
                                    type="button"
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleRetryGoogleDriveDownload(video.id)}
                                    disabled={isDeletingVideo === video.id}
                                    title="Retry download"
                                  >
                                    <i className="fas fa-redo"></i>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteVideo(video.id, video.title)}
                                  disabled={isDeletingVideo === video.id}
                                >
                                  {isDeletingVideo === video.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <i className="fas fa-trash"></i>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;
