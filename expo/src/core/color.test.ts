import { describe, expect, it } from 'vitest';

import { ramp } from './color';

describe('ramp', () => {
  it('interpolates evenly between color stops', () => {
    expect(ramp([[0, 0, 0], [10, 20, 30]], 3)).toEqual([
      [0, 0, 0],
      [5, 10, 15],
      [10, 20, 30],
    ]);
  });

  it('passes through the middle stop of a three-stop ramp', () => {
    expect(ramp([[0, 0, 0], [20, 40, 60], [40, 80, 120]], 5)[2]).toEqual([
      20,
      40,
      60,
    ]);
  });
});
