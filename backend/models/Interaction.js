import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interactionType: {
      type: String,
      enum: ['like', 'skip'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate interactions
interactionSchema.index({ user: 1, targetUser: 1 }, { unique: true });

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;
