export const calculateReliabilityScore = (calibrationData) => {
  if (!calibrationData) return { score: 70, summary: { displayStability: 'Fair', frameConsistency: 'Fair', inputResponsiveness: 'Fair' }, flags: ['No calibration data provided'] };

  const { refreshRate = 60, frameJitter = 5, inputLatency = 15, droppedFrames = 0 } = calibrationData;
  let score = 100;
  const flags = [];

  if (frameJitter > 10) {
    score -= 20;
    flags.push('High frame timing jitter detected');
  } else if (frameJitter > 4) {
    score -= 10;
  }

  if (droppedFrames > 5) {
    score -= 25;
    flags.push('Multiple dropped frames during calibration');
  } else if (droppedFrames > 0) {
    score -= droppedFrames * 3;
  }

  if (inputLatency > 30) {
    score -= 20;
    flags.push('Elevated input responsiveness latency');
  } else if (inputLatency > 15) {
    score -= 10;
  }

  if (refreshRate < 50) {
    score -= 15;
    flags.push('Low or unstable display refresh rate');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const getRating = (val, bad, warning) => (val > bad ? 'Poor' : val > warning ? 'Fair' : 'Good');

  const summary = {
    displayStability: refreshRate >= 55 ? 'Good' : 'Fair',
    frameConsistency: getRating(frameJitter, 10, 4),
    inputResponsiveness: getRating(inputLatency, 30, 15),
  };

  return { score, summary, flags };
};

// Explicit interpretation metric; raw reaction time remains unchanged.
export const calculateEnhancedReactionTime = (reactionTimeMs, reliabilityScore) => {
  const raw = Number(reactionTimeMs);
  if (!Number.isFinite(raw)) return null;
  const score = Number.isFinite(Number(reliabilityScore)) ? Number(reliabilityScore) : 70;
  return Math.round((raw + ((100 - Math.max(0, Math.min(100, score))) * 0.5)) * 100) / 100;
};
