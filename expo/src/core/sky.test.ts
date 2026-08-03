import { describe, expect, it } from 'vitest';

import { pickWatchSignId } from './sky';

describe('pickWatchSignId', () => {
  const ids = ['aries', 'taurus', 'gemini', 'cancer'];

  it('is deterministic and does not pick the player sign', () => {
    expect(pickWatchSignId('aries', ids, 0)).toBe('taurus');
    expect(pickWatchSignId('aries', ids, 0.999)).toBe('cancer');
  });

  it('handles a single-sign content table', () => {
    expect(pickWatchSignId('aries', ['aries'], 0.5)).toBe('aries');
  });
});
