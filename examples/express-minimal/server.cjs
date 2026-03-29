'use strict';

const { createApp } = require('./app.cjs');

const port = Number(process.env.PORT || 3040);

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`Express minimal listening on http://127.0.0.1:${port} (Host: us.localhost)`);
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
