import { describe, expect, it } from 'vitest';

import type { Phase } from '@/src/state/types';
import { journeyChromeMode, journeyTabsVisible } from '@/src/ui/journeyChrome';

describe('journey chrome', () => {
  it.each<Phase>(['traveling', 'arrive'])('keeps navigation visible during %s', (phase) => {
    expect(journeyChromeMode(phase)).toBe('travel');
    expect(journeyTabsVisible(phase)).toBe(true);
  });

  it.each<Phase>(['question', 'draw', 'reveal', 'reading', 'done', 'walk'])(
    'hides navigation during %s',
    (phase) => {
      expect(journeyChromeMode(phase)).toBe('ritual');
      expect(journeyTabsVisible(phase)).toBe(false);
    },
  );
});
