/**
 * Sign pick screen. Pick 1 of 12 real zodiac signs. Plain grid.
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { SIGNS } from '@/src/content/signs';
import { useStore } from '@/src/state/store';

export default function SignScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const accent = useAccentColor();

  return (
    <View style={styles.root}>
      <Text variant="title" style={styles.title}>Choose a sign</Text>
      <Text muted style={styles.sub}>Your birth sign shapes the journey.</Text>

      <View style={styles.grid}>
        {SIGNS.map((s) => {
          const isSel = selected === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => setSelected(s.id)}
              style={({ pressed }) => [
                styles.cell,
                { borderColor: isSel ? accent : colors.line, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{`${s.glyph}\uFE0E`}</Text>
              <Text>{s.name}</Text>
              <Text variant="caption" muted>{s.dates}</Text>
              <Text variant="caption" muted>{s.element}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Begin"
        disabled={!selected}
        onPress={() => {
          const state = useStore.getState();
          const characterId = state.journey.characterId;
          if (!selected || !characterId) return;
          completeOnboarding(characterId, selected);
          router.replace('/(journey)/road');
        }}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cell: {
    width: '31.5%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  cta: { marginTop: spacing.lg },
});
