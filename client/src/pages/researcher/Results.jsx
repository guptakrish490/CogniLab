import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, Gauge, Target, Users } from 'lucide-react';
import api from '../../services/api';

const formatMs = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value))} ms` : 'No data';

export default function Results() {
  const { id } = useParams(); const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get(`/experiments/${id}/results`);
        const result = response.data.data;
        const sessionsWithDetails = await Promise.all((result.sessions || []).map(async (session) => {
          try {
            const detail = await api.get(`/experiments/${id}/results/${session.id}`);
            const responses = detail.data.data?.responses || [];
            const raw = responses.map((item) => Number(item.reactionTimeMs)).filter(Number.isFinite);
            const enhanced = responses.map((item) => Number(item.enhancedReactionTimeMs ?? item.reactionTimeMs)).filter(Number.isFinite);
            return { ...session, responses, responseCount: responses.length, avgReactionTimeMs: raw.length ? Math.round(raw.reduce((sum, value) => sum + value, 0) / raw.length) : session.avgReactionTimeMs, avgEnhancedReactionTimeMs: enhanced.length ? Math.round(enhanced.reduce((sum, value) => sum + value, 0) / enhanced.length) : session.avgEnhancedReactionTimeMs };
          } catch {
            return session;
          }
        }));
        const allSessionResponses = sessionsWithDetails.flatMap((session) => session.responses || []);
        const rawTimes = allSessionResponses.map((item) => Number(item.reactionTimeMs)).filter(Number.isFinite);
        const enhancedTimes = allSessionResponses.map((item) => Number(item.enhancedReactionTimeMs ?? item.reactionTimeMs)).filter(Number.isFinite);
        const analytics = {
          ...result.analytics,
          avgReactionTimeMs: rawTimes.length ? Math.round(rawTimes.reduce((sum, value) => sum + value, 0) / rawTimes.length) : result.analytics.avgReactionTimeMs,
          avgEnhancedReactionTimeMs: enhancedTimes.length ? Math.round(enhancedTimes.reduce((sum, value) => sum + value, 0) / enhancedTimes.length) : result.analytics.avgEnhancedReactionTimeMs,
        };
        if (active) setData({ ...result, analytics, sessions: sessionsWithDetails });
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);
  if (loading) return <div className="saas-page"><main className="shell muted">Loading analytics...</main></div>;
  if (!data) return <div className="saas-page"><main className="shell"><div className="error">Results could not be loaded.</div></main></div>;
  const { experiment, analytics, sessions = [], trialResults = [] } = data; const distribution = analytics.reliabilityDistribution; const maxReliability = Math.max(distribution.high, distribution.medium, distribution.low, 1); const stats = [[Users, 'Participant sessions', analytics.totalParticipants], [Activity, 'Raw reaction time', formatMs(analytics.avgReactionTimeMs)], [Target, 'Accuracy', `${analytics.avgAccuracyPercentage}%`], [Gauge, 'Reliability high', distribution.high]];
  return <div className="saas-page"><header className="saas-header"><div className="brand"><span className="brand-mark">C</span> CogniLab</div><Link className="btn btn-quiet" to="/dashboard"><ArrowLeft size={15} /> Workspace</Link></header><main className="shell"><Link className="back-link" to="/dashboard"><ArrowLeft size={14} /> Back to experiments</Link><div className="results-heading"><div><span className="eyebrow">Study analytics</span><h1>{experiment.title}</h1><p className="muted">Submitted responses, raw timing, and session quality.</p></div><span className="status status-published">{experiment.status}</span></div><div className="results-grid">{stats.map(([Icon, label, value]) => <div className="results-stat" key={label}><Icon size={17} color="#60a5fa" /><span>{label}</span><strong>{value}</strong></div>)}</div><div className="analytics-panels"><section className="surface chart-card"><div className="section-title"><h2>Reliability distribution</h2><span className="muted">participant sessions</span></div><div className="bar-chart">{[['High', distribution.high, 'high'], ['Medium', distribution.medium, 'medium'], ['Low', distribution.low, 'low']].map(([label, value, tone]) => <div className="bar-item" key={label}><div className="bar-label"><span>{label}</span><strong>{value}</strong></div><div className="bar-track"><div className={`bar-fill ${tone}`} style={{ height: `${Math.max((value / maxReliability) * 100, value ? 12 : 0)}%` }} /></div></div>)}</div></section><section className="surface chart-card"><div className="section-title"><h2>Timing interpretation</h2><span className="muted">transparent formula</span></div><div className="timing-callout"><span>Enhanced average</span><strong>{formatMs(analytics.avgEnhancedReactionTimeMs)}</strong><p>Raw average + ((100 - reliability score) x 0.5 ms)</p></div><div className="timing-legend"><span><i className="dot raw" /> Raw browser measurement</span><span><i className="dot enhanced" /> Enhanced interpretation</span></div></section></div><section className="surface"><div className="section-title"><h2>Trial response overview</h2><span className="muted">averages across submitted responses</span></div>{!trialResults.length ? <div className="empty-state"><Activity size={22} /><p>Trial timing will appear after participants submit responses.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Trial</th><th>Stimulus</th><th>Responses</th><th>Raw avg.</th><th>Enhanced avg.</th><th>Accuracy</th></tr></thead><tbody>{trialResults.map((trial) => <tr key={trial.trialId}><td><strong>Trial {trial.trialOrder}</strong></td><td>{trial.stimulus?.color || trial.stimulusType}</td><td>{trial.responseCount}</td><td>{formatMs(trial.avgReactionTimeMs)}</td><td><strong>{formatMs(trial.avgEnhancedReactionTimeMs)}</strong></td><td>{trial.accuracyPercentage}%</td></tr>)}</tbody></table></div>}</section><section className="response-ledger"><div className="section-title"><h2>Recorded responses</h2><span className="muted">Every submitted trial response</span></div>{!sessions.length ? <div className="empty-state"><Activity size={22} /><p>No participant responses yet.</p></div> : sessions.map((session) => <article className="session-block" key={session.id}><div className="session-block-header"><div><strong>{session.anonymousCode}</strong><span>{session.status || 'STARTED'} · {session.responseCount || 0} responses</span></div><div><b>{formatMs(session.avgReactionTimeMs)}</b><small> raw average</small></div><div><b>{formatMs(session.avgEnhancedReactionTimeMs)}</b><small> enhanced average</small></div></div>{session.responses?.length ? <div className="response-grid">{session.responses.map((response) => <div className="response-card" key={response.id}><div><span>TRIAL {String(response.trialOrder ?? '—').padStart(2, '0')}</span><strong>{String(response.response)}</strong></div><div><small>RAW</small><b>{formatMs(response.reactionTimeMs)}</b></div><div><small>ENHANCED</small><b>{formatMs(response.enhancedReactionTimeMs)}</b></div><em className={response.correct ? 'correct' : 'incorrect'}>{response.correct === null ? 'Unscored' : response.correct ? 'Correct' : 'Incorrect'}</em></div>)}</div> : <p className="muted no-responses">No submitted responses for this session yet.</p>}</article>)}</section></main></div>;
}
