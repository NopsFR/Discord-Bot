function normalizeSteamId(input) {
  const value = String(input || '').trim();
  const match = value.match(/7656119\d{10}/);
  return match ? match[0] : value;
}

function isSteamId64(value) {
  return /^7656119\d{10}$/.test(String(value || '').trim());
}

module.exports = {
  normalizeSteamId,
  isSteamId64
};
