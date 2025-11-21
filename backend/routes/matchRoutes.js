import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  handleInteraction,
  getSuggestions,
  getMatches,
} from '../controllers/matchController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Handle like/skip interaction with another user
router.post('/:targetId', handleInteraction);

// Get match suggestions
router.get('/suggestions', getSuggestions);

// Get user's matches
router.get('/matches', getMatches);

export default router;
