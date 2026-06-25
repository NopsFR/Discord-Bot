// Auto Turret / SAM Site interference mechanics (Rust).
const INTERFERENCE_RADIUS_M = 30;
const INTERFERENCE_LIMIT = 12;

/**
 * Calculate auto turret interference.
 * @param {number} nearbyCount total turrets/SAM sites within 30m (including this one)
 */
function calculate(nearbyCount) {
  const count = Math.max(0, Math.floor(nearbyCount));
  const interference = Math.max(0, count - 1);
  const disabled = count >= INTERFERENCE_LIMIT;
  const remaining = Math.max(0, INTERFERENCE_LIMIT - count);

  return {
    count,
    interference,
    radius: INTERFERENCE_RADIUS_M,
    limit: INTERFERENCE_LIMIT,
    disabled,
    remaining,
    summary: disabled
      ? `Turret would be DISABLED: ${count} electrical interference sources within ${INTERFERENCE_RADIUS_M}m (limit ${INTERFERENCE_LIMIT}).`
      : `Interference ${interference} from ${count} sources within ${INTERFERENCE_RADIUS_M}m. ${remaining} more before turrets shut down.`
  };
}

module.exports = { calculate, INTERFERENCE_RADIUS_M, INTERFERENCE_LIMIT };
