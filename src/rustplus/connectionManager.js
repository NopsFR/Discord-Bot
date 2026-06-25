const EventEmitter = require('node:events');
const RustPlusInstance = require('./instance');
const dataStore = require('./dataStore');

/**
 * Owns every active Rust+ server connection. Re-emits per-instance events with
 * the owning server attached so consumers (Discord notifier, team chat handler,
 * event detector) can react without knowing about individual sockets.
 *
 * Re-emitted events all carry `{ server, ... }`:
 *  - 'connected' / 'disconnected'
 *  - 'teamMessage' -> { server, message }
 *  - 'teamInfo'    -> { server, teamInfo, previous }
 *  - 'markers'     -> { server, markers, previous }
 *  - 'entityChanged' -> { server, entityChanged }
 */
class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map(); // serverKey -> RustPlusInstance
  }

  /** Start connections for every active server in the store. */
  async startAll() {
    const store = await dataStore.get();
    const servers = Object.values(store.servers).filter((server) => server.active !== false);
    for (const server of servers) {
      this.add(server);
    }
  }

  add(server) {
    const key = dataStore.serverKey(server.guildId, server.serverId);
    if (this.instances.has(key)) {
      this.instances.get(key).stop();
    }

    const instance = new RustPlusInstance(server);

    instance.on('connected', () => this.emit('connected', { server }));
    instance.on('disconnected', () => this.emit('disconnected', { server }));
    instance.on('error', (error) => this.emit('serverError', { server, error }));
    instance.on('teamMessage', (message) => this.emit('teamMessage', { server, message, instance }));
    instance.on('teamInfo', (payload) => this.emit('teamInfo', { server, ...payload, instance }));
    instance.on('markers', (payload) => this.emit('markers', { server, ...payload, instance }));
    instance.on('entityChanged', (entityChanged) => this.emit('entityChanged', { server, entityChanged, instance }));

    this.instances.set(key, instance);
    instance.start();
    return instance;
  }

  remove(key) {
    const instance = this.instances.get(key);
    if (instance) {
      instance.stop();
      this.instances.delete(key);
    }
  }

  get(key) {
    return this.instances.get(key) || null;
  }

  /** Return the active instance for a guild (first active server). */
  getForGuild(guildId) {
    for (const instance of this.instances.values()) {
      if (instance.server.guildId === guildId) {
        return instance;
      }
    }
    return null;
  }

  list() {
    return [...this.instances.values()];
  }

  stopAll() {
    for (const instance of this.instances.values()) {
      instance.stop();
    }
    this.instances.clear();
  }
}

module.exports = new ConnectionManager();
