const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const defaultState = {
  wipes: [],
  switches: [],
  steamLinks: {},
  craftBinds: {},
  clanInvites: {},
  intelLists: {},
  eventStats: {}
};

async function ensureStateFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STATE_FILE);
  } catch {
    await writeState(defaultState);
  }
}

async function readState() {
  await ensureStateFile();
  const raw = await fs.readFile(STATE_FILE, 'utf8');
  return {
    ...defaultState,
    ...JSON.parse(raw)
  };
}

async function writeState(state) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function upsertWipe(wipe) {
  const state = await readState();
  const nextWipes = state.wipes.filter((item) => item.server.toLowerCase() !== wipe.server.toLowerCase());
  nextWipes.push({
    ...wipe,
    updatedAt: new Date().toISOString()
  });
  nextWipes.sort((a, b) => a.server.localeCompare(b.server));
  await writeState({ ...state, wipes: nextWipes });
  return nextWipes;
}

module.exports = {
  readState,
  writeState,
  upsertWipe
};
