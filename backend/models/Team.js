import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a team name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    projectIdea: {
      type: String,
      maxlength: [1000, 'Project idea cannot be more than 1000 characters'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['leader', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    invites: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    skillsNeeded: [String],
    maxMembers: {
      type: Number,
      default: 5,
      min: 2,
      max: 10,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only be a member of one team at a time
teamSchema.index({ 'members.user': 1 }, { unique: true, partialFilterExpression: { 'members.0': { $exists: true } } });

// Ensure team names are unique
teamSchema.index({ name: 1 }, { unique: true });

const Team = mongoose.model('Team', teamSchema);

export default Team;
