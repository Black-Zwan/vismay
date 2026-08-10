export const SPRITE_CELL_WIDTH = 128;

export function inferSpriteFrameCount(sheetWidth: number): number {
  if (!Number.isFinite(sheetWidth) || sheetWidth <= 0) return 1;
  return Math.max(1, Math.round(sheetWidth / SPRITE_CELL_WIDTH));
}

export function spriteFrameAt(
  elapsedMs: number,
  framesPerSecond: number,
  frameCount: number,
): number {
  if (framesPerSecond <= 0 || frameCount <= 1) return 0;
  return Math.floor(Math.max(0, elapsedMs) / 1_000 * framesPerSecond) % frameCount;
}
