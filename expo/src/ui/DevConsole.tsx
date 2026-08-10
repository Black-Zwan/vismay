import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';

import { ASPECT_LIST } from '@/src/content/aspects';
import { getCharacter } from '@/src/content/characters';
import { getSign, SIGNS } from '@/src/content/signs';
import { DEV_DAYPART_OVERRIDE, daypartFromTimestamp, now, type Daypart } from '@/src/core/time';
import { SCENE_IDS } from '@/src/render/WorldView';
import { selectWalkProgress, useStore } from '@/src/state/store';
import {
  DEV_SECTIONS,
  validateDevControl,
  type DevActionControl,
  type DevSectionId,
} from '@/src/ui/devControls';
import { Text } from '@/src/ui/Text';
import { colors, radius, spacing } from '@/src/ui/tokens';
import { useClock } from '@/src/ui/useClock';
import { ARCHETYPES, BIOME_IDS, RARE_LOCATIONS } from '@/src/world/data';
import type { BiomeId, SceneId } from '@/src/world/types';

const HOUR_MS = 60 * 60 * 1_000;
const MIN_OFFSET_MS = -24 * HOUR_MS;
const MAX_OFFSET_MS = 48 * HOUR_MS;
const DAYPARTS: Daypart[] = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];

export function DevConsole({ bottomInset }: { bottomInset: number }) {
  const store = useStore();
  const { width, height } = useWindowDimensions();
  const clock = useClock(250);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<DevSectionId>('quick');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [forcedDaypart, setForcedDaypart] = useState<Daypart | null>(DEV_DAYPART_OVERRIDE.current);
  const pan = useRef(new Animated.ValueXY()).current;
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pan.setValue({ x: Math.max(12, width - 82), y: 104 });
  }, [bottomInset, height, pan, width]);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    // Let the nested Pressable own a tap. The pan responder only takes over
    // once the pointer has actually moved far enough to be a drag.
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      pan.extractOffset();
    },
    onPanResponderMove: (_event, gesture) => {
      pan.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: () => {
      pan.flattenOffset();
      const valueReader = (value: Animated.Value) => (
        value as Animated.Value & { __getValue: () => number }
      ).__getValue();
      const current = { x: valueReader(pan.x), y: valueReader(pan.y) };
      const nextX = current.x + 34 < width / 2 ? 12 : Math.max(12, width - 82);
      const nextY = Math.max(54, Math.min(height - bottomInset - 150, current.y));
      Animated.spring(pan, {
        toValue: { x: nextX, y: nextY },
        damping: 20,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }).start();
    },
  }), [bottomInset, height, pan, width]);

  const shiftedTime = now();
  const progress = selectWalkProgress(store.journey, clock);
  const realSceneId = RARE_LOCATIONS.find((rare) => rare.id === store.journey.place.rareId)?.sceneId ?? 'default';
  const effectiveScene = store.devSceneId ?? realSceneId;
  const approach = store.devSceneId ? store.devApproachProgress : progress;

  const announce = (message: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(message);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2_200);
  };
  const run = (label: string, action: () => void) => {
    try {
      action();
      announce(label);
    } catch {
      announce(`${label} failed`);
    }
  };

  const quickActions: DevActionControl[] = [
    { id: 'time-1h', section: 'quick', kind: 'action', label: '+1h', run: () => store.devSetTimeOffset(store.devOffsetMs + HOUR_MS) },
    { id: 'time-6h', section: 'quick', kind: 'action', label: '+6h', run: () => store.devSetTimeOffset(store.devOffsetMs + 6 * HOUR_MS) },
    { id: 'time-1d', section: 'quick', kind: 'action', label: '+1d', run: () => store.devSetTimeOffset(store.devOffsetMs + 24 * HOUR_MS) },
    { id: 'time-reset', section: 'quick', kind: 'action', label: 'Time ±0', run: () => store.devSetTimeOffset(0) },
    {
      id: 'complete-leg',
      section: 'quick',
      kind: 'action',
      label: 'Complete this leg',
      disabledReason: completeLegDisabledReason(store.onboarded, store.phase),
      run: store.devCompleteLeg,
    },
  ];

  const forceDaypart = (part: Daypart | null) => {
    store.devForceDaypart(part);
    setForcedDaypart(part);
    announce(part ? `Daypart: ${part}` : 'Daypart: automatic');
  };

  const setScene = (value: string) => {
    if (value === 'default') {
      if (store.devSceneId) store.devToggleScene(store.devSceneId);
    } else if (store.devSceneId !== value) {
      if (store.devSceneId) store.devToggleScene(store.devSceneId);
      store.devToggleScene(value as SceneId);
    }
    announce(value === 'default' ? 'Scene: real destination' : `Scene: ${value}`);
  };

  const setBiome = (value: string) => {
    const biome = value as BiomeId;
    const archetype = ARCHETYPES.find((candidate) => candidate.biomes.includes(biome));
    if (!archetype) return;
    store.devForcePlace(biome, archetype.id);
    announce(`Biome: ${biomeLabel(biome)}`);
  };

  const confirmReset = () => {
    const reset = () => {
      void store.resetAll().then(() => {
        setOpen(false);
        router.replace('/onboarding/character');
      });
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Wipe Vismay storage?\n\nThis clears onboarding, the Chronicle, and all journey progress.')) reset();
      return;
    }
    Alert.alert('Wipe Vismay storage?', 'This clears onboarding, the Chronicle, and all journey progress.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Wipe', style: 'destructive', onPress: reset },
    ]);
  };

  const snapshot = JSON.stringify({
    phase: store.phase,
    onboarded: store.onboarded,
    journey: store.journey,
    mirror: store.mirror,
    chronicleCount: store.chronicle.length,
    pendingCurioIds: store.pendingCurioIds,
    raresFound: store.raresFound,
    settings: store.settings,
    dev: {
      offsetMs: store.devOffsetMs,
      fastLegs: store.devFastLegs,
      sceneId: store.devSceneId,
      approach: store.devApproachProgress,
      network: store.traceNetworkEnabled,
      density: store.traceDensity,
    },
  }, null, 2);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.pillPosition, pan.getLayout()]} {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open developer console, ${store.renderFps} frames per second`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <Text style={styles.pillText}>DEV · {store.renderFps}</Text>
        </Pressable>
      </Animated.View>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text variant="screenRubric">Developer Console</Text>
                <Text variant="developerReadout" muted numberOfLines={1}>
                  {`${store.phase} · day ${store.journey.dayIndex} · ${store.renderFps} fps`}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close developer console" onPress={() => setOpen(false)} style={styles.close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            {feedback ? (
              <View accessibilityLiveRegion="polite" style={styles.feedback}>
                <Text variant="developerReadout">{feedback}</Text>
              </View>
            ) : null}

            <ScrollView
              horizontal
              style={styles.sectionTabsScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionTabs}
            >
              {DEV_SECTIONS.map((candidate) => (
                <Pressable
                  key={candidate.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: section === candidate.id }}
                  onPress={() => setSection(candidate.id)}
                  style={[styles.sectionTab, section === candidate.id && styles.sectionTabActive]}
                >
                  <Text style={[styles.sectionTabText, section === candidate.id && styles.sectionTabTextActive]}>{candidate.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator>
              {section === 'quick' ? (
                <>
                  <StatusCard
                    rows={[
                      ['Clock', `${formatClock(shiftedTime)} · ${daypartFromTimestamp(shiftedTime)} · ${formatOffset(store.devOffsetMs)}`],
                      ['World', `${biomeLabel(store.journey.biome)} · ${store.journey.place.name}`],
                      ['Leg', `${Math.round(progress * 100)}% · ${formatRemaining(store.journey.arrivalAt - shiftedTime)}`],
                      ['Scene', `${effectiveScene} · ${store.devSceneId ? 'forced' : 'real'} · ${Math.round(approach * 100)}%`],
                      ['Seed', String(store.journey.seed)],
                    ]}
                  />
                  <SectionTitle title="Time shortcuts" />
                  <ActionGrid controls={quickActions} onRun={run} />
                  <SectionTitle title="Progress presets" />
                  <Segmented
                    value={String(Math.round(progress * 100))}
                    options={[0, 55, 75, 100].map((value) => ({ label: `${value}%`, value: String(value) }))}
                    onChange={(value) => run(`Walk progress: ${value}%`, () => store.devSetWalkProgress(Number(value) / 100))}
                    disabled={!store.onboarded}
                  />
                  <ToggleRow label="Fast legs" value={store.devFastLegs} onChange={(value) => run(`Fast legs ${value ? 'on' : 'off'}`, () => store.devToggleFastLegs(value))} />
                  <ToggleRow label="Plus pacing" value={store.journey.isPlus} onChange={(value) => run(`Plus pacing ${value ? 'on' : 'off'}`, () => store.devTogglePlus(value))} />
                </>
              ) : null}

              {section === 'time-leg' ? (
                <>
                  <SectionTitle title="Shifted time" value={formatOffset(store.devOffsetMs)} />
                  <DevSlider label="Shifted time" value={store.devOffsetMs} min={MIN_OFFSET_MS} max={MAX_OFFSET_MS} step={15 * 60 * 1_000} onChange={store.devSetTimeOffset} />
                  <SectionTitle title="Walk progress" value={`${Math.round(progress * 100)}%`} />
                  <DevSlider label="Walk progress" value={progress} min={0} max={1} step={0.01} onChange={store.devSetWalkProgress} disabled={!store.onboarded} />
                  <SectionTitle title="Landmark approach" value={`${Math.round(store.devApproachProgress * 100)}%`} />
                  <DevSlider label="Landmark approach" value={store.devApproachProgress} min={0.55} max={1} step={0.01} onChange={store.devSetSceneApproach} />
                  <SectionTitle title="Daypart" />
                  <Segmented
                    value={forcedDaypart ?? 'auto'}
                    options={[...DAYPARTS.map((part) => ({ label: part, value: part })), { label: 'auto', value: 'auto' }]}
                    onChange={(value) => forceDaypart(value === 'auto' ? null : value as Daypart)}
                  />
                  <ActionGrid
                    onRun={run}
                    controls={[
                      { id: 'notify', section: 'time-leg', kind: 'action', label: 'Fire arrival notification', run: store.devFireArrivalNotification },
                      {
                        id: 'complete-leg-time',
                        section: 'time-leg',
                        kind: 'action',
                        label: 'Complete this leg',
                        disabledReason: completeLegDisabledReason(store.onboarded, store.phase),
                        run: store.devCompleteLeg,
                      },
                      {
                        id: 'bank-arrival',
                        section: 'time-leg',
                        kind: 'action',
                        label: 'Bank +1',
                        disabledReason: bankArrivalDisabledReason(
                          store.onboarded,
                          store.phase,
                          store.journey.bankedArrivals,
                        ),
                        run: store.devBankArrival,
                      },
                    ]}
                  />
                  <StatusCard rows={[["Banked arrivals", `${store.journey.bankedArrivals} / 5`]]} />
                </>
              ) : null}

              {section === 'world-scene' ? (
                <>
                  <SectionTitle title="Biome" value={biomeLabel(store.journey.biome)} />
                  <PickerGrid value={store.journey.biome} options={BIOME_IDS.map((biome) => ({ label: biomeLabel(biome), value: biome }))} onChange={setBiome} />
                  <SectionTitle title="Archetype" value={store.journey.place.archetypeId} />
                  <PickerGrid
                    value={store.journey.place.archetypeId}
                    options={ARCHETYPES.filter((archetype) => archetype.biomes.includes(store.journey.biome)).map((archetype) => ({ label: archetype.noun, value: archetype.id }))}
                    onChange={(value) => run(`Archetype: ${value}`, () => store.devForcePlace(store.journey.biome, value))}
                  />
                  <SectionTitle title="Scene" value={store.devSceneId ?? 'real/default'} />
                  <PickerGrid
                    value={store.devSceneId ?? 'default'}
                    options={[
                      { label: 'real/default', value: 'default' },
                      ...SCENE_IDS.filter((sceneId) => sceneId !== 'default').map((sceneId) => ({ label: sceneId, value: sceneId })),
                    ]}
                    onChange={setScene}
                  />
                  <SectionTitle title="Rare destinations" />
                  <PickerGrid
                    value={store.journey.place.rareId ?? ''}
                    options={RARE_LOCATIONS.map((rare) => ({ label: rare.name.startsWith('TODO:') ? rare.sceneId : rare.name, value: rare.id }))}
                    onChange={(value) => run('Rare destination forced', () => store.devForceRareLocation(value))}
                  />
                  <ActionGrid
                    onRun={run}
                    controls={[
                      { id: 'seed', section: 'world-scene', kind: 'action', label: 'Reroll seed', run: store.devRerollSeed },
                      { id: 'biome-next', section: 'world-scene', kind: 'action', label: 'Next biome', run: store.devJumpBiome },
                      { id: 'rare', section: 'world-scene', kind: 'action', label: 'Force any rare', run: store.devForceRare },
                    ]}
                  />
                </>
              ) : null}

              {section === 'player-content' ? (
                <>
                  <StatusCard rows={[
                    ['Character', getCharacter(store.journey.characterId)?.name ?? store.journey.characterId],
                    ['Sign', getSign(store.journey.signId)?.name ?? store.journey.signId],
                    ['Chronicle', `${store.chronicle.length} entries`],
                    ['Satchel', `${store.mirror.satchel.length} curios`],
                  ]} />
                  <SectionTitle title="Birth sign" />
                  <PickerGrid
                    value={store.journey.signId}
                    options={SIGNS.map((sign) => ({ label: `${sign.glyph} ${sign.name}`, value: sign.id }))}
                    onChange={(value) => {
                      let guard = 0;
                      while (useStore.getState().journey.signId !== value && guard < SIGNS.length) {
                        useStore.getState().devCycleSign();
                        guard += 1;
                      }
                      announce(`Sign: ${getSign(value)?.name ?? value}`);
                    }}
                  />
                  <SectionTitle title="Grant aspects" />
                  {ASPECT_LIST.map((aspect) => (
                    <View key={aspect.id} style={styles.aspectRow}>
                      <View style={styles.aspectLabel}>
                        <Text>{aspect.name}</Text>
                        <Text variant="developerReadout" muted>{store.mirror.aspects[aspect.id]}</Text>
                      </View>
                      <View style={styles.aspectActions}>
                        <DevButton label="+1" onPress={() => run(`${aspect.name} +1`, () => store.devGrantAspect(aspect.id, 1))} />
                        <DevButton label="+10" onPress={() => run(`${aspect.name} +10`, () => store.devGrantAspect(aspect.id, 10))} />
                      </View>
                    </View>
                  ))}
                  <SectionTitle title="Grant curio" />
                  <Segmented
                    value=""
                    options={['common', 'uncommon', 'rare'].map((rarity) => ({ label: rarity, value: rarity }))}
                    onChange={(value) => run(`${value} curio granted`, () => store.devGrantCurio(value as 'common' | 'uncommon' | 'rare'))}
                  />
                </>
              ) : null}

              {section === 'traces-network' ? (
                <>
                  <ToggleRow label="Trace network" value={store.traceNetworkEnabled} onChange={() => run('Trace network toggled', store.devToggleTraceNetwork)} />
                  <SectionTitle title="Trace density" />
                  <Segmented
                    value={store.traceDensity}
                    options={['auto', 'low', 'high'].map((density) => ({ label: density, value: density }))}
                    onChange={(value) => {
                      let guard = 0;
                      while (useStore.getState().traceDensity !== value && guard < 3) {
                        useStore.getState().devCycleTraceDensity();
                        guard += 1;
                      }
                      announce(`Trace density: ${value}`);
                    }}
                  />
                  <ActionGrid
                    onRun={run}
                    controls={[
                      { id: 'cairn-real', section: 'traces-network', kind: 'action', label: 'Spawn real cairn', run: () => store.devSpawnCairn('real') },
                      { id: 'cairn-old', section: 'traces-network', kind: 'action', label: 'Spawn procedural cairn', run: () => store.devSpawnCairn('procedural') },
                    ]}
                  />
                  <StatusCard rows={[
                    ['Cairns on leg', `${store.roadCairns.length} / 3`],
                    ['Sources', store.roadCairns.map((cairn) => cairn.source).join(', ') || 'none'],
                    ['Bucket', store.cairnBucketKey ?? 'not loaded'],
                  ]} />
                </>
              ) : null}

              {section === 'state-danger' ? (
                <>
                  <SectionTitle title="State snapshot" />
                  <ScrollView style={styles.snapshot} nestedScrollEnabled>
                    <Text variant="developerReadout" selectable>{snapshot}</Text>
                  </ScrollView>
                  <DevButton
                    label="Export snapshot"
                    onPress={() => {
                      void Share.share({ title: 'Vismay developer state', message: snapshot })
                        .then(() => announce('Snapshot export opened'))
                        .catch(() => announce('Snapshot export unavailable'));
                    }}
                  />
                  <View style={styles.dangerZone}>
                    <Text variant="screenRubric" style={styles.dangerText}>Danger zone</Text>
                    <Text variant="caption" muted>This wipes Vismay’s persisted Expo Go storage, including onboarding, the Chronicle, Mirror growth, and the current journey.</Text>
                    <DevButton label="Wipe storage & reset" danger onPress={confirmReset} />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatusCard({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.statusCard}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.readoutRow}>
          <Text variant="developerReadout" muted>{label}</Text>
          <Text variant="developerReadout" style={styles.readoutValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ title, value }: { title: string; value?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="screenRubric" muted>{title}</Text>
      {value ? <Text variant="developerReadout">{value}</Text> : null}
    </View>
  );
}

function ActionGrid({
  controls,
  onRun,
}: {
  controls: DevActionControl[];
  onRun: (label: string, action: () => void) => void;
}) {
  return (
    <View style={styles.actionGrid}>
      {controls.map((control) => (
        <DevButtonFromAction key={control.id} control={control} onRun={onRun} />
      ))}
    </View>
  );
}

function DevButtonFromAction({
  control,
  onRun,
}: {
  control: DevActionControl;
  onRun: (label: string, action: () => void) => void;
}) {
  const disabledReason = validateDevControl(control);
  return (
    <DevButton
      label={control.label}
      danger={control.danger}
      disabled={!!disabledReason}
      disabledReason={disabledReason ?? undefined}
      onPress={() => onRun(control.label, control.run)}
    />
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggleRow}>
      <Text>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
}

function Segmented({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: readonly { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.segmented, disabled && styles.disabled]}>
      {options.map((option) => (
        <DevButton key={option.value} label={option.label} active={value === option.value} disabled={disabled} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}

function PickerGrid({ value, options, onChange }: { value: string; options: readonly { label: string; value: string }[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.pickerGrid}>
      {options.map((option) => (
        <DevButton key={option.value} label={option.label} active={value === option.value} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}

function DevSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<View>(null);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const update = (event: GestureResponderEvent) => {
    if (disabled) return;
    const pageX = event.nativeEvent.pageX;
    trackRef.current?.measureInWindow((x, _y, trackWidth) => {
      if (trackWidth <= 0) return;
      const nextRatio = Math.max(0, Math.min(1, (pageX - x) / trackWidth));
      const raw = min + nextRatio * (max - min);
      onChange(Math.max(min, Math.min(max, Math.round(raw / step) * step)));
    });
  };
  return (
    <View
      ref={trackRef}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
        if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
      }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={update}
      onResponderMove={update}
      style={[styles.slider, disabled && styles.disabled]}
    >
      <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
    </View>
  );
}

function DevButton({
  label,
  onPress,
  active = false,
  danger = false,
  disabled = false,
  disabledReason,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      accessibilityHint={disabledReason}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.devButton,
        active && styles.devButtonActive,
        danger && styles.devButtonDanger,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.devButtonText, active && styles.devButtonTextActive, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatOffset(offsetMs: number): string {
  const hours = offsetMs / HOUR_MS;
  if (hours === 0) return '±0h';
  return `${hours > 0 ? '+' : ''}${hours.toFixed(hours % 1 === 0 ? 0 : 2)}h`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'arrived';
  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function completeLegDisabledReason(onboarded: boolean, phase: string): string | undefined {
  if (!onboarded) return 'Complete onboarding first';
  if (phase === 'arrive') return 'The current leg is already complete';
  if (phase !== 'traveling') return 'Finish the current pull first';
  return undefined;
}

function bankArrivalDisabledReason(
  onboarded: boolean,
  phase: string,
  bankedArrivals: number,
): string | undefined {
  if (!onboarded) return 'Complete onboarding first';
  if (phase !== 'traveling' && phase !== 'arrive') return 'Finish the current pull first';
  if (bankedArrivals >= 5) return 'The arrival bank is full';
  return undefined;
}

function biomeLabel(biome: BiomeId): string {
  return biome
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

const styles = StyleSheet.create({
  pillPosition: { position: 'absolute', zIndex: 300 },
  pill: {
    minWidth: 70,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#7ee8d2',
    backgroundColor: 'rgba(10,8,18,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    elevation: 8,
  },
  pillText: { color: '#7ee8d2', fontFamily: 'monospace', fontSize: 11, lineHeight: 15 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,3,10,0.58)' },
  sheet: {
    height: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 4, marginTop: 8, borderRadius: 2, backgroundColor: colors.line },
  sheetHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  sheetHeaderText: { flex: 1, gap: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 28, lineHeight: 32, color: colors.textMuted },
  feedback: { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: '#7ee8d222' },
  sectionTabsScroll: { flexGrow: 0, maxHeight: 52 },
  sectionTabs: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sectionTab: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  sectionTabActive: { borderColor: '#7ee8d2', backgroundColor: '#7ee8d214' },
  sectionTabText: { fontSize: 12, color: colors.textMuted },
  sectionTabTextActive: { color: '#7ee8d2' },
  body: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  bodyContent: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  statusCard: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.surface },
  readoutRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  readoutValue: { flex: 1, textAlign: 'right' },
  sectionTitle: { marginTop: spacing.md, minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  devButton: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.surface },
  devButtonActive: { borderColor: '#7ee8d2', backgroundColor: '#7ee8d214' },
  devButtonDanger: { borderColor: colors.danger },
  devButtonText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  devButtonTextActive: { color: '#7ee8d2' },
  toggleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  toggleTrack: { width: 44, height: 26, padding: 3, borderRadius: 13, backgroundColor: colors.line },
  toggleTrackActive: { backgroundColor: '#7ee8d266' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textMuted },
  toggleThumbActive: { alignSelf: 'flex-end', backgroundColor: '#7ee8d2' },
  slider: { height: 34, justifyContent: 'center', marginHorizontal: 6 },
  sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: '#7ee8d2' },
  sliderThumb: { position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 11, borderWidth: 3, borderColor: colors.background, backgroundColor: '#7ee8d2' },
  aspectRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  aspectLabel: { flex: 1 },
  aspectActions: { flexDirection: 'row', gap: spacing.sm },
  snapshot: { maxHeight: 320, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.surface },
  dangerZone: { marginTop: spacing.xl, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger },
  dangerText: { color: '#d98796' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.65 },
});
