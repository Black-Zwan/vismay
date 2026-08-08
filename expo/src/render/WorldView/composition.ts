/**
 * Shared vertical staging for the side-on world.
 *
 * Values measured from the top use 0..1 normalized renderer coordinates.
 * Bottom percentages are React Native layout values. Keeping both here makes
 * it difficult to move the wanderer without also checking the plane they
 * stand on.
 */
export const WORLD_COMPOSITION = {
  horizonFromTop: 0.54,
  characterBottomPct: 22,
  nearPropBottomPct: [20.5, 26] as const,
  pathTopFromTop: 0.755,
  pathBottomFromTop: 0.885,
  foregroundTopFromTop: 0.91,
} as const;

export function characterBaselineFromTop(): number {
  return 1 - WORLD_COMPOSITION.characterBottomPct / 100;
}

export function isCharacterGrounded(): boolean {
  const baseline = characterBaselineFromTop();
  return baseline >= WORLD_COMPOSITION.pathTopFromTop
    && baseline <= WORLD_COMPOSITION.pathBottomFromTop;
}
