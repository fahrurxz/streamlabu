const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', userController.register);

// @route   POST api/users/login
// @desc    Login user & get token
// @access  Public
router.post('/login', userController.login);

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, userController.getProfile);

// @route   POST api/users/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', auth, userController.refreshToken);

module.exports = router;