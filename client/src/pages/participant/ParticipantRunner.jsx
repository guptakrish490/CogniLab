import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const ParticipantRunner = () => {
  const { publicId } = useParams();
  const [step, setStep] = useState('INSTRUCTIONS');
  const [experiment, setExperiment] = useState(null);
  const [trials, setTrials] = useState([]);
  const [session, setSession] = useState(null);
  const [reliabilityData, setReliabilityData] = useState(null);

  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [stimulusStartTime, setStimulusStartTime] = useState(0);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [countdown, setCountdown] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [calibrationPhase, setCalibrationPhase] = useState('frames');
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const containerRef = useRef(null);
  const trialTimerRef = useRef(null);
  const calibrationCleanupRef = useRef(null);

  useEffect(() => () => {
    if (trialTimerRef.current) window.clearTimeout(trialTimerRef.current);
    calibrationCleanupRef.current?.();
  }, []);

  useEffect(() => {
    fetchExperiment();
  }, [publicId]);

  const fetchExperiment = async () => {
    try {
      const res = await api.get('/experiments/public/' + publicId);
      setExperiment(res.data.data);

      const trialRes = await api.get('/experiments/' + res.data.data._id + '/trials');
      setTrials(trialRes.data.data);
    } catch {
      alert('Experiment not found or link expired');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      const res = await api.post('/sessions/start/' + publicId);
      setSession(res.data.data);
      setStep('CALIBRATION');
      runBrowserCalibration(res.data.data._id);
    } catch {
      alert('Failed to initialize session');
    }
  };

  const runBrowserCalibration = async (sessionId) => {
    const frameTimes = [];
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrames = (now) => {
      const delta = now - lastTime;
      lastTime = now;
      frameTimes.push(delta);
      frameCount++;

      setCalibrationProgress(Math.round((frameCount / 120) * 50));
      if (frameCount < 120) {
        requestAnimationFrame(measureFrames);
      } else {
        const sorted = [...frameTimes].sort((a, b) => a - b);
        const trimmed = sorted.slice(Math.floor(sorted.length * 0.1), Math.ceil(sorted.length * 0.9));
        const avgDelta = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
        const variance = trimmed.reduce((sum, value) => sum + ((value - avgDelta) ** 2), 0) / trimmed.length;
        const expectedFrameMs = 1000 / (1000 / avgDelta);
        const droppedFrames = frameTimes.filter((delta) => delta > expectedFrameMs * 1.5).length;
        const frameMetrics = {
          refreshRate: Math.round(1000 / avgDelta) || 60,
          frameJitter: Number(Math.sqrt(variance).toFixed(2)),
          droppedFrames,
        };
        measureInputLatency(sessionId, frameMetrics);
      }
    };

    requestAnimationFrame(measureFrames);
  };

  const measureInputLatency = (sessionId, frameMetrics) => {
    setCalibrationPhase('input');
    let samples = [];
    const handleCalibrationKey = () => {
      const eventTime = performance.now();
      requestAnimationFrame((paintTime) => {
        samples = [...samples, paintTime - eventTime];
        setCalibrationProgress(50 + Math.round((samples.length / 5) * 50));
        if (samples.length >= 5) {
          window.removeEventListener('keydown', handleCalibrationKey);
          calibrationCleanupRef.current = null;
          const sorted = [...samples].sort((a, b) => a - b);
          const inputLatency = sorted[Math.floor(sorted.length / 2)];
          sendCalibrationData(sessionId, {
            ...frameMetrics,
            inputLatency: Number(inputLatency.toFixed(2)),
          });
        }
      });
    };
    window.addEventListener('keydown', handleCalibrationKey);
    calibrationCleanupRef.current = () => window.removeEventListener('keydown', handleCalibrationKey);
  };

  const sendCalibrationData = async (sessionId, calData) => {
    try {
      const res = await api.post('/sessions/' + sessionId + '/calibration', calData);
      setReliabilityData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const startActualExperiment = () => {
    setStep('EXPERIMENT');
    runTrialSequence(0);
  };

  const playFeedbackTone = (correct) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = correct ? 'sine' : 'square';
      oscillator.frequency.value = correct ? 660 : 145;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(correct ? 0.04 : 0.08, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (correct ? 0.08 : 0.16));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + (correct ? 0.08 : 0.16));
      oscillator.addEventListener('ended', () => context.close());
    } catch {
      // Audio feedback is optional when the browser blocks Web Audio.
    }
  };

  const runTrialSequence = () => {
    setShowingStimulus(false);
    setCountdown(true);
    setLastResponse(null);
    trialTimerRef.current = window.setTimeout(() => {
      setCountdown(false);
      setShowingStimulus(true);
      setStimulusStartTime(performance.now());
    }, 1000);
  };

  const handleKeyPress = async (e) => {
    if (step !== 'EXPERIMENT') return;
    if (!showingStimulus) {
      if (countdown) {
        setActionError('Wait for the target to appear before responding.');
        playFeedbackTone(false);
        window.setTimeout(() => setActionError(''), 900);
      }
      return;
    }

    setShowingStimulus(false);
    setActionError('');

    const responseTime = performance.now();
    const rt = Math.round(responseTime - stimulusStartTime);
    const key = e.key.toUpperCase() === ' ' ? 'SPACE' : e.key.toUpperCase();

    const currentTrial = trials[currentTrialIdx];
    const correct = String(key).toLowerCase() === String(currentTrial.expectedResponse || '').toLowerCase();
    setLastResponse({ key, rt, correct, expected: currentTrial.expectedResponse || 'SPACE' });
    playFeedbackTone(correct);

    try {
      await api.post('/sessions/' + session._id + '/responses', {
        trialId: currentTrial._id,
        response: key,
        reactionTimeMs: rt,
        stimulusTimestamp: stimulusStartTime,
        responseTimestamp: responseTime,
      });

      if (currentTrialIdx + 1 < trials.length) {
        setCurrentTrialIdx(currentTrialIdx + 1);
        runTrialSequence(currentTrialIdx + 1);
      } else {
        finishExperiment();
      }
    } catch {
      setActionError('We could not save this response. Please try again.');
      setShowingStimulus(true);
    }
  };

  const handleWrongClick = () => {
    if (step !== 'EXPERIMENT') return;
    setActionError(showingStimulus ? 'Mouse clicks are not recorded. Use the response key.' : 'Wait for the target to appear before responding.');
    playFeedbackTone(false);
    window.setTimeout(() => setActionError(''), 900);
  };

  const finishExperiment = async () => {
    try {
      const res = await api.post('/sessions/' + session._id + '/complete');
      setCompletedSummary(res.data.data.summary);
      setStep('COMPLETE');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [step, showingStimulus, currentTrialIdx, stimulusStartTime]);

  if (loading) return <div style={styles.page}>Loading experiment...</div>;

  return (
    <div style={styles.page} ref={containerRef}>
      {step === 'INSTRUCTIONS' && (
        <div style={styles.card}>
          <h2 style={styles.title}>{experiment.title}</h2>
          <p style={styles.desc}>{experiment.description}</p>

          <div style={styles.box}>
            <h4>Instructions</h4>
            <p>{experiment.instructions || 'Press the specified key when the stimulus appears.'}</p>
          </div>

          <button onClick={handleStartSession} style={styles.startBtn}>
            Start Experiment & Calibrate Browser →
          </button>
        </div>
      )}

      {step === 'CALIBRATION' && (
        <div style={styles.card}>
          <h2>Browser Hardware & Timing Calibration</h2>
            <p>Measuring this session's display and input timing.</p>

          {reliabilityData ? (
            <div>
              <div style={styles.scoreBox}>
                <span>Session Reliability Score</span>
                <span style={styles.scoreNumber}>{reliabilityData.reliabilityScore}/100</span>
              </div>
              <p style={{ fontSize: '13px', color: '#059669' }}>
                ✓ Display frame stability and input timing verified cleanly.
              </p>
              <button onClick={startActualExperiment} style={styles.startBtn}>
                Begin Trials →
              </button>
            </div>
          ) : (
            <div style={styles.calibrationProgress}>
              <div style={styles.calibrationProgressTrack}><div style={{ ...styles.calibrationProgressFill, width: `${calibrationProgress}%` }} /></div>
              <strong>{calibrationPhase === 'frames' ? 'Measuring frame timing...' : 'Press any key five times...'}</strong>
              <small>{calibrationPhase === 'frames' ? 'Keep this tab visible while we sample the display.' : 'Each press is compared with the next rendered frame.'}</small>
            </div>
          )}
        </div>
      )}

      {step === 'EXPERIMENT' && (
        <div style={styles.experimentArea} onMouseDown={handleWrongClick}>
          {actionError && <div style={{ ...styles.card, position: 'absolute', bottom: 24, maxWidth: 420, padding: 16, color: '#fecaca' }}>{actionError}</div>}
          <div style={styles.trialCounter}>
            <span>TRIAL {String(currentTrialIdx + 1).padStart(2, '0')} / {String(trials.length).padStart(2, '0')}</span>
            <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${((currentTrialIdx + (showingStimulus ? 1 : 0)) / trials.length) * 100}%` }} /></div>
          </div>

          {countdown ? (
            <div style={styles.readyState}><span style={styles.readyPulse}>+</span><strong>Get ready</strong><small>Focus on the center</small></div>
          ) : showingStimulus ? (
            <div
              style={{
                ...styles.stimulus,
                borderRadius: trials[currentTrialIdx]?.stimulusType === 'VISUAL_SQUARE' ? '16px' : '50%',
                backgroundColor:
                  trials[currentTrialIdx]?.stimulus?.color?.toLowerCase() || 'red',
              }}
            >
              <span>{trials[currentTrialIdx]?.stimulus?.label || 'TARGET'}</span><small>Press {trials[currentTrialIdx]?.expectedResponse || 'SPACE'}</small>
            </div>
          ) : (
            <div style={styles.fixationCross}>+</div>
          )}
          {!countdown && !showingStimulus && lastResponse && <div style={{ ...styles.feedback, color: lastResponse.correct ? '#86EFAC' : '#FCA5A5' }}>{lastResponse.correct ? `Correct · ${lastResponse.rt} ms` : `Incorrect · ${lastResponse.key} pressed · expected ${lastResponse.expected}`}</div>}
        </div>
      )}

      {step === 'COMPLETE' && completedSummary && (
        <div style={styles.card}>
          <h2>🎉 Experiment Completed!</h2>
          <p>Thank you for participating in this cognitive study.</p>

          <div style={styles.resultsSummary}>
            <div style={styles.summaryItem}>
              <span>Average Reaction Time:</span>
              <strong>{completedSummary.avgReactionTimeMs} ms</strong>
            </div>

            <div style={styles.summaryItem}>
              <span>Enhanced Interpretation:</span>
              <strong>{completedSummary.avgEnhancedReactionTimeMs ?? completedSummary.avgReactionTimeMs} ms</strong>
            </div>

            <div style={styles.summaryItem}>
              <span>Accuracy Rate:</span>
              <strong>{completedSummary.accuracyPercentage}%</strong>
            </div>

            <div style={styles.summaryItem}>
              <span>Session Reliability:</span>
              <strong>{completedSummary.reliabilityScore}/100</strong>
            </div>

            <div style={styles.summaryItem}>
              <span>Anonymous Code:</span>
              <code>{completedSummary.anonymousCode}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '24px',
  },
  card: {
    backgroundColor: '#1E293B',
    padding: '36px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: '26px',
    color: '#F8FAFC',
  },
  desc: {
    color: '#94A3B8',
    marginTop: '8px',
    fontSize: '14px',
  },
  box: {
    backgroundColor: '#334155',
    padding: '16px',
    borderRadius: '8px',
    margin: '24px 0',
    textAlign: 'left',
    fontSize: '14px',
  },
  startBtn: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  scoreBox: {
    backgroundColor: '#334155',
    padding: '20px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '20px 0',
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: '4px',
  },
  experimentArea: {
    width: '100%',
    height: '80vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  trialCounter: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    fontSize: '14px',
    color: '#94A3B8',
    letterSpacing: '0.12em',
    fontWeight: '700',
  },
  progressTrack: { width: '180px', height: '4px', backgroundColor: '#334155', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#38BDF8', borderRadius: '4px', transition: 'width .2s ease' },
  fixationCross: {
    fontSize: '64px',
    fontWeight: '300',
    color: '#64748B',
  },
  stimulus: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    color: '#FFFFFF',
    boxShadow: '0 0 40px rgba(255,255,255,0.2)',
    cursor: 'none',
    flexDirection: 'column',
    gap: '9px',
    textTransform: 'uppercase',
  },
  readyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#CBD5E1' },
  readyPulse: { fontSize: '70px', lineHeight: 1, color: '#64748B' },
  feedback: { position: 'absolute', bottom: '34px', fontSize: '14px', fontWeight: '700' },
  calibrationProgress: { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch', color: '#CBD5E1' },
  calibrationProgressTrack: { height: '6px', backgroundColor: '#334155', borderRadius: '5px', overflow: 'hidden' },
  calibrationProgressFill: { height: '100%', backgroundColor: '#38BDF8', borderRadius: '5px', transition: 'width .2s ease' },
  resultsSummary: {
    backgroundColor: '#334155',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
};

export default ParticipantRunner;
