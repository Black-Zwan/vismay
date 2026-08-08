/**
 * Sign pick screen. Pick 1 of 12 real zodiac signs. Plain grid.
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text } from '@/src/ui/Text';
import { ContextAction, Ornament, ScreenFrame } from '@/src/ui/presentation';
import { RiseIn } from '@/src/ui/motion';
import { colors, spacing } from '@/src/ui/tokens';
import { SIGNS } from '@/src/content/signs';
import { useStore } from '@/src/state/store';

export default function SignScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const accent = useAccentColor();

  return (
    <View style={styles.root}>
      <View style={styles.backRow}>
        <ContextAction label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RiseIn style={styles.heading}>
          <Text variant="ritualTitle" style={styles.title}>Choose your birth sign</Text>
          <Text variant="reading" muted style={styles.sub}>Your birth sign shapes the journey.</Text>
          <Ornament style={styles.headingOrnament} />
        </RiseIn>

      <RiseIn delay={150} style={styles.grid}>
        {SIGNS.map((s) => {
          const isSel = selected === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              onPress={() => setSelected(s.id)}
              style={({ pressed }) => [
                styles.cell,
                { borderColor: isSel ? accent : colors.line, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{`${s.glyph}\uFE0E`}</Text>
              <Text style={styles.signName}>{s.name}</Text>
              <Text variant="caption" muted>{s.dates}</Text>
              <Text variant="caption" muted>{s.element}</Text>
            </Pressable>
          );
        })}
      </RiseIn>
      </ScrollView>

      <ScreenFrame style={styles.ctaFrame}>
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
      </ScreenFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backRow: { minHeight: 54, paddingHorizontal: spacing.md, alignItems: 'flex-start' },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  heading: { alignItems: 'center', paddingBottom: spacing.lg },
  title: { textAlign: 'center' },
  sub: { marginTop: spacing.xs, textAlign: 'center' },
  headingOrnament: { marginTop: spacing.sm },
  signName: { fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
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
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  ctaFrame: { paddingVertical: spacing.sm, backgroundColor: colors.background },
  cta: { width: '100%' },
});
