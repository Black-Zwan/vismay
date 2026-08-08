export type CardArtworkKind = 'emblem' | 'image';

export function resolveCardArtworkKind(artwork?: { kind: CardArtworkKind }): CardArtworkKind {
  return artwork?.kind ?? 'emblem';
}
