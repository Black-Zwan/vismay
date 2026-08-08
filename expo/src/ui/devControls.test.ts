import { describe, expect, it, vi } from 'vitest';

import {
  DEV_SECTIONS,
  groupDevControls,
  validateDevControl,
  type DevControl,
} from '@/src/ui/devControls';

describe('developer control registry', () => {
  it('has one stable entry for every console section', () => {
    expect(DEV_SECTIONS.map((section) => section.id)).toEqual([
      'quick',
      'time-leg',
      'world-scene',
      'player-content',
      'traces-network',
      'state-danger',
    ]);
  });

  it('groups controls without dropping empty sections', () => {
    const controls: DevControl[] = [{
      id: 'arrival',
      section: 'quick',
      kind: 'action',
      label: 'Force arrival',
      run: vi.fn(),
    }];
    const grouped = groupDevControls(controls);
    expect(grouped.quick).toHaveLength(1);
    expect(grouped['state-danger']).toEqual([]);
  });

  it('reports contextual and malformed controls before rendering', () => {
    const unavailable: DevControl = {
      id: 'arrival',
      section: 'quick',
      kind: 'action',
      label: 'Force arrival',
      disabledReason: 'Complete onboarding first',
      run: vi.fn(),
    };
    const malformedSlider: DevControl = {
      id: 'progress',
      section: 'time-leg',
      kind: 'slider',
      label: 'Walk progress',
      value: 2,
      min: 0,
      max: 1,
      step: 0.01,
      setValue: vi.fn(),
    };
    const duplicatePicker: DevControl = {
      id: 'scene',
      section: 'world-scene',
      kind: 'picker',
      label: 'Scene',
      value: 'default',
      options: [
        { label: 'Real', value: 'default' },
        { label: 'Default', value: 'default' },
      ],
      setValue: vi.fn(),
    };

    expect(validateDevControl(unavailable)).toBe('Complete onboarding first');
    expect(validateDevControl(malformedSlider)).toBe('Slider value is outside its range');
    expect(validateDevControl(duplicatePicker)).toBe('Control options must be unique');
  });
});
