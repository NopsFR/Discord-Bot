const express = require('express');
const { config, hasRustConfig } = require('./config');
const { readState, upsertWipe } = require('./utils/store');
const { createLoginRouter } = require('./rustplus/loginRoutes');
const connectionManager = require('./rustplus/connectionManager');
const cameraModule = require('./rustplus/camera');
const dataStore = require('./rustplus/dataStore');

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

  // Public Rust+ login / pairing flow (auth is the per-session token).
  app.use('/rustplus', createLoginRouter());

  // Everything below requires panel auth.
  app.use(basicAuth);

  // ---- Camera station (CCTV / drones / turrets) ----
  app.get('/camera', (req, res) => {
    res.sendFile(`${process.cwd()}/public/camera.html`);
  });

  app.get('/api/camera/frame', async (req, res) => {
    const { guild, id } = req.query;
    const instance = guild ? connectionManager.getForGuild(String(guild)) : connectionManager.list()[0];
    if (!instance) {
      res.status(404).json({ error: 'No connected Rust+ server for this guild.' });
      return;
    }
    try {
      const serverKey = `${instance.server.guildId}:${instance.server.serverId}`;
      const frame = await cameraModule.getStationFrame(instance, serverKey, String(id));
      res.setHeader('Content-Type', 'image/png');
      res.send(frame);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/camera/move', async (req, res) => {
    const { guild, id, buttons = 0, x = 0, y = 0 } = req.body;
    const instance = guild ? connectionManager.getForGuild(String(guild)) : connectionManager.list()[0];
    if (!instance) {
      res.status(404).json({ error: 'No connected Rust+ server.' });
      return;
    }
    try {
      const serverKey = `${instance.server.guildId}:${instance.server.serverId}`;
      await cameraModule.moveStation(serverKey, String(id), Number(buttons), Number(x), Number(y));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---- Status / wipes ----
  app.get('/api/status', async (req, res) => {
    const state = await readState();
    const store = await dataStore.get();
    res.json({
      discord: {
        ready: Boolean(client?.isReady?.()),
        tag: client?.user?.tag || null,
        guilds: client?.guilds?.cache?.size || 0
      },
      rustPlus: {
        configured: hasRustConfig(),
        pairedServers: Object.keys(store.servers).length,
        registeredUsers: Object.keys(store.credentials).length,
        connections: connectionManager.list().map((i) => ({ name: i.server.name, connected: i.connected }))
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

  app.use(express.static('public'));

  app.listen(config.port, () => {
    console.log(`Web panel running at http://localhost:${config.port}`);
    console.log(`Rust+ login page at ${config.publicUrl || `http://localhost:${config.port}`}/rustplus/login`);
  });
}

module.exports = {
  createWebPanel
};
