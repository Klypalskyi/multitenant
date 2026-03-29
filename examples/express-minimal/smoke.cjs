'use strict';

const request = require('supertest');
const { createApp } = require('./app.cjs');

(async () => {
  try {
    const app = await createApp();
    const res = await request(app).get('/').set('Host', 'us.localhost');
    if (res.status !== 200) {
      console.error('[express-minimal] expected 200, got', res.status, res.text);
      process.exit(1);
    }
    if (!String(res.text).includes('us-main') || !String(res.text).includes('us')) {
      console.error('[express-minimal] unexpected body:', res.text);
      process.exit(1);
    }
    const miss = await request(app).get('/').set('Host', 'definitely-missing.invalid');
    if (miss.status !== 404) {
      console.error('[express-minimal] expected 404 for unknown host, got', miss.status);
      process.exit(1);
    }
    console.log('[express-minimal] smoke ok — Host: us.localhost → us-main');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
