import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    matchedAt: {
      type: Date,
      default: Date.now,
    },
    lastMessage: {
      type: String,
      default: 'You are now connected!',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure each pair of users has only one match document
matchSchema.index({ users: 1 }, { unique: true });

const Match = mongoose.model('Match', matchSchema);

export default Match;
