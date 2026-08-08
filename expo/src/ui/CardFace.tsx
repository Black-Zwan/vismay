import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { CardEntry } from '@/src/content/types';
import { resolveCardArtworkKind } from '@/src/ui/cardArtwork';
import { AccentFrame } from '@/src/ui/presentation';
import { Text } from '@/src/ui/Text';
import { colors, radius, spacing } from '@/src/ui/tokens';

export type CardArtworkSource =
  | { kind: 'emblem'; cardId: string }
  | { kind: 'image'; source: ImageSourcePropType };

export type CardFaceProps = {
  card: CardEntry;
  artwork?: CardArtworkSource;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CardFace({ card, artwork, compact = false, style }: CardFaceProps) {
  const resolved = artwork ?? { kind: 'emblem' as const, cardId: card.id };
  return (
    <AccentFrame
      accent={card.accentHex}
      style={[styles.frame, compact && styles.frameCompact, style]}
      insetStyle={styles.inset}
    >
      <View style={styles.inner}>
        <Text
          variant="screenRubric"
          style={[styles.numeral, compact && styles.numeralCompact, { color: card.accentHex }]}
        >
          {card.numeral}
        </Text>
        <View style={[styles.artwork, compact && styles.artworkCompact]}>
          <View style={[styles.artworkGlow, { backgroundColor: card.accentHex }]} />
          {resolveCardArtworkKind(resolved) === 'image' && resolved.kind === 'image' ? (
            <Image source={resolved.source} resizeMode="contain" style={styles.image} />
          ) : (
            <ProceduralEmblem
              cardId={resolved.kind === 'emblem' ? resolved.cardId : card.id}
              color={card.accentHex}
            />
          )}
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>
            {card.name}
          </Text>
          <Text variant="ornament" style={[styles.stars, { color: card.accentHex }]}>✦ · ✦</Text>
        </View>
      </View>
    </AccentFrame>
  );
}

export function CardBack({ accent, style }: { accent: string; style?: StyleProp<ViewStyle> }) {
  return (
    <AccentFrame accent={accent} style={[styles.frame, style]} insetStyle={styles.backInset}>
      <View style={styles.backInner}>
        <CornerMarks accent={accent} />
        <View style={[styles.backDiamond, { borderColor: accent }]}>
          <View style={[styles.backDiamondInner, { borderColor: accent }]}>
            <Text variant="numeral" style={{ color: accent }}>✦</Text>
          </View>
        </View>
      </View>
    </AccentFrame>
  );
}

function ProceduralEmblem({ cardId, color }: { cardId: string; color: string }) {
  const hash = hashString(cardId);
  const spokes = 5 + (hash % 4);
  const inner = 15 + (hash % 8);
  const sweep = 22 + (hash % 16);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="38" stroke={color} strokeOpacity={0.28} strokeWidth="1" fill="none" />
      <Circle cx="50" cy="50" r={inner} stroke={color} strokeWidth="1.5" fill="none" />
      {Array.from({ length: spokes }, (_, index) => {
        const angle = (Math.PI * 2 * index) / spokes + (hash % 11) * 0.03;
        const x1 = 50 + Math.cos(angle) * (inner + 5);
        const y1 = 50 + Math.sin(angle) * (inner + 5);
        const x2 = 50 + Math.cos(angle) * sweep;
        const y2 = 50 + Math.sin(angle) * sweep;
        return (
          <Line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={index % 2 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}
      <Path
        d={`M 26 ${44 + (hash % 9)} Q 50 ${20 + (hash % 13)} 74 ${44 + (hash % 9)} Q 50 ${78 - (hash % 10)} 26 ${44 + (hash % 9)} Z`}
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={color}
        fillOpacity={0.07}
      />
      <Circle cx="50" cy="50" r="3" fill={color} />
    </Svg>
  );
}

function CornerMarks({ accent }: { accent: string }) {
  return (
    <>
      <Text style={[styles.corner, styles.cornerTopLeft, { color: accent }]}>⌜</Text>
      <Text style={[styles.corner, styles.cornerTopRight, { color: accent }]}>⌝</Text>
      <Text style={[styles.corner, styles.cornerBottomLeft, { color: accent }]}>⌞</Text>
      <Text style={[styles.corner, styles.cornerBottomRight, { color: accent }]}>⌟</Text>
    </>
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const styles = StyleSheet.create({
  frame: {
    width: 148,
    height: 226,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.52,
    shadowRadius: 24,
    elevation: 12,
  },
  frameCompact: {
    width: 104,
    height: 156,
    padding: 5,
    shadowOpacity: 0.32,
    shadowRadius: 12,
  },
  inset: {
    backgroundColor: 'rgba(12,9,21,0.98)',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  numeral: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 3,
  },
  numeralCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
  artwork: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkCompact: {
    width: 70,
    height: 70,
  },
  artworkGlow: {
    position: 'absolute',
    width: '82%',
    height: '82%',
    borderRadius: 60,
    opacity: 0.1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  titleBlock: {
    alignItems: 'center',
    minHeight: 42,
  },
  name: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  nameCompact: {
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 1,
  },
  stars: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 10,
  },
  backInset: {
    backgroundColor: '#100c1c',
  },
  backInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(197,138,232,0.035)',
  },
  backDiamond: {
    width: 82,
    height: 82,
    padding: 8,
    transform: [{ rotate: '45deg' }],
    borderWidth: StyleSheet.hairlineWidth,
  },
  backDiamondInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  corner: {
    position: 'absolute',
    fontSize: 20,
    opacity: 0.6,
  },
  cornerTopLeft: { top: 10, left: 10 },
  cornerTopRight: { top: 10, right: 10 },
  cornerBottomLeft: { bottom: 10, left: 10 },
  cornerBottomRight: { right: 10, bottom: 10 },
});
