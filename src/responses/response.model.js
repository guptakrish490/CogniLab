import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema(
  {
    participantSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParticipantSession',
      required: true,
    },
    trial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trial',
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    reactionTimeMs: {
      type: Number,
      required: true,
    },
    enhancedReactionTimeMs: {
      type: Number,
      default: null,
    },
    correct: {
      type: Boolean,
      default: null,
    },
    stimulusTimestamp: {
      type: Number,
    },
    responseTimestamp: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Response = mongoose.model('Response', responseSchema);

export default Response;
