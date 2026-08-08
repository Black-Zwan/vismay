import { describe, expect, it } from 'vitest';

import { motion, resolveMotionDuration } from '@/src/ui/motionConfig';

describe('motion preference', () => {
  it('keeps full motion timing', () => {
    expect(resolveMotionDuration('full', motion.rise)).toBe(500);
  });

  it('removes decorative timing for reduced motion', () => {
    expect(resolveMotionDuration('reduced', motion.revealFlip)).toBe(0);
  });
});
