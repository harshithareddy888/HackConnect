import Interaction from '../models/Interaction.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Like or skip a user
// @route   POST /api/match/:targetId
// @access  Private
export const handleInteraction = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { interactionType } = req.body;
    const userId = req.user.id;

    // Check if target user exists
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Check if interaction already exists
    const existingInteraction = await Interaction.findOne({
      user: userId,
      targetUser: targetId,
    });

    if (existingInteraction) {
      return next(new ErrorResponse('Interaction already exists', 400));
    }

    // Create new interaction
    const interaction = await Interaction.create({
      user: userId,
      targetUser: targetId,
      interactionType,
    });

    // If it's a like, check for a match
    if (interactionType === 'like') {
      const reverseInteraction = await Interaction.findOne({
        user: targetId,
        targetUser: userId,
        interactionType: 'like',
      });

      // If the other user also liked, create a match
      if (reverseInteraction) {
        // Check if match already exists to prevent duplicates
        const existingMatch = await Match.findOne({
          users: { $all: [userId, targetId] },
        });

        if (!existingMatch) {
          await Match.create({
            users: [userId, targetId],
          });
        }

        return res.status(200).json({
          success: true,
          data: { match: true, interaction },
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { match: false, interaction },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get match suggestions for a user
// @route   GET /api/match/suggestions
// @access  Private
export const getSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get users that the current user has already interacted with
    const interactions = await Interaction.find({ user: userId });
    const interactedUserIds = interactions.map((i) => i.targetUser);

    // Get current user's matches to exclude them from suggestions
    const userMatches = await Match.find({ users: userId });
    const matchedUserIds = userMatches.flatMap((match) =>
      match.users.map((id) => id.toString())
    );

    // Combine both lists of users to exclude
    const excludedUserIds = [...new Set([...interactedUserIds, ...matchedUserIds, userId])];

    // Find users who haven't been interacted with and aren't matched
    const suggestions = await User.find({
      _id: { $nin: excludedUserIds },
    })
      .select('-password -refreshToken')
      .limit(10);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's matches
// @route   GET /api/match/matches
// @access  Private
export const getMatches = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const matches = await Match.find({ users: userId })
      .populate({
        path: 'users',
        select: 'name email avatar role experienceLevel',
        match: { _id: { $ne: userId } },
      })
      .sort('-updatedAt');

    // Filter out matches where the other user might have been deleted
    const validMatches = matches.filter(
      (match) => match.users.length > 1 && match.users[0] !== null
    );

    res.status(200).json({
      success: true,
      count: validMatches.length,
      data: validMatches,
    });
  } catch (error) {
    next(error);
  }
};
