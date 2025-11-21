import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';
import { generateToken, generateRefreshToken } from '../utils/generateTokens.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return next(new ErrorResponse('User already exists', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    // Send response
    sendTokenResponse(user, token, refreshToken, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    // Send response
    sendTokenResponse(user, token, refreshToken, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get new access token using refresh token
// @route   GET /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse('No refresh token provided', 401));
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user with the refresh token
    const user = await User.findOne({ _id: decoded.id, refreshToken });

    if (!user) {
      return next(new ErrorResponse('Invalid refresh token', 401));
    }

    // Generate new access token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    return next(new ErrorResponse('Invalid refresh token', 401));
  }
};

// Helper function to send token response
const sendTokenResponse = (user, token, refreshToken, statusCode, res) => {
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    data: userObj,
  });
};
