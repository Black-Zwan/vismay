/**
 * Chronicle list. Shows journal entries, newest first.
 */

import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/src/ui/Text';
import { PassageText } from '@/src/ui/PassageText';
import { Ornament, ScreenFrame } from '@/src/ui/presentation';
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
          <Text variant="title" style={styles.emptyTitle}>The Wanderer&apos;s Chronicle</Text>
          <Text variant="ritualTitle">Your chronicle is empty.</Text>
          <Ornament style={styles.emptyOrnament} />
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
        ListHeaderComponent={(
          <View style={styles.heading}>
            <Text variant="title" style={styles.headingTitle}>The Wanderer&apos;s Chronicle</Text>
            <Text variant="reading" muted style={styles.headingSubtitle}>
              A campaign written one day at a time
            </Text>
            <Ornament style={styles.headingOrnament} />
          </View>
        )}
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
            <ScreenFrame style={styles.rowFrame}>
              <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open day ${item.dayIndex}`}
                onPress={openEntry}
                style={({ pressed }) => [styles.rubric, pressed && styles.pressed]}
              >
                <Text variant="screenRubric" muted>
                  {`Day ${item.dayIndex}`}
                </Text>
                <Text variant="placeName" style={[styles.place, { color: card?.accentHex }]}>
                  {item.placeName ?? wm?.name ?? 'Waymark'}
                </Text>
              </Pressable>
              <PassageText {...passageProps} text={item.openerText} variant="passageLead" dropCap style={styles.opener} />
              <PassageText {...passageProps} text={item.answerText} variant="passage" style={styles.answer} />
              {item.departText ? (
                <Text variant="reading" muted style={styles.departure}>{item.departText}</Text>
              ) : null}
              </View>
            </ScreenFrame>
          );
        }}
        ItemSeparatorComponent={() => <Ornament style={styles.entryOrnament} />}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { marginBottom: spacing.md, fontSize: 18, textAlign: 'center' },
  content: { paddingBottom: spacing.xl * 2 },
  heading: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headingTitle: { fontSize: 18, textAlign: 'center' },
  headingSubtitle: { marginTop: 2, fontSize: 13, textAlign: 'center' },
  headingOrnament: { marginTop: spacing.sm },
  emptyOrnament: { marginTop: spacing.sm },
  rowFrame: { paddingVertical: spacing.sm },
  row: { width: '100%' },
  rubric: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  place: { marginTop: 1 },
  pressed: { opacity: 0.6 },
  opener: { marginTop: spacing.sm },
  answer: { marginTop: spacing.md },
  departure: { marginTop: spacing.md, lineHeight: 26 },
  entryOrnament: { marginVertical: spacing.md },
});
