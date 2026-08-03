/**
 * One chronicle entry. Full passage text.
 */

import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { PassageText } from '@/src/ui/PassageText';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { getWaymark } from '@/src/content/waymarks';
import { getLens } from '@/src/content/lenses';
import { getCurio } from '@/src/content/curios';

export default function EntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useStore((s) => s.chronicle.find((e) => e.id === entryId));
  const [cardOpen, setCardOpen] = useState(false);
  const reducedMotion = useReducedMotion();

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
  const lensLabel = `${lens?.glyph ?? ''} ${lens?.label ?? 'Lens'}`.trim();
  const cardName = card?.name ?? 'Card';

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Panel>
        <Text variant="caption" muted>{`Day ${entry.dayIndex}`}</Text>
        <Text variant="display">{entry.placeName ?? wm?.name ?? 'Waymark'}</Text>
        <Text muted style={{ marginTop: 2 }}>
          {card?.name ?? 'Card'} · {lens?.label ?? 'Lens'}
        </Text>
        <Text variant="caption" muted style={{ marginTop: 2 }}>
          {new Date(entry.createdAt).toLocaleString()}
        </Text>
      </Panel>

      <Panel>
        <Text variant="label" muted>Opener</Text>
        <PassageText
          text={entry.openerText}
          lensLabel={lensLabel}
          cardName={cardName}
          accentHex={card?.accentHex}
          style={{ marginTop: 4 }}
        />
      </Panel>

      <Panel>
        <Text variant="label" muted>Answer</Text>
        <PassageText
          text={entry.answerText}
          lensLabel={lensLabel}
          cardName={cardName}
          accentHex={card?.accentHex}
          onCardPress={() => setCardOpen(true)}
          style={{ marginTop: 4 }}
        />
      </Panel>

      <Panel>
        <Text variant="label" muted>Departure</Text>
        <Text style={{ marginTop: 4 }}>{entry.departText}</Text>
      </Panel>

      {entry.curioIds.length > 0 ? (
        <Panel>
          <Text variant="label" muted>Curios gained</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {entry.curioIds.map((id) => {
              const c = getCurio(id);
              return <Text key={id}>{c?.name ?? id}</Text>;
            })}
          </View>
        </Panel>
      ) : null}

      <Modal
        animationType={reducedMotion ? 'none' : 'fade'}
        transparent
        visible={cardOpen}
        onRequestClose={() => setCardOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Panel style={[styles.cardModal, { borderColor: card?.accentHex ?? colors.textMuted }]}>
            <Text variant="numeral" muted>{card?.numeral ?? ''}</Text>
            <Text variant="display">{cardName}</Text>
            <Text variant="reading" muted style={{ marginTop: spacing.xs }}>{card?.epigraph ?? ''}</Text>
            <Text variant="reading" style={{ marginTop: spacing.md }}>
              {card?.readings[entry.lensId] ?? 'TODO: copy'}
            </Text>
            <Button
              label="Close"
              variant="ghost"
              onPress={() => setCardOpen(false)}
              style={{ marginTop: spacing.md }}
            />
          </Panel>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  cardModal: { borderWidth: 2 },
});
