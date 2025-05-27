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

module.exports = router; 