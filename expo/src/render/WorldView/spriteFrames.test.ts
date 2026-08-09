import { describe, expect, it } from 'vitest';

import { inferSpriteFrameCount, spriteFrameAt } from './spriteFrames';

describe('sprite frame stepping', () => {
  it('infers all 24 authored frames from the delivered strip width', () => {
    expect(inferSpriteFrameCount(3_072)).toBe(24);
  });

  it('advances at ten frames per second and wraps without timer drift', () => {
    expect(spriteFrameAt(0, 10, 24)).toBe(0);
    expect(spriteFrameAt(100, 10, 24)).toBe(1);
    expect(spriteFrameAt(2_300, 10, 24)).toBe(23);
    expect(spriteFrameAt(2_400, 10, 24)).toBe(0);
  });
});
