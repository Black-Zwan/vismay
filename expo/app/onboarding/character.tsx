/**
 * Character pick screen. Pick 1 of 7. Plain list, no polish.
 */

import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { CHARACTERS } from '@/src/content/characters';
import { useStore } from '@/src/state/store';

export default function CharacterScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const journey = useStore((s) => s.journey);

  return (
    <View style={styles.root}>
      <Text variant="title" style={styles.title}>Choose a character</Text>
      <Text muted style={styles.sub}>Pick one. You can reset later in settings.</Text>

      <FlatList
        data={CHARACTERS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSel = selected === item.id;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(item.id)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: isSel ? colors.accent : colors.line, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: item.accentHex }]} />
              <View style={{ flex: 1 }}>
                <Text>{item.name}</Text>
                <Text variant="caption" muted>{item.blurb}</Text>
              </View>
              {isSel ? <Text style={{ color: colors.accent }}>✓</Text> : null}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={{ paddingVertical: spacing.md }}
      />

      <Button
        label="Continue"
        disabled={!selected}
        onPress={() => {
          if (!selected) return;
          // Stash selection in store journey (completeOnboarding reads it later).
          useStore.setState((s) => ({
            journey: { ...s.journey, characterId: selected },
          }));
          router.push('/onboarding/sign');
        }}
        style={styles.cta}
      />
      <Text variant="caption" muted style={styles.current}>
        {`current: ${journey.characterId}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  title: { marginBottom: spacing.xs },
  sub: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.bgPanel,
    gap: spacing.md,
  },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  cta: { marginTop: spacing.md },
  current: { marginTop: spacing.sm, textAlign: 'center' },
});
