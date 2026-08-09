/**
 * Shared vertical staging for the side-on world.
 *
 * The prototype reads as five descending bands: open sky, the ridge line,
 * middle-distance ground, the road, then foreground silhouettes. Values
 * measured from the top use 0..1 normalized renderer coordinates; bottom
 * percentages are React Native layout values.
 */
export const WORLD_COMPOSITION = {
  skyTopFromTop: 0,
  ridgeBandTopFromTop: 0.38,
  horizonFromTop: 0.54,
  backgroundBottomFromTop: 0.72,
  pathTopFromTop: 0.72,
  pathBottomFromTop: 0.86,
  foregroundTopFromTop: 0.89,
  worldBottomFromTop: 1,
  characterBottomPct: 20.5,
  // The near parallax strip stands at the far edge of the road. Cairns and
  // the wanderer use the road baseline separately.
  nearPropBottomPct: [28, 32] as const,
} as const;

export function characterBaselineFromTop(): number {
  return 1 - WORLD_COMPOSITION.characterBottomPct / 100;
}

export function isCharacterGrounded(): boolean {
  const baseline = characterBaselineFromTop();
  return baseline >= WORLD_COMPOSITION.pathTopFromTop
    && baseline <= WORLD_COMPOSITION.pathBottomFromTop;
}

export function characterRoadPosition(): number {
  const baseline = characterBaselineFromTop();
  const roadDepth = WORLD_COMPOSITION.pathBottomFromTop - WORLD_COMPOSITION.pathTopFromTop;
  return (baseline - WORLD_COMPOSITION.pathTopFromTop) / roadDepth;
}
