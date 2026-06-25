const EventEmitter = require('node:events');
const RustPlus = require('@liamcottle/rustplus.js');

const RECONNECT_DELAY_MS = 15000;
const POLL_INTERVAL_MS = 20000;

/**
 * Wraps a single Rust+ websocket connection to one paired server and adds:
 *  - automatic (re)connection
 *  - in-game team chat broadcast forwarding (`teamMessage` event)
 *  - periodic polling of team info & map markers (`teamInfo`, `markers` events)
 *  - convenience request helpers
 *
 * Emits:
 *  - 'connected' / 'disconnected'
 *  - 'teamMessage'  -> AppTeamMessage
 *  - 'teamInfo'     -> { teamInfo, previous }
 *  - 'markers'      -> { markers, previous }
 *  - 'error'        -> Error
 */
class RustPlusInstance extends EventEmitter {
  constructor(server) {
    super();
    this.server = server; // dataStore server entry
    this.client = null;
    this.connected = false;
    this.shouldRun = false;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.lastTeamInfo = null;
    this.lastMarkers = [];
    this.seq = 1;
  }

  get key() {
    return `${this.server.guildId}:${this.server.serverId}`;
  }

  start() {
    this.shouldRun = true;
    this._connect();
  }

  stop() {
    this.shouldRun = false;
    this._clearTimers();
    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.client = null;
    this.connected = false;
  }

  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  _scheduleReconnect() {
    if (!this.shouldRun || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._connect();
    }, RECONNECT_DELAY_MS);
  }

  _connect() {
    if (!this.shouldRun) {
      return;
    }

    const { ip, port, playerId, playerToken } = this.server;
    this.client = new RustPlus(ip, port, playerId, playerToken);

    this.client.on('connected', () => {
      this.connected = true;
      this.emit('connected');
      this._startPolling();
    });

    this.client.on('disconnected', () => {
      this.connected = false;
      this.emit('disconnected');
      this._clearTimers();
      this._scheduleReconnect();
    });

    this.client.on('error', (error) => {
      this.emit('error', error);
      this.connected = false;
      this._scheduleReconnect();
    });

    // Broadcast messages (team chat, entity changes, team changes).
    this.client.on('message', (message) => {
      const broadcast = message?.broadcast;
      if (!broadcast) {
        return;
      }
      if (broadcast.teamMessage?.message) {
        this.emit('teamMessage', broadcast.teamMessage.message);
      }
      if (broadcast.entityChanged) {
        this.emit('entityChanged', broadcast.entityChanged);
      }
      if (broadcast.teamChanged) {
        this.emit('teamChanged', broadcast.teamChanged);
      }
    });

    try {
      this.client.connect();
    } catch (error) {
      this.emit('error', error);
      this._scheduleReconnect();
    }
  }

  _startPolling() {
    this._poll();
    this.pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
  }

  async _poll() {
    try {
      const teamInfo = await this.getTeamInfo();
      this.emit('teamInfo', { teamInfo, previous: this.lastTeamInfo });
      this.lastTeamInfo = teamInfo;
    } catch (error) {
      // connection may be flaky; surface but keep polling
      this.emit('error', error);
    }

    try {
      const markers = await this.getMapMarkers();
      this.emit('markers', { markers, previous: this.lastMarkers });
      this.lastMarkers = markers;
    } catch {
      /* markers occasionally fail, ignore single failures */
    }
  }

  // sendRequestAsync resolves with the AppResponse directly (not the envelope).
  async request(payload, timeout = 10000) {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to this Rust+ server.');
    }
    return this.client.sendRequestAsync(payload, timeout);
  }

  async getInfo() {
    const response = await this.request({ getInfo: {} });
    return response.info || response;
  }

  async getTime() {
    const response = await this.request({ getTime: {} });
    return response.time || response;
  }

  async getTeamInfo() {
    const response = await this.request({ getTeamInfo: {} });
    return response.teamInfo || response;
  }

  async getMapMarkers() {
    const response = await this.request({ getMapMarkers: {} });
    return response.mapMarkers?.markers || [];
  }

  async getMap() {
    const response = await this.request({ getMap: {} }, 20000);
    return response.map || null;
  }

  async getEntityInfo(entityId) {
    const response = await this.request({ entityId: Number(entityId), getEntityInfo: {} });
    return response.entityInfo || response;
  }

  async setEntityValue(entityId, value) {
    return this.request({ entityId: Number(entityId), setEntityValue: { value: Boolean(value) } });
  }

  async sendTeamMessage(message) {
    return this.request({ sendTeamMessage: { message: String(message) } });
  }

  async promoteToLeader(steamId) {
    return this.request({ promoteToLeader: { steamId: String(steamId) } });
  }
}

module.exports = RustPlusInstance;
