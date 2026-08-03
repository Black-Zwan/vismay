/**
 * One chronicle entry. Full passage text.
 */

import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { captureRef } from 'react-native-view-shot';
import { ActivityIndicator, Alert, Modal, PixelRatio, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { PassageText } from '@/src/ui/PassageText';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { daypartFromTimestamp } from '@/src/core/time';
import { passageSegments } from '@/src/core/passage';
import {
  PassageShareCard,
  SHARE_CARD_SIZE,
  type ShareCardShape,
} from '@/src/render/WorldView';
import { useStore } from '@/src/state/store';
import { getCard } from '@/src/content/cards';
import { getWaymark } from '@/src/content/waymarks';
import { getLens } from '@/src/content/lenses';
import { getCurio } from '@/src/content/curios';
import { getSign } from '@/src/content/signs';

export default function EntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useStore((s) => s.chronicle.find((e) => e.id === entryId));
  const [cardOpen, setCardOpen] = useState(false);
  const [sharing, setSharing] = useState<ShareCardShape | null>(null);
  const storyRef = useRef<View>(null);
  const squareRef = useRef<View>(null);
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
  const placeName = entry.placeName ?? wm?.name ?? 'Waymark';
  const biome = biomeFromBucket(entry.bucketKey);
  const readingLine = firstReadingLine(
    passageSegments(entry.answerText, lensLabel, cardName).map((segment) => segment.text).join(''),
  );

  const sharePassage = async (shape: ShareCardShape) => {
    const target = shape === 'story' ? storyRef.current : squareRef.current;
    if (!target || sharing) return;
    if (Platform.OS === 'web') {
      Alert.alert('Sharing unavailable', 'Passage images can be shared from the iOS or Android app.');
      return;
    }
    setSharing(shape);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const pixels = SHARE_CARD_SIZE[shape];
      const pixelRatio = PixelRatio.get();
      const uri = await captureRef(target, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080 / pixelRatio,
        height: (shape === 'story' ? 1920 : 1080) / pixelRatio,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot open a share sheet.');
        return;
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: `Share ${pixels.width === pixels.height ? 'square' : 'story'} passage`,
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (error) {
      console.warn('[Chronicle] passage share failed', error);
      Alert.alert('Could not share', 'The passage image could not be created.');
    } finally {
      setSharing(null);
    }
  };

  return (
    <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View>
        <Text variant="caption" muted>{`Day ${entry.dayIndex}`}</Text>
        <Text variant="display">{placeName}</Text>
        <Text muted style={{ marginTop: 2 }}>
          {card?.name ?? 'Card'} · {lens?.label ?? 'Lens'}
        </Text>
        <Text variant="caption" muted style={{ marginTop: 2 }}>
          {new Date(entry.createdAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="label" muted>Opener</Text>
        <PassageText
          text={entry.openerText}
          lensLabel={lensLabel}
          cardName={cardName}
          accentHex={card?.accentHex}
          style={{ marginTop: 4 }}
        />
      </View>

      <View style={styles.section}>
        <Text variant="label" muted>Answer</Text>
        <PassageText
          text={entry.answerText}
          lensLabel={lensLabel}
          cardName={cardName}
          accentHex={card?.accentHex}
          onCardPress={() => setCardOpen(true)}
          style={{ marginTop: 4 }}
        />
      </View>

      {entry.departText ? (
        <View style={styles.section}>
          <Text variant="label" muted>Departure</Text>
          <Text style={{ marginTop: 4 }}>{entry.departText}</Text>
        </View>
      ) : null}

      {entry.watchForSignId ? (
        <View style={styles.section}>
          <Text variant="label" muted>On the Road Ahead</Text>
          {entry.horoscopeText ? (
            <Text variant="reading" style={{ marginTop: 4 }}>{entry.horoscopeText}</Text>
          ) : null}
          <Text style={{ marginTop: 4 }}>
            {`${getSign(entry.watchForSignId)?.glyph ?? ''}\uFE0E ${getSign(entry.watchForSignId)?.name ?? ''}`}
          </Text>
        </View>
      ) : null}

      {entry.curioIds.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" muted>Curios gained</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {entry.curioIds.map((id) => {
              const c = getCurio(id);
              return <Text key={id}>{c?.name ?? id}</Text>;
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="label" muted>Share passage</Text>
        <View style={styles.shareActions}>
          <Button
            label={sharing === 'story' ? 'Creating…' : 'Story'}
            variant="ghost"
            disabled={sharing !== null}
            onPress={() => void sharePassage('story')}
            style={styles.shareButton}
          />
          <Button
            label={sharing === 'square' ? 'Creating…' : 'Square'}
            variant="ghost"
            disabled={sharing !== null}
            onPress={() => void sharePassage('square')}
            style={styles.shareButton}
          />
          {sharing ? <ActivityIndicator color={card?.accentHex ?? colors.text} /> : null}
        </View>
      </View>

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
              {card?.readings[entry.lensId] ?? ''}
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
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.captureStage}
      >
        <View style={styles.captureCard}>
          <PassageShareCard
            ref={storyRef}
            shape="story"
            dayIndex={entry.dayIndex}
            placeName={placeName}
            cardName={cardName}
            numeral={card?.numeral ?? ''}
            lensLabel={lensLabel}
            readingLine={readingLine}
            accentHex={card?.accentHex ?? colors.text}
            daypart={daypartFromTimestamp(entry.createdAt)}
            biome={biome}
          />
        </View>
        <View style={styles.captureCard}>
          <PassageShareCard
            ref={squareRef}
            shape="square"
            dayIndex={entry.dayIndex}
            placeName={placeName}
            cardName={cardName}
            numeral={card?.numeral ?? ''}
            lensLabel={lensLabel}
            readingLine={readingLine}
            accentHex={card?.accentHex ?? colors.text}
            daypart={daypartFromTimestamp(entry.createdAt)}
            biome={biome}
          />
        </View>
      </View>
    </View>
  );
}

function firstReadingLine(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence ?? normalized.slice(0, 180);
}

function biomeFromBucket(bucketKey?: string) {
  const biome = bucketKey?.split(':')[0];
  if (
    biome === 'pinelands'
    || biome === 'river_vale'
    || biome === 'ashen_waste'
    || biome === 'fungal_deep'
    || biome === 'high_country'
  ) return biome;
  return 'pinelands';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, zIndex: 2, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  section: { marginTop: spacing.lg },
  shareActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  shareButton: { minWidth: 104 },
  captureStage: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  captureCard: { position: 'absolute', left: 0, top: 0 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  cardModal: { borderWidth: 2 },
});
