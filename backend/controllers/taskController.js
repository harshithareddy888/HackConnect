import Task from '../models/Task.js';
import Team from '../models/Team.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, labels, team: teamId } = req.body;
    const userId = req.user.id;

    // Check if team exists and user is a member
    const team = await Team.findOne({
      _id: teamId,
      'members.user': userId,
    });

    if (!team) {
      return next(new ErrorResponse('Not authorized to create tasks for this team', 401));
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      labels,
      createdBy: userId,
      team: teamId,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks for a team
// @route   GET /api/tasks/team/:teamId
// @access  Private
export const getTeamTasks = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is a member of the team
    const isMember = await Team.exists({
      _id: teamId,
      'members.user': userId,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to view these tasks', 401));
    }

    // Build query
    const query = { team: teamId };

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by assignee if provided
    if (req.query.assignedTo) {
      query['assignedTo.user'] = req.query.assignedTo;
    }

    // Filter by priority if provided
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Execute query
    const tasks = await Task.find(query)
      .populate({
        path: 'assignedTo.user',
        select: 'name email avatar',
      })
      .populate({
        path: 'createdBy',
        select: 'name email avatar',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate({
        path: 'assignedTo.user',
        select: 'name email avatar',
      })
      .populate({
        path: 'createdBy',
        select: 'name email avatar',
      })
      .populate({
        path: 'comments.user',
        select: 'name email avatar',
      });

    if (!task) {
      return next(new ErrorResponse(`Task not found with id of ${req.params.id}`, 404));
    }

    // Check if user is a member of the task's team
    const isMember = await Team.exists({
      _id: task.team,
      'members.user': req.user.id,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to view this task', 401));
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, labels } = req.body;
    const taskId = req.params.id;
    const userId = req.user.id;

    // Find task and check if user is a team member
    const task = await Task.findById(taskId).populate('team');
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const isMember = await Team.exists({
      _id: task.team._id,
      'members.user': userId,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to update this task', 401));
    }

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (labels) task.labels = labels;

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign task to team members
// @route   POST /api/tasks/:id/assign
// @access  Private
export const assignTask = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const taskId = req.params.id;
    const requesterId = req.user.id;

    // Find task
    const task = await Task.findById(taskId).populate('team');
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Check if requester is a team member
    const isMember = await Team.exists({
      _id: task.team._id,
      'members.user': requesterId,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to assign this task', 401));
    }

    // Check if all users are team members
    const teamMemberCount = await Team.countDocuments({
      _id: task.team._id,
      'members.user': { $all: userIds },
    });

    if (teamMemberCount !== 1) {
      return next(new ErrorResponse('One or more users are not team members', 400));
    }

    // Add new assignees (avoid duplicates)
    const existingAssigneeIds = task.assignedTo.map(assignee => assignee.user.toString());
    const newAssignees = userIds
      .filter(userId => !existingAssigneeIds.includes(userId))
      .map(userId => ({
        user: userId,
        assignedAt: Date.now(),
      }));

    task.assignedTo = [...task.assignedTo, ...newAssignees];
    await task.save();

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove assignee from task
// @route   DELETE /api/tasks/:taskId/assign/:userId
// @access  Private
export const removeAssignee = async (req, res, next) => {
  try {
    const { taskId, userId } = req.params;
    const requesterId = req.user.id;

    // Find task
    const task = await Task.findById(taskId).populate('team');
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Check if requester is a team member
    const isMember = await Team.exists({
      _id: task.team._id,
      'members.user': requesterId,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to modify this task', 401));
    }

    // Remove assignee
    task.assignedTo = task.assignedTo.filter(
      assignee => assignee.user.toString() !== userId
    );

    await task.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const taskId = req.params.id;
    const userId = req.user.id;

    // Find task
    const task = await Task.findById(taskId).populate('team');
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Check if user is a team member
    const isMember = await Team.exists({
      _id: task.team._id,
      'members.user': userId,
    });

    if (!isMember) {
      return next(new ErrorResponse('Not authorized to comment on this task', 401));
    }

    // Add comment
    task.comments.push({
      user: userId,
      text,
    });

    await task.save();

    res.status(201).json({
      success: true,
      data: task.comments[task.comments.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // Find task
    const task = await Task.findById(taskId).populate('team');
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Check if user is the task creator or a team leader
    const isAuthorized = await Team.exists({
      _id: task.team._id,
      $or: [
        { 'members.user': userId, 'members.role': 'leader' },
        { 'members.user': userId, _id: task.createdBy },
      ],
    });

    if (!isAuthorized) {
      return next(new ErrorResponse('Not authorized to delete this task', 401));
    }

    await task.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
