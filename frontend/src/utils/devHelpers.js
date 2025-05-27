/**
 * Development helper utilities
 * These utilities should only be used during development
 */

/**
 * Sets a development token in localStorage to bypass authentication
 */
export const setDevToken = () => {
  // Only run in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Setting development token. NEVER use this in production!');
    localStorage.setItem('token', 'dev-token-for-testing');
    return true;
  }
  console.error('Cannot set development token in production mode');
  return false;
};

/**
 * Checks if the application is running in development mode
 */
export const isDevelopmentMode = () => {
  return process.env.NODE_ENV !== 'production';
};

/**
 * Initializes development environment helpers
 * Call this function in App.js for development mode
 */
export const initDevEnvironment = () => {
  if (isDevelopmentMode()) {
    // Auto-set development token if not present
    if (!localStorage.getItem('token')) {
      setDevToken();
      console.log('Development token automatically set');
    }
    
    // Add development mode indicator
    const devIndicator = document.createElement('div');
    devIndicator.style.position = 'fixed';
    devIndicator.style.bottom = '10px';
    devIndicator.style.right = '10px';
    devIndicator.style.backgroundColor = 'red';
    devIndicator.style.color = 'white';
    devIndicator.style.padding = '5px 10px';
    devIndicator.style.borderRadius = '5px';
    devIndicator.style.zIndex = '9999';
    devIndicator.style.fontSize = '12px';
    devIndicator.textContent = 'DEV MODE';
    document.body.appendChild(devIndicator);
    
    console.log('Development environment initialized');
    return true;
  }
  return false;
}; 