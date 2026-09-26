import { nanoid } from 'nanoid';
import ParticipantSession from './participant.model.js';
import Experiment from '../experiments/experiment.model.js';
import Trial from '../trials/trial.model.js';
import Response from '../responses/response.model.js';
import { calculateReliabilityScore, calculateEnhancedReactionTime } from '../calibration/calibration.service.js';

export const startSession = async (publicId) => {
  const experiment = await Experiment.findOne({ publicId, status: 'PUBLISHED' });
  if (!experiment) {
    const error = new Error('Experiment not found or not published');
    error.statusCode = 404;
    throw error;
  }
  const hasTrials = await Trial.exists({ experiment: experiment._id });
  if (!hasTrials) {
    const error = new Error('This experiment has no configured trials');
    error.statusCode = 409;
    throw error;
  }
  const anonymousCode = 'P-' + nanoid(6).toUpperCase();
  const session = await ParticipantSession.create({
    experiment: experiment._id,
    anonymousCode,
  });
  return session;
};

export const submitCalibration = async (sessionId, calibrationData) => {
  const session = await ParticipantSession.findById(sessionId);
  if (!session) {
    const error = new Error('Participant session not found');
    error.statusCode = 404;
    throw error;
  }
  const numericFields = ['refreshRate', 'frameJitter', 'inputLatency', 'droppedFrames'];
  if (numericFields.some((field) => calibrationData?.[field] !== undefined && (!Number.isFinite(Number(calibrationData[field])) || Number(calibrationData[field]) < 0))) {
    const error = new Error('Calibration values must be non-negative numbers');
    error.statusCode = 400;
    throw error;
  }
  const { score, summary, flags } = calculateReliabilityScore(calibrationData);
  session.calibrationData = calibrationData;
  session.reliabilityScore = score;
  session.reliabilitySummary = summary;
  session.reliabilityFlags = flags;
  await session.save();
  return session;
};

export const recordResponse = async (sessionId, { trialId, response, reactionTimeMs, stimulusTimestamp, responseTimestamp }) => {
  const session = await ParticipantSession.findById(sessionId);
  if (!session) {
    const error = new Error('Participant session not found');
    error.statusCode = 404;
    throw error;
  }
  if (session.status !== 'STARTED') {
    const error = new Error('This participant session is no longer accepting responses');
    error.statusCode = 409;
    throw error;
  }
  if (!trialId || !response || !Number.isFinite(Number(reactionTimeMs)) || Number(reactionTimeMs) < 0) {
    const error = new Error('A valid trial, response, and reaction time are required');
    error.statusCode = 400;
    throw error;
  }
  const trial = await Trial.findById(trialId);
  if (!trial) {
    const error = new Error('Trial not found');
    error.statusCode = 404;
    throw error;
  }
  if (String(trial.experiment) !== String(session.experiment)) {
    const error = new Error('Trial does not belong to this experiment');
    error.statusCode = 400;
    throw error;
  }
  let correct = null;
  if (trial.expectedResponse) {
    correct = String(response).trim().toLowerCase() === String(trial.expectedResponse).trim().toLowerCase();
  }
  const responseRecord = await Response.create({
    participantSession: sessionId,
    trial: trialId,
    response,
    reactionTimeMs,
    enhancedReactionTimeMs: calculateEnhancedReactionTime(reactionTimeMs, session.reliabilityScore),
    correct,
    stimulusTimestamp,
    responseTimestamp,
  });
  return responseRecord;
};

export const completeSession = async (sessionId) => {
  const session = await ParticipantSession.findById(sessionId);
  if (!session) {
    const error = new Error('Participant session not found');
    error.statusCode = 404;
    throw error;
  }
  if (session.status === 'COMPLETED') {
    const error = new Error('Participant session is already completed');
    error.statusCode = 409;
    throw error;
  }
  session.status = 'COMPLETED';
  session.completedAt = new Date();
  await session.save();
  const responses = await Response.find({ participantSession: sessionId });
  const totalTrials = responses.length;
  const validRts = responses.map((r) => r.reactionTimeMs);
  const enhancedRts = responses.map((r) => r.enhancedReactionTimeMs ?? r.reactionTimeMs);
  const avgReactionTime = validRts.length ? Math.round(validRts.reduce((a, b) => a + b, 0) / validRts.length) : 0;
  const avgEnhancedReactionTime = enhancedRts.length ? Math.round(enhancedRts.reduce((a, b) => a + b, 0) / enhancedRts.length) : 0;
  const correctCount = responses.filter((r) => r.correct === true).length;
  const accuracy = totalTrials ? Math.round((correctCount / totalTrials) * 100) : 0;
  return {
    session,
    summary: {
      anonymousCode: session.anonymousCode,
      reliabilityScore: session.reliabilityScore,
      totalTrials,
      avgReactionTimeMs: avgReactionTime,
      avgEnhancedReactionTimeMs: avgEnhancedReactionTime,
      adjustmentMethod: 'raw + ((100 - reliabilityScore) * 0.5ms)',
      accuracyPercentage: accuracy,
    },
  };
};
