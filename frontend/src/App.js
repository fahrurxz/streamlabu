import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AddStream from './pages/AddStream';
import UploadVideo from './pages/UploadVideo';
import PrivateRoute from './components/PrivateRoute';
import jwtDecode from 'jwt-decode';
import { refreshToken } from './services/api';
// Import disabled for production mode
// import { initDevEnvironment } from './utils/devHelpers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Function to check if token is close to expiration (within 1 hour)
  const isTokenNearExpiration = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiration = decoded.exp - currentTime;
      // Return true if token expires within 1 hour (3600 seconds)
      return timeUntilExpiration < 3600;
    } catch (error) {
      return true; // If we can't decode, consider it near expiration
    }
  };

  // Function to attempt token refresh
  const attemptTokenRefresh = async (currentToken) => {
    try {
      console.log('Attempting to refresh token...');
      const response = await refreshToken();
      if (response.token) {
        localStorage.setItem('token', response.token);
        console.log('Token refreshed successfully');
        return response.token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // Development environment initialization disabled
    // if (process.env.NODE_ENV !== 'production') {
    //   initDevEnvironment();
    // }

    // Check if token exists and is valid
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Validate token format first
        if (token.split('.').length !== 3) {
          console.error('Invalid token format');
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          return;
        }
        
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired
        if (decoded.exp < currentTime) {
          console.log('Token expired, attempting refresh...');
          attemptTokenRefresh(token);
        } else if (isTokenNearExpiration(token)) {
          // Token is close to expiration, refresh it proactively
          console.log('Token near expiration, refreshing proactively...');
          attemptTokenRefresh(token).then((newToken) => {
            if (newToken) {
              const newDecoded = jwtDecode(newToken);
              setIsAuthenticated(true);
              setUser(newDecoded.user);
            }
          });
        } else if (!decoded.user || !decoded.user.id) {
          console.error('Token missing user data');
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        } else {
          console.log('Valid token found:', decoded.user);
          setIsAuthenticated(true);
          setUser(decoded.user);
        }
      } catch (error) {
        // Development bypass removed
        console.error('Token decode error:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    } 
    // Development bypass removed
    // else if (process.env.NODE_ENV !== 'production') {
    //   console.warn('Using development authentication mode without token');
    //   setIsAuthenticated(true);
    //   setUser({ id: 1, username: 'devuser' });
    // }
  }, []);

  // Set up periodic token refresh check
  useEffect(() => {
    if (!isAuthenticated) return;

    const tokenRefreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && isTokenNearExpiration(token)) {
        console.log('Periodic token refresh check - refreshing token...');
        attemptTokenRefresh(token);
      }
    }, 30 * 60 * 1000); // Check every 30 minutes

    return () => clearInterval(tokenRefreshInterval);
  }, [isAuthenticated]);

  return (
    <Router>
      <div className="App">
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
            } />
            <Route path="/login" element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Login setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/register" element={
              isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Register setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/dashboard" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </PrivateRoute>
            } />            <Route path="/add-stream" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <AddStream />
              </PrivateRoute>
            } />
            <Route path="/upload-video" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <UploadVideo />
              </PrivateRoute>
            } />
          </Routes>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;