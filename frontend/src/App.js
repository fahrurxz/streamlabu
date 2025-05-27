import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AddStream from './pages/AddStream';
import PrivateRoute from './components/PrivateRoute';
import jwtDecode from 'jwt-decode';
// Import disabled for production mode
// import { initDevEnvironment } from './utils/devHelpers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          console.log('Token expired');
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
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
            } />
            <Route path="/add-stream" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <AddStream />
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