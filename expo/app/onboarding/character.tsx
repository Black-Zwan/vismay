/**
 * Character pick screen. Pick 1 of 7. Plain list, no polish.
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Text } from '@/src/ui/Text';
import { Ornament, ScreenFrame } from '@/src/ui/presentation';
import { RiseIn } from '@/src/ui/motion';
import { colors, spacing } from '@/src/ui/tokens';
import { CHARACTERS } from '@/src/content/characters';
import { CharacterPreview } from '@/src/render/WorldView';
import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { useStore } from '@/src/state/store';

export default function CharacterScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  return (
    <View style={styles.root}>
      <FlatList
        data={CHARACTERS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <RiseIn style={styles.heading}>
            <Text variant="ritualTitle" style={styles.title}>Who walks the long road?</Text>
            <Ornament style={styles.headingOrnament} />
          </RiseIn>
        )}
        renderItem={({ item }) => {
          const isSel = selected === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              onPress={() => setSelected(item.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: isSel ? item.accentHex : colors.line,
                  backgroundColor: isSel ? `${item.accentHex}10` : colors.surface,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <View style={styles.preview}>
                <CharacterPreview
                  characterId={item.id}
                  accentHex={item.accentHex}
                  fallback={<View style={styles.swatch} />}
                  reducedMotion={reducedMotion}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceName}>{item.name}</Text>
                <Text variant="caption" muted>{item.blurb}</Text>
              </View>
              <View style={[styles.selectionMark, { borderColor: item.accentHex, opacity: isSel ? 1 : 0.22 }]} />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={(
          <Text variant="reading" muted style={styles.footerLine}>
            The road does not mind who walks it.
          </Text>
        )}
        contentContainerStyle={styles.listContent}
      />

      <ScreenFrame style={styles.ctaFrame}>
        <Button
          label="Continue"
          disabled={!selected}
          onPress={() => {
            if (!selected) return;
            useStore.setState((s) => ({
              journey: { ...s.journey, characterId: selected },
            }));
            router.push('/onboarding/sign');
          }}
          style={styles.cta}
        />
      </ScreenFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  heading: { alignItems: 'center', paddingBottom: spacing.lg },
  title: { textAlign: 'center' },
  headingOrnament: { marginTop: spacing.sm },
  choiceName: { letterSpacing: 2, textTransform: 'uppercase', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  preview: {
    width: 78,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectionMark: { width: 9, height: 9, borderRadius: 5, borderWidth: 1 },
  footerLine: { marginTop: spacing.lg, textAlign: 'center' },
  ctaFrame: { paddingVertical: spacing.sm, backgroundColor: colors.background },
  cta: { width: '100%' },
});
