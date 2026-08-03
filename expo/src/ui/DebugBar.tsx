import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  DEV_DAYPART_OVERRIDE,
  daypartFromTimestamp,
  now,
  type Daypart,
} from '@/src/core/time';
import { selectWalkProgress, useStore } from '@/src/state/store';
import { ARCHETYPES, BIOME_IDS } from '@/src/world/data';
import { ASPECT_LIST } from '@/src/content/aspects';
import { getSign } from '@/src/content/signs';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useClock } from '@/src/ui/useClock';

const HOUR_MS = 60 * 60 * 1000;
const MIN_OFFSET_MS = -24 * HOUR_MS;
const MAX_OFFSET_MS = 48 * HOUR_MS;
const SLIDER_STEP_MS = 15 * 60 * 1000;
const DAYPARTS: Daypart[] = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'];

export function DebugBar() {
  const devMode = useStore((state) => state.settings.devMode);
  const devOffsetMs = useStore((state) => state.devOffsetMs);
  const devFastLegs = useStore((state) => state.devFastLegs);
  const isPlus = useStore((state) => state.journey.isPlus);
  const seed = useStore((state) => state.journey.seed);
  const journey = useStore((state) => state.journey);
  const devSetTimeOffset = useStore((state) => state.devSetTimeOffset);
  const devForceArrival = useStore((state) => state.devForceArrival);
  const devToggleFastLegs = useStore((state) => state.devToggleFastLegs);
  const devTogglePlus = useStore((state) => state.devTogglePlus);
  const devForceDaypart = useStore((state) => state.devForceDaypart);
  const devForceRare = useStore((state) => state.devForceRare);
  const devRerollSeed = useStore((state) => state.devRerollSeed);
  const devJumpBiome = useStore((state) => state.devJumpBiome);
  const devSetWalkProgress = useStore((state) => state.devSetWalkProgress);
  const devForcePlace = useStore((state) => state.devForcePlace);
  const devGrantAspect = useStore((state) => state.devGrantAspect);
  const devCycleSign = useStore((state) => state.devCycleSign);
  const devFireArrivalNotification = useStore((state) => state.devFireArrivalNotification);
  const resetAll = useStore((state) => state.resetAll);
  const [forcedDaypart, setForcedDaypart] = useState<Daypart | null>(
    DEV_DAYPART_OVERRIDE.current,
  );

  const clock = useClock(250);
  if (!devMode) return null;

  const shiftedTime = now();
  const daypart = daypartFromTimestamp(shiftedTime);
  const progress = selectWalkProgress(journey, clock);

  const stepOffset = (amount: number) => devSetTimeOffset(devOffsetMs + amount);
  const forceDaypart = (part: Daypart | null) => {
    devForceDaypart(part);
    setForcedDaypart(part);
  };
  const confirmReset = () => {
    Alert.alert(
      'Reset Vismay?',
      'This clears onboarding, the Chronicle, and all journey progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetAll().then(() => router.replace('/onboarding/character'));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.clockBlock}>
          <Text style={styles.readout}>
            {`${formatClock(shiftedTime)} · ${daypart} · ${formatOffset(devOffsetMs)}`}
          </Text>
          <Text style={styles.readout}>{`seed ${seed}`}</Text>
          <TimeSlider value={devOffsetMs} onChange={devSetTimeOffset} />
          <Text style={styles.readout}>{`${Math.round(progress * 100)}% · ${journey.biome}:${journey.place.archetypeId}`}</Text>
          <ProgressSlider value={progress} onChange={devSetWalkProgress} />
        </View>

        <ToolButton label="+1h" onPress={() => stepOffset(HOUR_MS)} />
        <ToolButton label="+6h" onPress={() => stepOffset(6 * HOUR_MS)} />
        <ToolButton label="+1d" onPress={() => stepOffset(24 * HOUR_MS)} />
        <ToolButton label="time 0" onPress={() => devSetTimeOffset(0)} />
        <ToolButton label="arrival +1" onPress={devForceArrival} />
        <ToolButton label="progress 0" onPress={() => devSetWalkProgress(0)} />
        <ToolButton label="progress 55" onPress={() => devSetWalkProgress(0.55)} />
        <ToolButton label="progress 75" onPress={() => devSetWalkProgress(0.75)} />
        <ToolButton label="progress 100" onPress={() => devSetWalkProgress(1)} />
        <ToolButton label="force rare" onPress={devForceRare} />
        <ToolButton label="reroll seed" onPress={devRerollSeed} />
        <ToolButton label="jump biome" onPress={devJumpBiome} />
        <ToolButton
          label={`sign ${getSign(journey.signId)?.name ?? journey.signId}`}
          onPress={devCycleSign}
        />
        <ToolButton label="fire arrival notification" onPress={devFireArrivalNotification} />
        <ToolButton
          label="fast"
          active={devFastLegs}
          onPress={() => devToggleFastLegs(!devFastLegs)}
        />
        <ToolButton
          label="plus"
          active={isPlus}
          onPress={() => devTogglePlus(!isPlus)}
        />

        <View style={styles.group}>
          {ASPECT_LIST.flatMap((aspect) => [
            <ToolButton
              key={`${aspect.id}-1`}
              label={`${aspect.name} +1`}
              onPress={() => devGrantAspect(aspect.id, 1)}
            />,
            <ToolButton
              key={`${aspect.id}-10`}
              label={`${aspect.name} +10`}
              onPress={() => devGrantAspect(aspect.id, 10)}
            />,
          ])}
        </View>

        <View style={styles.group}>
          {DAYPARTS.map((part) => (
            <ToolButton
              key={part}
              label={part}
              active={forcedDaypart === part}
              onPress={() => forceDaypart(part)}
            />
          ))}
          <ToolButton
            label="auto"
            active={forcedDaypart === null}
            onPress={() => forceDaypart(null)}
          />
        </View>

        <View style={styles.group}>
          {BIOME_IDS.flatMap((biome) =>
            ARCHETYPES.filter((archetype) => archetype.biomes.includes(biome)).map((archetype) => (
              <ToolButton
                key={`${biome}:${archetype.id}`}
                label={`${biomeLabel(biome)}:${archetype.id}`}
                active={journey.biome === biome && journey.place.archetypeId === archetype.id}
                onPress={() => devForcePlace(biome, archetype.id)}
              />
            )),
          )}
        </View>

        <ToolButton label="reset state" danger onPress={confirmReset} />
      </ScrollView>
    </View>
  );
}

function ProgressSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const trackRef = useRef<View>(null);
  const updateFromEvent = (event: GestureResponderEvent) => {
    const pageX = event.nativeEvent.pageX;
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (width <= 0) return;
      onChange(Math.round(Math.max(0, Math.min(1, (pageX - x) / width)) * 100) / 100);
    });
  };

  return (
    <View
      ref={trackRef}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Walk progress"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(value + 0.01);
        if (event.nativeEvent.actionName === 'decrement') onChange(value - 0.01);
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={updateFromEvent}
      onResponderMove={updateFromEvent}
      style={styles.slider}
    >
      <View style={[styles.progressFill, { width: `${value * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${value * 100}%` }]} />
    </View>
  );
}

function TimeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const trackRef = useRef<View>(null);
  const progress = (value - MIN_OFFSET_MS) / (MAX_OFFSET_MS - MIN_OFFSET_MS);

  const updateFromEvent = (event: GestureResponderEvent) => {
    const pageX = event.nativeEvent.pageX;
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (pageX - x) / width));
      const rawValue = MIN_OFFSET_MS + ratio * (MAX_OFFSET_MS - MIN_OFFSET_MS);
      onChange(Math.round(rawValue / SLIDER_STEP_MS) * SLIDER_STEP_MS);
    });
  };

  return (
    <View
      ref={trackRef}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Shifted time"
      accessibilityValue={{ min: -24, max: 48, now: Math.round(value / HOUR_MS) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(value + HOUR_MS);
        if (event.nativeEvent.actionName === 'decrement') onChange(value - HOUR_MS);
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={updateFromEvent}
      onResponderMove={updateFromEvent}
      style={styles.slider}
    >
      <View style={[styles.sliderFill, { width: `${progress * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${progress * 100}%` }]} />
    </View>
  );
}

function ToolButton({
  label,
  onPress,
  active = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        active && styles.toolButtonActive,
        danger && styles.toolButtonDanger,
        pressed && styles.toolButtonPressed,
      ]}
    >
      <Text style={[styles.toolText, active && styles.toolTextActive]}>{label}</Text>
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

function biomeLabel(biome: (typeof BIOME_IDS)[number]): string {
  return biome.split('_').map((part) => part[0]).join('').toUpperCase();
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 58,
  },
  content: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clockBlock: {
    gap: 5,
    width: 190,
  },
  readout: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 12,
  },
  slider: {
    backgroundColor: colors.line,
    height: 8,
    justifyContent: 'center',
    width: 190,
  },
  sliderFill: {
    backgroundColor: colors.textMuted,
    height: 2,
  },
  progressFill: {
    backgroundColor: colors.textMuted,
    height: 2,
  },
  sliderThumb: {
    backgroundColor: colors.text,
    height: 8,
    marginLeft: -4,
    position: 'absolute',
    width: 8,
  },
  group: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  toolButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 7,
  },
  toolButtonActive: {
    borderColor: colors.textMuted,
    backgroundColor: colors.surfaceRaised,
  },
  toolButtonDanger: {
    borderColor: colors.danger,
  },
  toolButtonPressed: {
    opacity: 0.65,
  },
  toolText: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 12,
  },
  toolTextActive: {
    color: colors.text,
  },
});
