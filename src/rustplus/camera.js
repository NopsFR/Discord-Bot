/**
 * CCTV / drone / turret camera helpers built on rustplus.js Camera.
 * The Camera renders PNG frames once subscribed; we capture a single frame on
 * demand (for Discord) or keep a subscription open (for the web camera station).
 */

const activeStations = new Map(); // `${serverKey}:${identifier}` -> Camera

function stationKey(serverKey, identifier) {
  return `${serverKey}:${identifier}`;
}

/**
 * Capture a single PNG frame from a camera and return the image buffer.
 */
async function captureFrame(instance, identifier, timeoutMs = 15000) {
  if (!instance?.client || !instance.connected) {
    throw new Error('Not connected to the Rust+ server.');
  }

  const camera = instance.client.getCamera(identifier);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      cleanup();
      await camera.unsubscribe().catch(() => {});
      reject(new Error(`Timed out capturing camera "${identifier}". Check the identifier is correct and the camera is powered.`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      camera.removeAllListeners('render');
      camera.removeAllListeners('error');
    }

    camera.once('render', async (frame) => {
      cleanup();
      await camera.unsubscribe().catch(() => {});
      resolve(frame);
    });

    camera.once('error', async (error) => {
      cleanup();
      await camera.unsubscribe().catch(() => {});
      reject(error);
    });

    camera.subscribe().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

/**
 * Get (or create) a long-lived camera subscription for the web station and
 * return its most recent frame.
 */
async function getStationFrame(instance, serverKey, identifier, timeoutMs = 15000) {
  const key = stationKey(serverKey, identifier);
  let station = activeStations.get(key);

  if (!station) {
    if (!instance?.client || !instance.connected) {
      throw new Error('Not connected to the Rust+ server.');
    }
    const camera = instance.client.getCamera(identifier);
    station = { camera, lastFrame: null };
    camera.on('render', (frame) => {
      station.lastFrame = frame;
    });
    activeStations.set(key, station);
    await camera.subscribe();
  }

  // Wait briefly for the first frame if needed.
  const deadline = Date.now() + timeoutMs;
  while (!station.lastFrame && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!station.lastFrame) {
    throw new Error(`No frames received from camera "${identifier}".`);
  }

  return station.lastFrame;
}

async function moveStation(serverKey, identifier, buttons, x, y) {
  const station = activeStations.get(stationKey(serverKey, identifier));
  if (!station) {
    throw new Error('Camera station is not active. Open a frame first.');
  }
  return station.camera.move(buttons, x, y);
}

async function stopStation(serverKey, identifier) {
  const key = stationKey(serverKey, identifier);
  const station = activeStations.get(key);
  if (station) {
    await station.camera.unsubscribe().catch(() => {});
    activeStations.delete(key);
  }
}

module.exports = { captureFrame, getStationFrame, moveStation, stopStation };
