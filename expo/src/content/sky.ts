/**
 * Owner-authored horoscope copy lands here. Empty slots are omitted from the
 * player-facing close panel until the twelve minimum lines are supplied.
 */

const HOROSCOPE_LINES: Readonly<Record<string, readonly string[]>> = {};

export function getHoroscopeLine(signId: string, unitRoll: number): string | undefined {
  const lines = HOROSCOPE_LINES[signId];
  if (!lines?.length) return undefined;
  const bounded = Math.max(0, Math.min(0.999999999, unitRoll));
  return lines[Math.floor(bounded * lines.length)];
}
