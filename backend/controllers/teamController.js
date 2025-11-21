import Team from '../models/Team.js';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
export const createTeam = async (req, res, next) => {
  try {
    const { name, description, projectIdea, skillsNeeded, maxMembers } = req.body;
    const userId = req.user.id;

    // Check if user is already in a team
    const existingTeam = await Team.findOne({ 'members.user': userId });
    if (existingTeam) {
      return next(
        new ErrorResponse('You are already a member of a team', 400)
      );
    }

    // Create new team with the creator as the first member
    const team = await Team.create({
      name,
      description,
      projectIdea,
      skillsNeeded,
      maxMembers: maxMembers || 5,
      members: [
        {
          user: userId,
          role: 'leader',
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ErrorResponse('Team name already exists', 400));
    }
    next(error);
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];
    
    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    // Finding resource
    let query = Team.find(JSON.parse(queryStr))
      .populate({
        path: 'members.user',
        select: 'name email avatar role experienceLevel',
      })
      .populate({
        path: 'invites.user invites.invitedBy',
        select: 'name email avatar',
      });

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Team.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const teams = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: teams.length,
      pagination,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
export const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate({
        path: 'members.user',
        select: 'name email avatar role experienceLevel',
      })
      .populate({
        path: 'invites.user invites.invitedBy',
        select: 'name email avatar',
      });

    if (!team) {
      return next(
        new ErrorResponse(`Team not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
export const updateTeam = async (req, res, next) => {
  try {
    const { name, description, projectIdea, skillsNeeded, maxMembers, isOpen } = req.body;
    const teamId = req.params.id;
    const userId = req.user.id;

    // Find team and check if user is the team leader
    const team = await Team.findOne({
      _id: teamId,
      'members.user': userId,
      'members.role': 'leader',
    });

    if (!team) {
      return next(
        new ErrorResponse('Not authorized to update this team', 401)
      );
    }

    // Update fields
    if (name) team.name = name;
    if (description) team.description = description;
    if (projectIdea) team.projectIdea = projectIdea;
    if (skillsNeeded) team.skillsNeeded = skillsNeeded;
    if (maxMembers) team.maxMembers = maxMembers;
    if (typeof isOpen === 'boolean') team.isOpen = isOpen;

    await team.save();

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ErrorResponse('Team name already exists', 400));
    }
    next(error);
  }
};

// @desc    Invite user to team
// @route   POST /api/teams/:teamId/invite/:userId
// @access  Private
export const inviteToTeam = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const inviterId = req.user.id;
    const { message } = req.body;

    // Check if team exists and inviter is a member
    const team = await Team.findOne({
      _id: teamId,
      'members.user': inviterId,
    });

    if (!team) {
      return next(new ErrorResponse('Team not found or not authorized', 404));
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return next(new ErrorResponse('Team is full', 400));
    }

    // Check if user to invite exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Check if user is already a member
    const isMember = team.members.some((member) =>
      member.user.equals(userId)
    );
    if (isMember) {
      return next(new ErrorResponse('User is already a team member', 400));
    }

    // Check if user already has a pending invite
    const existingInvite = team.invites.find((invite) =>
      invite.user.equals(userId) && invite.status === 'pending'
    );
    if (existingInvite) {
      return next(new ErrorResponse('User already has a pending invite', 400));
    }

    // Add invite to team
    team.invites.push({
      user: userId,
      invitedBy: inviterId,
      message,
    });

    await team.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to team invite
// @route   POST /api/teams/:teamId/respond
// @access  Private
export const respondToInvite = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    // Find team with pending invite for user
    const team = await Team.findOne({
      _id: teamId,
      'invites.user': userId,
      'invites.status': 'pending',
    });

    if (!team) {
      return next(new ErrorResponse('No pending invite found', 404));
    }

    // Update invite status
    const inviteIndex = team.invites.findIndex(
      (invite) => invite.user.toString() === userId && invite.status === 'pending'
    );

    if (inviteIndex === -1) {
      return next(new ErrorResponse('No pending invite found', 404));
    }

    team.invites[inviteIndex].status = status;

    // If accepted, add user to team
    if (status === 'accepted') {
      // Check if team is full
      if (team.members.length >= team.maxMembers) {
        return next(new ErrorResponse('Team is now full', 400));
      }

      // Check if user is already in another team
      const userTeams = await Team.countDocuments({ 'members.user': userId });
      if (userTeams > 0) {
        return next(
          new ErrorResponse('You are already a member of another team', 400)
        );
      }

      team.members.push({
        user: userId,
        role: 'member',
      });
    }

    await team.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:teamId/members/:userId
// @access  Private
export const removeMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const requesterId = req.user.id;

    // Find team and check if requester is the leader
    const team = await Team.findOne({
      _id: teamId,
      'members.user': requesterId,
      'members.role': 'leader',
    });

    if (!team) {
      return next(
        new ErrorResponse('Not authorized to remove members from this team', 401)
      );
    }

    // Check if user to remove is a member
    const memberIndex = team.members.findIndex((member) =>
      member.user.equals(userId)
    );

    if (memberIndex === -1) {
      return next(new ErrorResponse('User is not a member of this team', 400));
    }

    // Prevent removing the last leader
    if (team.members[memberIndex].role === 'leader' && team.members.filter(m => m.role === 'leader').length <= 1) {
      return next(
        new ErrorResponse('Cannot remove the only team leader', 400)
      );
    }

    // Remove member
    team.members.splice(memberIndex, 1);

    await team.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave team
// @route   POST /api/teams/:teamId/leave
// @access  Private
export const leaveTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Find team and check if user is a member
    const team = await Team.findOne({
      _id: teamId,
      'members.user': userId,
    });

    if (!team) {
      return next(new ErrorResponse('Not a member of this team', 400));
    }

    // Find member index
    const memberIndex = team.members.findIndex((member) =>
      member.user.equals(userId)
    );

    // If user is the last member, delete the team
    if (team.members.length === 1) {
      await Team.findByIdAndDelete(teamId);
      return res.status(200).json({
        success: true,
        data: {},
      });
    }

    // If user is a leader, assign a new leader if they're the only one
    if (
      team.members[memberIndex].role === 'leader' &&
      team.members.filter((m) => m.role === 'leader').length <= 1
    ) {
      // Find another member to promote to leader
      const otherMemberIndex = team.members.findIndex(
        (member, index) => index !== memberIndex
      );
      if (otherMemberIndex !== -1) {
        team.members[otherMemberIndex].role = 'leader';
      }
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    await team.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
