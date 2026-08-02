/**
 * Reading screen. Shows the passage text. Finishing moves to close.
 */

import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { getLens } from '@/src/content/lenses';

export default function ReadingScreen() {
  const finishReading = useStore((s) => s.finishReading);
  const pullDraft = useStore((s) => s.pullDraft);
  const phase = useStore((s) => s.phase);

  if (phase !== 'reading' || !pullDraft) {
    return (
      <View style={styles.root}>
        <Text muted>No reading available.</Text>
      </View>
    );
  }

  const card = getCard(pullDraft.cardId);
  const lens = getLens(pullDraft.lensId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text variant="title">{card?.name ?? 'Card'}</Text>
      <Text muted>{lens?.label ?? ''} · {card?.numeral ?? ''}</Text>

      <Panel>
        <Text variant="caption" muted>Opener</Text>
        <Text style={{ marginTop: 4 }}>{pullDraft.openerText}</Text>
      </Panel>

      <Panel>
        <Text variant="caption" muted>Reading</Text>
        <Text style={{ marginTop: 4 }}>{pullDraft.answerText}</Text>
      </Panel>

      <Button
        label="Continue"
        onPress={() => {
          finishReading();
          router.push('/pull/close');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
