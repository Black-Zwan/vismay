/**
 * Mirror screen. Six aspects, the Record, and the Satchel.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { ASPECT_LIST, getAspectTitle } from '@/src/content/aspects';
import { useStore } from '@/src/state/store';
import { getCurio } from '@/src/content/curios';
import { getCard } from '@/src/content/cards';
import { getLens } from '@/src/content/lenses';

const MIRROR_FRAMING = 'You do not choose what grows. The road weighs the question you carried, the card that answered it, and now and then its own opinion.';

export default function MirrorScreen() {
  const mirror = useStore((s) => s.mirror);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Panel>
        <Text variant="reading" muted>{MIRROR_FRAMING}</Text>
      </Panel>

      <Panel>
        <Text variant="label" muted>Aspects</Text>
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {ASPECT_LIST.map((a) => {
            const score = mirror.aspects[a.id];
            const title = getAspectTitle(a.id, score);
            return (
              <View key={a.id} style={styles.aspectRow}>
                <View style={styles.row}>
                  <Text>{a.name}</Text>
                  <Text muted>{score}</Text>
                </View>
                {title ? <Text variant="caption" muted>{title}</Text> : null}
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel>
        <Text variant="label" muted>The Record</Text>
        <View style={styles.recordSection}>
          <Text variant="caption" muted>Questions carried</Text>
          {mirror.lensHistory.length === 0 ? (
            <Text muted style={styles.emptyLine}>Empty.</Text>
          ) : (
            <View style={styles.historyList}>
              {[...mirror.lensHistory].reverse().map((lensId, index) => (
                <View key={`${lensId}-${index}`} style={styles.recordRow}>
                  <Text variant="caption" muted>{index + 1}</Text>
                  <Text>{getLens(lensId)?.label ?? 'Lens'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.recordSection}>
          <Text variant="caption" muted>Last ten pulls</Text>
          {mirror.recentPulls.length === 0 ? (
            <Text muted style={styles.emptyLine}>Empty.</Text>
          ) : (
            <View style={styles.historyList}>
              {mirror.recentPulls.map((pull, index) => (
                <View key={`${pull.cardId}-${pull.at}-${index}`} style={styles.recordRow}>
                  <Text>{getCard(pull.cardId)?.name ?? 'Card'}</Text>
                  <Text variant="caption" muted>{getLens(pull.lensId)?.label ?? 'Lens'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Panel>

      <Panel>
        <Text variant="label" muted>The Satchel</Text>
        {mirror.satchel.length === 0 ? (
          <Text muted style={styles.emptyLine}>Empty.</Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {mirror.satchel.map((id) => {
              const c = getCurio(id);
              return (
                <View key={id}>
                  <Text>{c?.name ?? id}</Text>
                  {c ? <Text variant="caption" muted>{c.description}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  aspectRow: {
    paddingBottom: spacing.xs,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recordSection: {
    marginTop: spacing.md,
  },
  historyList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  emptyLine: {
    marginTop: spacing.xs,
  },
});
