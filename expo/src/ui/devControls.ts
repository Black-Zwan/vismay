export type DevSectionId =
  | 'quick'
  | 'time-leg'
  | 'world-scene'
  | 'player-content'
  | 'traces-network'
  | 'state-danger';

type DevControlBase = {
  id: string;
  section: DevSectionId;
  label: string;
  description?: string;
  disabledReason?: string;
};

export type DevActionControl = DevControlBase & {
  kind: 'action';
  run: () => void;
  danger?: boolean;
};

export type DevToggleControl = DevControlBase & {
  kind: 'toggle';
  value: boolean;
  setValue: (value: boolean) => void;
};

export type DevSegmentedControl = DevControlBase & {
  kind: 'segmented';
  value: string;
  options: readonly { label: string; value: string }[];
  setValue: (value: string) => void;
};

export type DevSliderControl = DevControlBase & {
  kind: 'slider';
  value: number;
  min: number;
  max: number;
  step: number;
  setValue: (value: number) => void;
};

export type DevPickerControl = DevControlBase & {
  kind: 'picker';
  value: string;
  options: readonly { label: string; value: string }[];
  setValue: (value: string) => void;
};

export type DevControl =
  | DevActionControl
  | DevToggleControl
  | DevSegmentedControl
  | DevSliderControl
  | DevPickerControl;

export const DEV_SECTIONS: readonly { id: DevSectionId; label: string }[] = [
  { id: 'quick', label: 'Quick' },
  { id: 'time-leg', label: 'Time & Leg' },
  { id: 'world-scene', label: 'World & Scene' },
  { id: 'player-content', label: 'Player & Content' },
  { id: 'traces-network', label: 'Traces & Network' },
  { id: 'state-danger', label: 'State & Danger' },
];

export function groupDevControls(controls: readonly DevControl[]): Record<DevSectionId, DevControl[]> {
  const grouped: Record<DevSectionId, DevControl[]> = {
    quick: [],
    'time-leg': [],
    'world-scene': [],
    'player-content': [],
    'traces-network': [],
    'state-danger': [],
  };
  for (const control of controls) grouped[control.section].push(control);
  return grouped;
}

/**
 * Returns the reason a descriptor cannot be used. Keeping this pure means the
 * console can reject malformed or contextually unavailable controls before a
 * platform component is rendered.
 */
export function validateDevControl(control: DevControl): string | null {
  if (!control.id.trim()) return 'Control id is required';
  if (!control.label.trim()) return 'Control label is required';
  if (control.disabledReason) return control.disabledReason;

  if (control.kind === 'slider') {
    if (![control.value, control.min, control.max, control.step].every(Number.isFinite)) {
      return 'Slider values must be finite';
    }
    if (control.max <= control.min) return 'Slider maximum must exceed its minimum';
    if (control.step <= 0) return 'Slider step must be positive';
    if (control.value < control.min || control.value > control.max) {
      return 'Slider value is outside its range';
    }
  }

  if (control.kind === 'picker' || control.kind === 'segmented') {
    if (control.options.length === 0) return 'Control requires at least one option';
    const values = control.options.map((option) => option.value);
    if (new Set(values).size !== values.length) return 'Control options must be unique';
    if (!values.includes(control.value)) return 'Current value is not an available option';
  }

  return null;
}
