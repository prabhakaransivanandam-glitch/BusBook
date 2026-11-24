import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './utils/errors.js';

const app = express();

app.use(cors({ origin: config.clientUrl.split(',').map((url) => url.trim()), credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', app: 'BusBook' }));
app.use('/api', routes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

export default app;
