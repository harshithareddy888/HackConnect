import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  inviteToTeam,
  respondToInvite,
  removeMember,
  leaveTeam,
} from '../controllers/teamController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Team CRUD operations
router.route('/')
  .post(createTeam)
  .get(getTeams);

router.route('/:id')
  .get(getTeam)
  .put(updateTeam);

// Team member management
router.post('/:teamId/invite/:userId', inviteToTeam);
router.post('/:teamId/respond', respondToInvite);
router.delete('/:teamId/members/:userId', removeMember);
router.post('/:teamId/leave', leaveTeam);

export default router;
