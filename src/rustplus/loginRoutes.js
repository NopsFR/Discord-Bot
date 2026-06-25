const path = require('node:path');
const express = require('express');
const pairingFlow = require('./pairingFlow');

/**
 * Public router for the Rust+ self-serve login / pairing flow. Mounted BEFORE
 * the panel's basic auth so Discord users can reach it. The per-session token
 * (created by /pair) acts as the authorization.
 */
function createLoginRouter() {
  const router = express.Router();

  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  // Login page.
  router.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
  });

  // Poll the FCM registration status for a session.
  router.get('/session/:id', (req, res) => {
    const session = pairingFlow.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session expired or not found.' });
      return;
    }
    res.json({ status: session.status, error: session.error });
  });

  // Receive the captured Steam-linked auth token (from the popup flow).
  router.post('/callback', async (req, res) => {
    const { session, token } = req.body;
    if (!session || !token) {
      res.status(400).json({ error: 'session and token are required.' });
      return;
    }
    try {
      const credential = await pairingFlow.completeWithToken(session, token);
      res.json({ ok: true, steamId: credential.steamId });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Manual fallback: paste a rustplus.config.json obtained from the CLI.
  router.post('/manual', async (req, res) => {
    const { session, config } = req.body;
    const sess = pairingFlow.getSession(session);
    if (!sess) {
      res.status(404).json({ error: 'Session expired. Run /pair again.' });
      return;
    }
    try {
      const parsed = typeof config === 'string' ? JSON.parse(config) : config;
      const credential = await pairingFlow.completeWithConfig(sess.discordUserId, parsed);
      res.json({ ok: true, steamId: credential.steamId });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createLoginRouter };
