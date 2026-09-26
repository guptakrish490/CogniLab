import express from 'express';
import cors from 'cors';
import authRoutes from './auth/auth.routes.js';
import experimentRoutes from './experiments/experiment.routes.js';
import trialRoutes from './trials/trial.routes.js';
import participantRoutes from './participants/participant.routes.js';
import resultsRoutes from './results/results.routes.js';
import errorHandler from './errors/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CogniLab API Server is running cleanly',
    timestamp: new Date().toISOString()
  });
});

app.use('/auth', authRoutes);
app.use('/experiments', experimentRoutes);
app.use('/experiments/:experimentId/trials', trialRoutes);
app.use('/experiments/:experimentId/results', resultsRoutes);
app.use('/sessions', participantRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
