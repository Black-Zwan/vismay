import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { DAYPARTS } from '@/src/content/dayparts';
import type { Daypart } from '@/src/core/time';
import { Text } from '@/src/ui/Text';
import { BIOMES } from '@/src/world/data';
import type { BiomeId } from '@/src/world/types';

export type ShareCardShape = 'story' | 'square';

export const SHARE_CARD_SIZE: Record<ShareCardShape, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  square: { width: 360, height: 360 },
};

type PassageShareCardProps = {
  shape: ShareCardShape;
  dayIndex: number;
  placeName: string;
  cardName: string;
  numeral: string;
  lensLabel: string;
  readingLine: string;
  accentHex: string;
  daypart: Daypart;
  biome: BiomeId;
};

export const PassageShareCard = forwardRef<View, PassageShareCardProps>(
  function PassageShareCard(
    {
      shape,
      dayIndex,
      placeName,
      cardName,
      numeral,
      lensLabel,
      readingLine,
      accentHex,
      daypart,
      biome,
    },
    ref,
  ) {
    const size = SHARE_CARD_SIZE[shape];
    const sky = DAYPARTS[daypart].sky;
    const ground = BIOMES[biome].ground;
    const compact = shape === 'square';

    return (
      <View ref={ref} collapsable={false} style={[styles.card, size]}>
        <LinearGradient colors={sky} style={StyleSheet.absoluteFillObject} />
        <View style={[styles.farGround, { backgroundColor: ground[2] }]} />
        <View style={[styles.midGround, { backgroundColor: ground[1] }]} />
        <View style={[styles.nearGround, { backgroundColor: ground[0] }]} />
        <View style={styles.texture} pointerEvents="none">
          {Array.from({ length: 42 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.grain,
                {
                  left: `${(index * 37) % 97}%`,
                  top: `${(index * 61) % 91}%`,
                  opacity: 0.05 + (index % 3) * 0.03,
                },
              ]}
            />
          ))}
        </View>

        <View style={[styles.content, compact && styles.contentCompact]}>
          <Text variant="label" style={styles.rubric}>{`Day ${dayIndex} · ${placeName}`}</Text>
          <View style={[styles.cardArt, compact && styles.cardArtCompact, { borderColor: accentHex }]}>
            <Text variant="numeral" style={{ color: accentHex }}>{numeral}</Text>
            <Text variant="title" style={styles.cardName}>{cardName}</Text>
            <Text variant="caption" style={{ color: accentHex }}>✦</Text>
          </View>
          <Text variant="label" style={[styles.lens, { color: accentHex }]}>{lensLabel}</Text>
          <Text variant="reading" style={[styles.reading, compact && styles.readingCompact]}>
            {readingLine}
          </Text>
        </View>

        <Text variant="label" style={styles.mark}>VISMAY</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#0a0812',
  },
  farGround: {
    position: 'absolute',
    right: 0,
    bottom: '27%',
    left: 0,
    height: '20%',
    opacity: 0.72,
  },
  midGround: {
    position: 'absolute',
    right: 0,
    bottom: '14%',
    left: 0,
    height: '22%',
    opacity: 0.82,
  },
  nearGround: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '25%',
  },
  texture: { ...StyleSheet.absoluteFillObject },
  grain: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#f3ebd2',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 38,
    paddingTop: 56,
  },
  contentCompact: { paddingTop: 24, paddingHorizontal: 30 },
  rubric: {
    color: '#ebe3f7',
    textAlign: 'center',
    textShadowColor: 'rgba(4, 3, 10, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardArt: {
    width: 176,
    height: 244,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34,
    borderWidth: 2,
    backgroundColor: 'rgba(10, 8, 18, 0.86)',
  },
  cardArtCompact: { width: 104, height: 132, marginTop: 12 },
  cardName: { color: '#ebe3f7', textAlign: 'center', marginHorizontal: 8 },
  lens: { marginTop: 20 },
  reading: {
    color: '#f3eef9',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(4, 3, 10, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  readingCompact: { fontSize: 14, lineHeight: 19, marginTop: 6 },
  mark: {
    position: 'absolute',
    right: 18,
    bottom: 14,
    color: 'rgba(235, 227, 247, 0.68)',
  },
});
