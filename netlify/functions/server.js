import serverless from 'serverless-http';
import { createApp } from '../../src/app.js';

// Netlify's CDN serves index.html, privacy.html and terms.html directly, so the
// function only handles the dynamic routes that netlify.toml redirects here.
const app = createApp({ serveStatic: false });

export const handler = serverless(app);
