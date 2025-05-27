import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { toast } from 'react-toastify';

const Login = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const { email, password } = formData;

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Pastikan email dan password tidak kosong
      if (!email || !password) {
        toast.error('Email dan password harus diisi');
        setIsLoading(false);
        return;
      }
      
      // Panggil API login yang sebenarnya
      const { token } = await login(formData);
      
      // Menyimpan token di localStorage
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="row">
      <div className="col-md-6 offset-md-3 col-lg-4 offset-lg-4">
        <div className="auth-form">
          <h2 className="auth-title">
            <i className="fas fa-sign-in-alt me-2"></i>Login
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={password}
                onChange={handleChange}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary w-100 mb-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
            <p className="text-center">
              Don't have an account?{' '}
              <Link to="/register">Register here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 