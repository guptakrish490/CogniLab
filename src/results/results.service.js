import Experiment from '../experiments/experiment.model.js';
import ParticipantSession from '../participants/participant.model.js';
import Response from '../responses/response.model.js';
import Trial from '../trials/trial.model.js';

export const getExperimentResults = async (researcherId, experimentId) => {
  const experiment = await Experiment.findOne({ _id: experimentId, researcher: researcherId });
  if (!experiment) {
    const error = new Error('Experiment not found');
    error.statusCode = 404;
    throw error;
  }
  const sessions = await ParticipantSession.find({ experiment: experimentId });
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
  const allResponses = await Response.find({ participantSession: { $in: sessionIds } }).populate({ path: 'trial', model: Trial });
  const rawTime = (response) => Number(response.reactionTimeMs ?? response.reactionTime);
  const validRts = allResponses.map(rawTime).filter(Number.isFinite);
  const enhancedRts = allResponses.map((r) => Number(r.enhancedReactionTimeMs ?? rawTime(r))).filter(Number.isFinite);
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
    const raw = trial.responses.map(rawTime).filter(Number.isFinite);
    const enhanced = trial.responses.map((response) => Number(response.enhancedReactionTimeMs ?? rawTime(response))).filter(Number.isFinite);
    const correct = trial.responses.filter((response) => response.correct === true).length;
    return {
      trialId: trial.trialId,
      trialOrder: trial.trialOrder,
      stimulusType: trial.stimulusType,
      stimulus: trial.stimulus,
      expectedResponse: trial.expectedResponse,
      responseCount: trial.responses.length,
      avgReactionTimeMs: raw.length ? Math.round(raw.reduce((sum, value) => sum + value, 0) / raw.length) : null,
      avgEnhancedReactionTimeMs: enhanced.length ? Math.round(enhanced.reduce((sum, value) => sum + value, 0) / enhanced.length) : null,
      rawReactionTimesMs: raw,
      enhancedReactionTimesMs: enhanced,
      accuracyPercentage: raw.length ? Math.round((correct / raw.length) * 100) : 0,
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
      const sessionResponses = allResponses.filter((r) => String(r.participantSession?._id || r.participantSession) === String(s._id));
      const rawSessionRts = sessionResponses.map(rawTime).filter(Number.isFinite);
      const enhancedSessionRts = sessionResponses.map((r) => Number(r.enhancedReactionTimeMs ?? rawTime(r))).filter(Number.isFinite);
      return {
      id: s._id,
      anonymousCode: s.anonymousCode,
      status: s.status,
      reliabilityScore: s.reliabilityScore,
      reliabilitySummary: s.reliabilitySummary,
      reliabilityFlags: s.reliabilityFlags,
      isLowReliability: s.reliabilityScore !== null && s.reliabilityScore < 65,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      avgReactionTimeMs: rawSessionRts.length ? Math.round(rawSessionRts.reduce((a, b) => a + b, 0) / rawSessionRts.length) : null,
      avgEnhancedReactionTimeMs: enhancedSessionRts.length ? Math.round(enhancedSessionRts.reduce((a, b) => a + b, 0) / enhancedSessionRts.length) : null,
      responseCount: sessionResponses.length,
      responses: sessionResponses.map((response) => ({
        id: response._id,
        trialOrder: response.trial?.trialOrder,
        response: response.response,
        correct: response.correct,
        reactionTimeMs: rawTime(response),
        enhancedReactionTimeMs: Number(response.enhancedReactionTimeMs ?? rawTime(response)),
        createdAt: response.createdAt,
      })),
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
    responses: responses.map((response) => ({
      id: response._id,
      trialId: response.trial?._id,
      trialOrder: response.trial?.trialOrder,
      response: response.response,
      correct: response.correct,
      reactionTimeMs: Number(response.reactionTimeMs ?? response.reactionTime),
      enhancedReactionTimeMs: Number(response.enhancedReactionTimeMs ?? response.reactionTimeMs ?? response.reactionTime),
      stimulusTimestamp: response.stimulusTimestamp,
      responseTimestamp: response.responseTimestamp,
      createdAt: response.createdAt,
    })),
  };
};
