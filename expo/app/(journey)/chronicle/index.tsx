/**
 * Chronicle list. Shows journal entries, newest first.
 */

import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

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
          const openEntry = () => router.push(`/chronicle/${item.id}`);
          const passageProps = {
            lensLabel: `${lens?.glyph ?? ''} ${lens?.label ?? 'Lens'}`.trim(),
            cardName: card?.name ?? 'Card',
            accentHex: card?.accentHex,
            onCardPress: openEntry,
          };
          return (
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open day ${item.dayIndex}`}
                onPress={openEntry}
                style={({ pressed }) => [styles.rubric, pressed && styles.pressed]}
              >
                <Text variant="caption" muted>
                  {`Day ${item.dayIndex} · ${item.placeName ?? wm?.name ?? 'Waymark'}`}
                </Text>
              </Pressable>
              <PassageText {...passageProps} text={item.openerText} style={styles.opener} />
              <PassageText {...passageProps} text={item.answerText} variant="reading" style={styles.answer} />
              {item.departText ? (
                <Text variant="reading" muted style={styles.departure}>{item.departText}</Text>
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.ornament}>⁘</Text>
        )}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: { paddingVertical: spacing.sm },
  rubric: { alignSelf: 'flex-start', paddingVertical: 2 },
  pressed: { opacity: 0.6 },
  opener: { marginTop: spacing.xs },
  answer: { marginTop: spacing.sm },
  departure: { marginTop: spacing.sm },
  ornament: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 24,
    opacity: 0.65,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
});
