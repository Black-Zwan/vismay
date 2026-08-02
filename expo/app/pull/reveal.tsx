/**
 * Reveal screen. The card turns to show its face.
 */

import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';

export default function RevealScreen() {
  const revealCard = useStore((s) => s.revealCard);
  const pullDraft = useStore((s) => s.pullDraft);
  const phase = useStore((s) => s.phase);

  if (phase !== 'reveal' || !pullDraft) {
    return (
      <View style={styles.root}>
        <Text muted>Nothing to reveal.</Text>
      </View>
    );
  }

  const card = getCard(pullDraft.cardId);

  return (
    <View style={styles.root}>
      <Text variant="title" style={styles.title}>Your card</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          revealCard();
          router.push('/pull/reading');
        }}
        style={({ pressed }) => [
          styles.card,
          { borderColor: card?.accentHex ?? colors.textMuted },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Text variant="numeral">{card?.numeral ?? '?'}</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>{card?.name ?? 'Card'}</Text>
        <Text variant="caption" muted style={{ marginTop: spacing.xs }}>Tap to read</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, backgroundColor: colors.background, alignItems: 'center' },
  title: { marginBottom: spacing.lg },
  card: {
    width: 200,
    height: 280,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
