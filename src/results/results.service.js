import Experiment from '../experiments/experiment.model.js';
import ParticipantSession from '../participants/participant.model.js';
import Response from '../responses/response.model.js';

export const getExperimentResults = async (researcherId, experimentId) => {
  const experiment = await Experiment.findOne({ _id: experimentId, researcher: researcherId });
  if (!experiment) {
    const error = new Error('Experiment not found');
    error.statusCode = 404;
    throw error;
  }
  const sessions = await ParticipantSession.find({ experiment: experimentId, status: 'COMPLETED' });
  const totalParticipants = sessions.length;
  if (totalParticipants === 0) {
    return {
      experiment,
      analytics: {
        totalParticipants: 0,
        avgReactionTimeMs: 0,
        avgEnhancedReactionTimeMs: 0,
        avgAccuracyPercentage: 0,
        reliabilityDistribution: { high: 0, medium: 0, low: 0 },
      },
      sessions: [],
    };
  }
  const sessionIds = sessions.map((s) => s._id);
  const allResponses = await Response.find({ participantSession: { $in: sessionIds } }).populate('trial');
  const validRts = allResponses.map((r) => r.reactionTimeMs);
  const enhancedRts = allResponses.map((r) => r.enhancedReactionTimeMs ?? r.reactionTimeMs);
  const avgReactionTimeMs = validRts.length ? Math.round(validRts.reduce((a, b) => a + b, 0) / validRts.length) : 0;
  const avgEnhancedReactionTimeMs = enhancedRts.length ? Math.round(enhancedRts.reduce((a, b) => a + b, 0) / enhancedRts.length) : 0;
  const correctResponses = allResponses.filter((r) => r.correct === true).length;
  const avgAccuracyPercentage = allResponses.length ? Math.round((correctResponses / allResponses.length) * 100) : 0;
  const reliabilityDistribution = { high: 0, medium: 0, low: 0 };
  sessions.forEach((s) => {
    const score = s.reliabilityScore !== null ? s.reliabilityScore : 70;
    if (score >= 85) reliabilityDistribution.high += 1;
    else if (score >= 65) reliabilityDistribution.medium += 1;
    else reliabilityDistribution.low += 1;
  });
  const trialMap = new Map();
  allResponses.forEach((response) => {
    const trial = response.trial;
    if (!trial) return;
    const key = String(trial._id);
    if (!trialMap.has(key)) trialMap.set(key, { trialId: trial._id, trialOrder: trial.trialOrder, stimulusType: trial.stimulusType, stimulus: trial.stimulus, expectedResponse: trial.expectedResponse, responses: [] });
    trialMap.get(key).responses.push(response);
  });
  const trialResults = [...trialMap.values()].sort((a, b) => a.trialOrder - b.trialOrder).map((trial) => {
    const raw = trial.responses.map((response) => response.reactionTimeMs);
    const enhanced = trial.responses.map((response) => response.enhancedReactionTimeMs ?? response.reactionTimeMs);
    const correct = trial.responses.filter((response) => response.correct === true).length;
    return {
      trialId: trial.trialId,
      trialOrder: trial.trialOrder,
      stimulusType: trial.stimulusType,
      stimulus: trial.stimulus,
      expectedResponse: trial.expectedResponse,
      responseCount: raw.length,
      avgReactionTimeMs: Math.round(raw.reduce((sum, value) => sum + value, 0) / raw.length),
      avgEnhancedReactionTimeMs: Math.round(enhanced.reduce((sum, value) => sum + value, 0) / enhanced.length),
      accuracyPercentage: Math.round((correct / raw.length) * 100),
      rawReactionTimesMs: raw,
      enhancedReactionTimesMs: enhanced,
    };
  });
  return {
    experiment,
    analytics: {
      totalParticipants,
      avgReactionTimeMs,
      avgEnhancedReactionTimeMs,
      avgAccuracyPercentage,
      reliabilityDistribution,
    },
    sessions: sessions.map((s) => {
      const sessionResponses = allResponses.filter((r) => String(r.participantSession) === String(s._id));
      const rawSessionRts = sessionResponses.map((r) => r.reactionTimeMs);
      const enhancedSessionRts = sessionResponses.map((r) => r.enhancedReactionTimeMs ?? r.reactionTimeMs);
      return {
      id: s._id,
      anonymousCode: s.anonymousCode,
      reliabilityScore: s.reliabilityScore,
      reliabilitySummary: s.reliabilitySummary,
      reliabilityFlags: s.reliabilityFlags,
      isLowReliability: s.reliabilityScore !== null && s.reliabilityScore < 65,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      avgReactionTimeMs: rawSessionRts.length ? Math.round(rawSessionRts.reduce((a, b) => a + b, 0) / rawSessionRts.length) : 0,
      avgEnhancedReactionTimeMs: enhancedSessionRts.length ? Math.round(enhancedSessionRts.reduce((a, b) => a + b, 0) / enhancedSessionRts.length) : 0,
      };
    }),
    trialResults,
  };
};

export const getSessionDetail = async (researcherId, experimentId, sessionId) => {
  const experiment = await Experiment.findOne({ _id: experimentId, researcher: researcherId });
  if (!experiment) {
    const error = new Error('Experiment not found');
    error.statusCode = 404;
    throw error;
  }
  const session = await ParticipantSession.findOne({ _id: sessionId, experiment: experimentId });
  if (!session) {
    const error = new Error('Participant session not found');
    error.statusCode = 404;
    throw error;
  }
  const responses = await Response.find({ participantSession: sessionId }).populate('trial');
  return {
    session,
    responses,
  };
};
