/**
 * Settings. Notification toggles + dev panel (behind settings.devMode).
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { ASPECT_IDS } from '@/src/core/mirror';
import { DEV_DAYPART_OVERRIDE } from '@/src/core/time';
import type { Daypart } from '@/src/core/time';

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const devMode = settings.devMode;
  const devFastLegs = useStore((s) => s.devFastLegs);
  const devForceArrival = useStore((s) => s.devForceArrival);
  const devToggleFastLegs = useStore((s) => s.devToggleFastLegs);
  const devForceDaypart = useStore((s) => s.devForceDaypart);
  const resetAll = useStore((s) => s.resetAll);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text variant="title">Settings</Text>

      <Panel>
        <Toggle
          label="Arrival notifications"
          value={settings.notifyArrival}
          onToggle={(v) => updateSettings({ notifyArrival: v })}
        />
        <Divider />
        <Toggle
          label="Weekly notifications"
          value={settings.notifyWeekly}
          onToggle={(v) => updateSettings({ notifyWeekly: v })}
        />
        <Divider />
        <Toggle
          label="Dev mode"
          value={settings.devMode}
          onToggle={(v) => updateSettings({ devMode: v })}
        />
      </Panel>

      {devMode ? (
        <Panel>
          <Text variant="caption" muted>Dev panel</Text>

          <Button label="Force arrival" onPress={devForceArrival} style={{ marginTop: spacing.sm }} />
          <Button
            label={devFastLegs ? 'Fast legs: ON' : 'Fast legs: OFF'}
            variant="ghost"
            onPress={() => devToggleFastLegs(!devFastLegs)}
            style={{ marginTop: spacing.sm }}
          />

          <Text variant="caption" muted style={{ marginTop: spacing.md }}>Force daypart</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
            {(['dawn', 'day', 'dusk', 'night', null] as (Daypart | null)[]).map((p) => {
              const active = DEV_DAYPART_OVERRIDE.current === p;
              return (
                <Pressable
                  key={p ?? 'auto'}
                  onPress={() => devForceDaypart(p)}
                  style={[
                    styles.chip,
                    { borderColor: active ? colors.accent : colors.line },
                  ]}
                >
                  <Text variant="caption">{p ?? 'Auto'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="Reset all state"
            variant="danger"
            onPress={() => void resetAll()}
            style={{ marginTop: spacing.md }}
          />
        </Panel>
      ) : null}
    </ScrollView>
  );
}

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={styles.toggleRow}
    >
      <Text>{label}</Text>
      <Text style={{ color: value ? colors.ok : colors.inkMuted }}>{value ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: spacing.sm }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    backgroundColor: colors.bgPanel,
  },
});

// Keep ASPECT_IDS import referenced for tree-shaking safety in type-only files.
void ASPECT_IDS;
