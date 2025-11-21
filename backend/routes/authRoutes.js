import express from 'express';
import { register, login, refreshToken } from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/refresh', refreshToken);

export default router;
