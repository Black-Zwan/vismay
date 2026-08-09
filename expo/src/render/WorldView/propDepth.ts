import type { WorldPropKind } from '@/src/world/types';

export type PropLayer = 'far' | 'mid' | 'near' | 'foreground';

const FAR = new Set<WorldPropKind>([
  'pine',
  'willow',
  'deadtree',
  'palm',
  'post',
  'obelisk',
  'spire',
  'hull',
]);

const MID = new Set<WorldPropKind>([
  'pine',
  'willow',
  'deadtree',
  'palm',
  'wagon',
  'shrine',
  'post',
  'obelisk',
  'spire',
  'lantern',
  'hull',
  'vine',
]);

const FOREGROUND = new Set<WorldPropKind>([
  'shroom',
  'stone',
  'boulder',
  'bone',
  'driftwood',
  'fern',
]);

export function propKindsForLayer(
  candidates: readonly WorldPropKind[],
  layer: PropLayer,
): WorldPropKind[] {
  if (layer === 'near') return [...candidates];
  const allowed = layer === 'far' ? FAR : layer === 'mid' ? MID : FOREGROUND;
  return candidates.filter((kind) => allowed.has(kind));
}
