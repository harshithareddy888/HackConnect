import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createTask,
  getTeamTasks,
  getTask,
  updateTask,
  assignTask,
  removeAssignee,
  addComment,
  deleteTask,
} from '../controllers/taskController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Task operations
router.route('/')
  .post(createTask);

router.get('/team/:teamId', getTeamTasks);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// Task assignment and comments
router.post('/:id/assign', assignTask);
router.delete('/:taskId/assign/:userId', removeAssignee);
router.post('/:id/comments', addComment);

export default router;
