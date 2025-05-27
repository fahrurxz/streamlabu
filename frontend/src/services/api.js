import axios from 'axios';

// Create an instance of axios
const api = axios.create({
  baseURL: 'http://34.133.178.240:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

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

export const uploadVideo = async (videoFile) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('video', videoFile);

    // Custom config with different Content-Type
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    const response = await api.post('/streams/upload-video', formData, config);
    console.log(response.data);
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