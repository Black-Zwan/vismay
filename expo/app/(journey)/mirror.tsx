/**
 * Mirror screen. Six aspects, the Record, and the Satchel.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/src/ui/Text';
import { CompactPanel, Ornament, ScreenFrame } from '@/src/ui/presentation';
import { useAccentColor } from '@/src/ui/AccentColor';
import { colors, spacing } from '@/src/ui/tokens';
import { ASPECT_LIST, getAspectTitle } from '@/src/content/aspects';
import { useStore } from '@/src/state/store';
import { getCurio } from '@/src/content/curios';
import { getCard } from '@/src/content/cards';
import { getLens } from '@/src/content/lenses';

const MIRROR_FRAMING = 'You do not choose what grows. The road weighs the question you carried, the card that answered it, and now and then its own opinion.';

export default function MirrorScreen() {
  const mirror = useStore((s) => s.mirror);
  const accent = useAccentColor();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ScreenFrame>
        <View style={styles.heading}>
          <Text variant="reading" muted style={styles.framing}>{MIRROR_FRAMING}</Text>
          <Ornament style={styles.headingOrnament} />
        </View>

        <View style={styles.section}>
          <Text variant="screenRubric" muted>Aspects</Text>
          <View style={styles.aspectList}>
          {ASPECT_LIST.map((a) => {
            const score = mirror.aspects[a.id];
            const title = getAspectTitle(a.id, score);
            return (
              <View key={a.id} style={styles.aspectRow}>
                <View style={styles.row}>
                  <View style={styles.aspectNameRow}>
                    <View style={[styles.aspectMark, { backgroundColor: accent }]} />
                    <Text variant="placeName" style={styles.aspectName}>{a.name}</Text>
                  </View>
                  <Text variant="screenRubric" muted>{score}</Text>
                </View>
                {title ? <Text variant="caption" muted>{title}</Text> : null}
              </View>
            );
          })}
          </View>
        </View>

        <Ornament style={styles.sectionOrnament} />
        <View style={styles.section}>
        <Text variant="screenRubric" muted>The Record</Text>
        <View style={styles.recordSection}>
          <Text variant="placeName" style={styles.subheading}>Questions carried</Text>
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
          <Text variant="placeName" style={styles.subheading}>Last ten pulls</Text>
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
        </View>

        <Ornament style={styles.sectionOrnament} />
        <View style={styles.section}>
        <Text variant="screenRubric" muted>The Satchel</Text>
        {mirror.satchel.length === 0 ? (
          <CompactPanel style={styles.emptySatchel}>
            <Text variant="reading" muted style={styles.emptySatchelText}>Empty.</Text>
          </CompactPanel>
        ) : (
          <View style={styles.satchelGrid}>
            {mirror.satchel.map((id) => {
              const c = getCurio(id);
              return (
                <CompactPanel key={id} style={styles.curioCard}>
                  <Text variant="placeName" style={styles.curioName}>{c?.name ?? id}</Text>
                  {c ? <Text variant="caption" muted>{c.description}</Text> : null}
                </CompactPanel>
              );
            })}
          </View>
        )}
        </View>
      </ScreenFrame>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xl * 2 },
  heading: { alignItems: 'center' },
  framing: { marginTop: spacing.sm, maxWidth: 420, textAlign: 'center' },
  headingOrnament: { marginTop: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionOrnament: { marginTop: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  aspectList: { marginTop: spacing.md, gap: spacing.sm },
  aspectRow: {
    paddingBottom: spacing.sm,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aspectNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aspectMark: { width: 4, height: 4, borderRadius: 2 },
  aspectName: { fontSize: 13, lineHeight: 19 },
  recordSection: {
    marginTop: spacing.md,
  },
  subheading: { fontSize: 13, lineHeight: 19 },
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
  emptySatchel: { marginTop: spacing.md, minHeight: 92, alignItems: 'center', justifyContent: 'center' },
  emptySatchelText: { textAlign: 'center' },
  satchelGrid: { marginTop: spacing.md, gap: spacing.sm },
  curioCard: { gap: spacing.xs },
  curioName: { fontSize: 13, lineHeight: 19 },
});
