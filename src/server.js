import 'dotenv/config';
import { ensureSchema } from './db/ensure-schema.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

const app = createApp();

try {
  await ensureSchema();
  console.log('[server] articles table is ready');
} catch (error) {
  // Keep serving the static site even if the database is unreachable.
  console.error('[server] could not prepare the database schema:', error.message);
}

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
