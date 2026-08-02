/**
 * Settings. Notification toggles + dev panel (behind settings.devMode).
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
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

    </ScrollView>
  );
}

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  const accent = useAccentColor();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={styles.toggleRow}
    >
      <Text>{label}</Text>
      <Text variant="label" style={{ color: value ? accent : colors.textMuted }}>{value ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: spacing.sm }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
});
