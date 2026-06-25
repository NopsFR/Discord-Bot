const express = require('express');
const { config, hasRustConfig } = require('./config');
const { readState, upsertWipe } = require('./utils/store');

function basicAuth(req, res, next) {
  if (!config.panelUsername || !config.panelPassword) {
    next();
    return;
  }

  const header = req.headers.authorization || '';
  const encoded = header.replace('Basic ', '');
  const [username, password] = Buffer.from(encoded, 'base64').toString('utf8').split(':');

  if (username === config.panelUsername && password === config.panelPassword) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Rust Discord Bot Panel"');
  res.status(401).send('Authentication required');
}

function createWebPanel(client) {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(basicAuth);
  app.use(express.static('public'));

  app.get('/api/status', async (req, res) => {
    const state = await readState();
    res.json({
      discord: {
        ready: Boolean(client?.isReady?.()),
        tag: client?.user?.tag || null,
        guilds: client?.guilds?.cache?.size || 0
      },
      rustPlus: {
        configured: hasRustConfig()
      },
      wipes: state.wipes
    });
  });

  app.post('/api/wipes', async (req, res) => {
    const { server, date, notes } = req.body;

    if (!server || !date) {
      res.status(400).json({ error: 'server and date are required' });
      return;
    }

    const wipes = await upsertWipe({ server, date, notes: notes || '' });
    res.json({ wipes });
  });

  app.listen(config.port, () => {
    console.log(`Web panel running at http://localhost:${config.port}`);
  });
}

module.exports = {
  createWebPanel
};
