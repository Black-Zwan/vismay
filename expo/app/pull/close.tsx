/**
 * Close screen. Summary + countdown. Departing the waymark.
 * closePull consumes a banked arrival, advances the waymark, and starts the
 * next leg. Then dismiss the modal.
 */

import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { nextWaymarkIndex, waymarkAt } from '@/src/content/waymarks';

export default function CloseScreen() {
  const closePull = useStore((s) => s.closePull);
  const pullDraft = useStore((s) => s.pullDraft);
  const journey = useStore((s) => s.journey);

  const card = pullDraft ? getCard(pullDraft.cardId) : undefined;
  const wm = waymarkAt(journey.waymarkIndex);
  const nextWm = waymarkAt(nextWaymarkIndex(journey.waymarkIndex));
  const remainingBanked = Math.max(0, journey.bankedArrivals - 1);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text variant="title">Departure</Text>

      {pullDraft ? (
        <Panel>
          <Text variant="label" muted>{`Day ${journey.dayIndex + 1}`}</Text>
          <Text>{wm.name} — {card?.name ?? 'Card'}</Text>
          <Text style={{ marginTop: spacing.sm }}>{wm.departText}</Text>
        </Panel>
      ) : null}

      <Panel>
        <Text variant="label" muted>Next waymark</Text>
        <Text style={{ marginTop: 4 }}>{nextWm.name}</Text>
        {remainingBanked > 0 ? (
          <Text variant="caption" muted style={{ marginTop: spacing.sm }}>
            {`${remainingBanked} more draw${remainingBanked > 1 ? 's' : ''} waiting.`}
          </Text>
        ) : (
          <Text variant="caption" muted style={{ marginTop: spacing.sm }}>
            The road goes on.
          </Text>
        )}
      </Panel>

      <Button
        label="Onward"
        onPress={() => {
          closePull();
          router.dismiss();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
