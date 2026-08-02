/**
 * Draw screen. Tap the deck to draw a card.
 */

import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/src/ui/Text';
import { useAccentColor } from '@/src/ui/AccentColor';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';

export default function DrawScreen() {
  const drawCard = useStore((s) => s.drawCard);
  const pullDraft = useStore((s) => s.pullDraft);
  const phase = useStore((s) => s.phase);
  const accent = useAccentColor();

  if (phase !== 'draw' || !pullDraft) {
    return (
      <View style={styles.root}>
        <Text muted>Nothing to draw.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text muted style={styles.sub}>Tap the deck.</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          drawCard();
          router.push('/pull/reveal');
        }}
        style={({ pressed }) => [
          styles.deck,
          { borderColor: accent },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Text variant="label" style={{ color: accent }}>Deck</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, backgroundColor: colors.background, alignItems: 'center' },
  sub: { marginBottom: spacing.lg },
  deck: {
    width: 140,
    height: 200,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
