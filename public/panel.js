const statusEl = document.querySelector('#status');
const wipesEl = document.querySelector('#wipes');
const refreshButton = document.querySelector('#refresh');
const wipeForm = document.querySelector('#wipe-form');

function statusRow(label, value) {
  return `<dt>${label}</dt><dd>${value}</dd>`;
}

function renderWipes(wipes) {
  if (!wipes.length) {
    wipesEl.innerHTML = '<p>No wipe schedules saved yet.</p>';
    return;
  }

  wipesEl.innerHTML = wipes.map((wipe) => `
    <div class="wipe">
      <div>
        <strong>${wipe.server}</strong>
        <span>${wipe.notes || 'No notes'}</span>
      </div>
      <div>${wipe.date}</div>
    </div>
  `).join('');
}

async function loadStatus() {
  const response = await fetch('/api/status');
  const data = await response.json();

  statusEl.innerHTML = [
    statusRow('Discord', data.discord.ready ? `Online as ${data.discord.tag}` : 'Not connected'),
    statusRow('Servers', data.discord.guilds),
    statusRow('Rust+', data.rustPlus.configured ? 'Configured' : 'Needs .env pairing details')
  ].join('');

  renderWipes(data.wipes);
}

refreshButton.addEventListener('click', loadStatus);

wipeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = Object.fromEntries(new FormData(wipeForm).entries());
  const response = await fetch('/api/wipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    alert('Could not save wipe.');
    return;
  }

  wipeForm.reset();
  await loadStatus();
});

loadStatus();
