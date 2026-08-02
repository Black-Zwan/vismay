/**
 * One chronicle entry. Full passage text.
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { getWaymark } from '@/src/content/waymarks';
import { getLens } from '@/src/content/lenses';
import { getCurio } from '@/src/content/curios';

export default function EntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useStore((s) => s.chronicle.find((e) => e.id === entryId));

  if (!entry) {
    return (
      <View style={styles.root}>
        <View style={styles.empty}>
          <Text muted>Entry not found.</Text>
        </View>
      </View>
    );
  }

  const card = getCard(entry.cardId);
  const wm = getWaymark(entry.waymarkId);
  const lens = getLens(entry.lensId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Panel>
        <Text variant="caption" muted>{`Day ${entry.dayIndex}`}</Text>
        <Text variant="title">{wm?.name ?? 'Waymark'}</Text>
        <Text muted style={{ marginTop: 2 }}>
          {card?.name ?? 'Card'} · {lens?.label ?? 'Lens'}
        </Text>
        <Text variant="caption" muted style={{ marginTop: 2 }}>
          {new Date(entry.createdAt).toLocaleString()}
        </Text>
      </Panel>

      <Panel>
        <Text variant="caption" muted>Opener</Text>
        <Text style={{ marginTop: 4 }}>{entry.openerText}</Text>
      </Panel>

      <Panel>
        <Text variant="caption" muted>Reading</Text>
        <Text style={{ marginTop: 4 }}>{entry.answerText}</Text>
      </Panel>

      <Panel>
        <Text variant="caption" muted>Departure</Text>
        <Text style={{ marginTop: 4 }}>{entry.departText}</Text>
      </Panel>

      {entry.curioIds.length > 0 ? (
        <Panel>
          <Text variant="caption" muted>Curios gained</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {entry.curioIds.map((id) => {
              const c = getCurio(id);
              return <Text key={id}>{c?.name ?? id}</Text>;
            })}
          </View>
        </Panel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
