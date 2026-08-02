/**
 * Close screen. Summary + countdown. Departing the waymark.
 * closePull consumes a banked arrival, advances the waymark, and starts the
 * next leg. Then dismiss the modal.
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
import { getWaymark } from '@/src/content/waymarks';
import { nextWaymarkIndex, waymarkAt } from '@/src/content/waymarks';

export default function CloseScreen() {
  const closePull = useStore((s) => s.closePull);
  const chronicle = useStore((s) => s.chronicle);
  const journey = useStore((s) => s.journey);

  const latest = chronicle[0];
  const card = latest ? getCard(latest.cardId) : undefined;
  const wm = latest ? getWaymark(latest.waymarkId) : undefined;
  const nextWm = waymarkAt(nextWaymarkIndex(journey.waymarkIndex));
  const remainingBanked = journey.bankedArrivals;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text variant="title">Departure</Text>

      {latest ? (
        <Panel>
          <Text variant="caption" muted>{`Day ${latest.dayIndex}`}</Text>
          <Text>{wm?.name ?? 'Waymark'} — {card?.name ?? 'Card'}</Text>
          <Text style={{ marginTop: spacing.sm }}>{latest.departText}</Text>
        </Panel>
      ) : null}

      <Panel>
        <Text variant="caption" muted>Next waymark</Text>
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
  root: { flex: 1, backgroundColor: colors.bg },
});
