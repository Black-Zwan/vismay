/** Daily Sky selection. Pure functions, no platform imports. */

/**
 * Pick a sign to watch for, excluding the player's own sign when possible.
 * The selected id is persisted with the Chronicle entry so a future cairn
 * payoff can use the exact sign the player saw.
 */
export function pickWatchSignId(
  playerSignId: string,
  signIds: readonly string[],
  unitRoll: number,
): string | undefined {
  const candidates = signIds.filter((id) => id !== playerSignId);
  if (candidates.length === 0) return signIds[0];
  const bounded = Math.max(0, Math.min(0.999999999, unitRoll));
  return candidates[Math.floor(bounded * candidates.length)];
}
