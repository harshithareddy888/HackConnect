import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMe,
  updateProfile,
  getUser,
  getUsers,
} from '../controllers/userController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/me')
  .get(getMe)
  .put(updateProfile);

router.get('/', getUsers);
router.get('/:id', getUser);

export default router;
