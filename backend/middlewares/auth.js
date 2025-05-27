const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = (req, res, next) => {
  // Check if in development mode and bypass flag is set
  const isDevelopment = process.env.NODE_ENV === 'development';
  const bypassAuth = process.env.DEV_BYPASS_AUTH === 'true';

  if (isDevelopment && bypassAuth) {
    console.log('WARNING: Authentication bypassed in development mode');
    // Set a default development user
    req.user = {
      id: 1,
      username: 'devuser'
    };
    return next();
  }

  // Get token from header
  const token = req.header('x-auth-token');

  // In development mode with DEV_ACCEPT_ANY_TOKEN, accept any token
  if (isDevelopment && process.env.DEV_ACCEPT_ANY_TOKEN === 'true' && token) {
    console.log('WARNING: Using development token validation (any token accepted)');
    try {
      // Try to decode, but if fails, use a default user
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
      } catch (err) {
        // In development, we'll just use a default user if token is invalid
        req.user = {
          id: 1,
          username: 'devuser'
        };
      }
      return next();
    } catch (err) {
      console.error('Dev token error:', err.message);
    }
  }

  // Regular token validation for production
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user from payload
    req.user = decoded.user;
    console.log('Authenticated user:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 