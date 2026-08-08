import { describe, expect, it } from 'vitest';

import { resolveCardArtworkKind } from '@/src/ui/cardArtwork';

describe('card artwork fallback', () => {
  it('defaults to the procedural emblem', () => {
    expect(resolveCardArtworkKind()).toBe('emblem');
  });

  it('preserves commissioned image artwork', () => {
    expect(resolveCardArtworkKind({ kind: 'image' })).toBe('image');
  });
});
