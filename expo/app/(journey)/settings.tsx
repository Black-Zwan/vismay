/** Settings. Player-facing preferences only; development tools are __DEV__-only. */

import { router } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text } from '@/src/ui/Text';
import { CompactPanel, ScreenFrame } from '@/src/ui/presentation';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);

  const resetJourney = () => {
    void resetAll().then(() => router.replace('/onboarding/character'));
  };

  const confirmReset = () => {
    const message = 'This clears your Chronicle and all journey progress.';

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Reset journey?\n\n${message}`)) resetJourney();
      return;
    }

    Alert.alert('Reset journey?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset journey', style: 'destructive', onPress: resetJourney },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenFrame>
      <Text variant="screenRubric" muted style={styles.sectionLabel}>Notifications</Text>
      <CompactPanel>
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
      </CompactPanel>

      <View style={styles.section}>
      <Text variant="screenRubric" muted style={styles.sectionLabel}>Journey</Text>
      <CompactPanel>
        <View style={styles.resetBlock}>
          <Text>Reset journey</Text>
          <Text variant="caption" muted>
            Erases your Chronicle and returns to character selection.
          </Text>
          <Button label="Reset journey" variant="danger" onPress={confirmReset} />
        </View>
      </CompactPanel>
      </View>
      </ScreenFrame>
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
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xl * 2 },
  section: { marginTop: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  resetBlock: {
    gap: spacing.sm,
  },
});
