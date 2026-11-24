import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { startHoldCleanup } from './services/tripService.js';

async function start() {
  await connectDB();
  startHoldCleanup();
  app.listen(config.port, () => {
    console.log(`[BusBook] API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error('[BusBook] Failed to start:', error);
  process.exit(1);
});
