const fs = require('node:fs/promises');
const path = require('node:path');
const RustPlus = require('@liamcottle/rustplus.js');
const { config, hasRustConfig } = require('../config');

class RustPlusService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = null;
  }

  isConfigured() {
    return hasRustConfig();
  }

  async ensureConnected() {
    if (!this.isConfigured()) {
      throw new Error('Rust+ is not configured yet. Add RUST_SERVER_IP, RUST_APP_PORT, RUST_PLAYER_ID, and RUST_PLAYER_TOKEN to .env.');
    }

    if (this.connected && this.client) {
      return this.client;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.client = new RustPlus(
      config.rust.serverIp,
      config.rust.appPort,
      config.rust.playerId,
      config.rust.playerToken
    );

    this.connecting = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out while connecting to Rust+. Check your server IP, app port, firewall, and pairing token.'));
      }, 12000);

      this.client.once('connected', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.connecting = null;
        resolve(this.client);
      });

      this.client.once('disconnected', () => {
        this.connected = false;
      });

      this.client.once('error', (error) => {
        clearTimeout(timeout);
        this.connected = false;
        this.connecting = null;
        reject(error);
      });

      this.client.connect();
    });

    return this.connecting;
  }

  async request(payload, timeout = 5000) {
    const client = await this.ensureConnected();
    return client.sendRequestAsync(payload, timeout);
  }

  async getServerInfo() {
    const message = await this.request({ getInfo: {} });
    return message.response?.info || message.response || message;
  }

  async getTeamInfo() {
    const message = await this.request({ getTeamInfo: {} });
    return message.response?.teamInfo || message.response || message;
  }

  async getMapImage() {
    const message = await this.request({ getMap: {} }, 10000);
    const image = message.response?.map?.jpgImage;

    if (!image) {
      throw new Error('Rust+ did not return a map image.');
    }

    const filePath = path.join(process.cwd(), 'data', 'map.jpg');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, image);
    return filePath;
  }

  async setSwitch(entityId, state) {
    const payload = {
      setEntityValue: {
        entityId: Number(entityId),
        value: state === 'on'
      }
    };

    return this.request(payload);
  }
}

module.exports = new RustPlusService();
