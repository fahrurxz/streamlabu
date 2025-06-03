import axios from 'axios';

// Create an instance of axios
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token refresh flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token is in a valid format (simple validation)
      if (token.split('.').length === 3) {
        config.headers['x-auth-token'] = token;
      } else {
        // Clear invalid token
        console.warn('Removing invalid token format');
        localStorage.removeItem('token');
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['x-auth-token'] = token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentToken = localStorage.getItem('token');
        if (currentToken && currentToken.split('.').length === 3) {
          // Try to refresh the token
          const response = await api.post('/users/refresh-token', {}, {
            headers: { 'x-auth-token': currentToken }
          });
          
          const { token } = response.data;
          localStorage.setItem('token', token);
          
          // Process queued requests
          processQueue(null, token);
          
          // Retry original request
          originalRequest.headers['x-auth-token'] = token;
          return api(originalRequest);
        } else {
          throw new Error('No valid token for refresh');
        }
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        localStorage.removeItem('token');
        processQueue(refreshError, null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Authentication Services
export const register = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const login = async (userData) => {
  try {
    const response = await api.post('/users/login', userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const getProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Refresh JWT token
export const refreshToken = async () => {
  try {
    const response = await api.post('/users/refresh-token');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Stream Services
export const getStreams = async () => {
  try {
    // Log the auth token being sent
    console.log('Auth token for getStreams:', localStorage.getItem('token'));
    
    const response = await api.get('/streams');
    console.log('Streams response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching streams:', error);
    throw error.response ? error.response.data : error.message;
  }
};

export const getStream = async (id) => {
  try {
    const response = await api.get(`/streams/${id}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const createStream = async (streamData) => {
  try {
    const response = await api.post('/streams', streamData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const updateStream = async (id, streamData) => {
  try {
    const response = await api.put(`/streams/${id}`, streamData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const startStream = async (id) => {
  try {
    const response = await api.post(`/streams/${id}/start`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const stopStream = async (id) => {
  try {
    const response = await api.post(`/streams/${id}/stop`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const deleteStream = async (id) => {
  try {
    const response = await api.delete(`/streams/${id}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const uploadVideo = async (formData, onUploadProgress = null) => {
  try {
    // Custom config with different Content-Type and progress tracking
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    if (onUploadProgress) {
      config.onUploadProgress = onUploadProgress;
    }

    const response = await api.post('/streams/upload-video', formData, config);
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Upload video from Google Drive
export const uploadVideoFromGoogleDrive = async (uploadData) => {
  try {
    const response = await api.post('/streams/upload-from-google-drive', uploadData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Get all uploaded videos
export const getUploadedVideos = async () => {
  try {
    const response = await api.get('/streams/uploaded-videos');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Delete uploaded video
export const deleteUploadedVideo = async (videoId) => {
  try {
    const response = await api.delete(`/streams/uploaded-videos/${videoId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Get video processing status
export const getVideoStatus = async (videoId) => {
  try {
    const response = await api.get(`/streams/video-status/${videoId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// YouTube Services
export const getYoutubeStreamUrl = async (params) => {
  try {
    // Build URL with query params
    let url = '/youtube/stream-url';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.videoId) queryParams.append('videoId', params.videoId);
      if (params.url) queryParams.append('url', params.url);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error getting YouTube stream URL:', error);
    throw error.response ? error.response.data : error.message;
  }
};