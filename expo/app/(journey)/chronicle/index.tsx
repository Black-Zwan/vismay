/**
 * Chronicle list. Shows journal entries, newest first.
 */

import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { PassageText } from '@/src/ui/PassageText';
import { colors, spacing } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { getWaymark } from '@/src/content/waymarks';
import { getLens } from '@/src/content/lenses';

export default function ChronicleScreen() {
  const chronicle = useStore((s) => s.chronicle);

  if (chronicle.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.empty}>
          <Text muted>Your chronicle is empty.</Text>
          <Text variant="caption" muted style={{ marginTop: spacing.sm }}>
            Draw a card at the next waymark to begin.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={chronicle}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const card = getCard(item.cardId);
          const wm = getWaymark(item.waymarkId);
          const lens = getLens(item.lensId);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/chronicle/${item.id}`)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Panel style={styles.row}>
                <Text variant="caption" muted>{`Day ${item.dayIndex}`}</Text>
                <Text>{wm?.name ?? 'Waymark'} — {card?.name ?? 'Card'}</Text>
                <Text variant="caption" muted style={{ marginTop: 2 }}>
                  {lens?.label ?? 'Lens'} · {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <PassageText
                  text={item.answerText}
                  lensLabel={`${lens?.glyph ?? ''} ${lens?.label ?? 'Lens'}`.trim()}
                  cardName={card?.name ?? 'Card'}
                  accentHex={card?.accentHex}
                  variant="caption"
                  muted
                  numberOfLines={2}
                  style={{ marginTop: 4 }}
                />
              </Panel>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={{ padding: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  row: { marginBottom: 0 },
});
