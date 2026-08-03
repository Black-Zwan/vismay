import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type PropSpriteKind = 'willow' | 'wagon' | 'palm';

type PropSheet = {
  body: ImageSourcePropType;
  highlight: ImageSourcePropType;
  width: number;
  height: number;
  /** Landscape props may not consume more than this many requested heights. */
  maxWidthInHeights?: number;
};

const SHEETS: Record<PropSpriteKind, PropSheet> = {
  willow: {
    body: require('../../../assets/world/props/willow_body.png'),
    highlight: require('../../../assets/world/props/willow_highlight.png'),
    width: 781,
    height: 769,
  },
  wagon: {
    body: require('../../../assets/world/props/wagon_body.png'),
    highlight: require('../../../assets/world/props/wagon_highlight.png'),
    width: 891,
    height: 522,
    maxWidthInHeights: 1.25,
  },
  palm: {
    body: require('../../../assets/world/props/palm_body.png'),
    highlight: require('../../../assets/world/props/palm_highlight.png'),
    width: 705,
    height: 1133,
  },
};

type PropSpriteProps = {
  kind: PropSpriteKind;
  height: number;
  bodyColor: string;
  highlightColor: string;
  shadow?: boolean;
};

type WebImageStyle = ImageStyle & { imageRendering?: 'pixelated' };

const crispImageStyle: WebImageStyle = Platform.OS === 'web'
  ? { imageRendering: 'pixelated' }
  : {};

export function isPropSpriteKind(kind: string): kind is PropSpriteKind {
  return kind in SHEETS;
}

export function PropSprite({
  kind,
  height,
  bodyColor,
  highlightColor,
  shadow = true,
}: PropSpriteProps) {
  const sheet = SHEETS[kind];
  const sourceAspect = sheet.width / sheet.height;
  const cappedHeight = sheet.maxWidthInHeights
    ? Math.min(height, height * sheet.maxWidthInHeights / sourceAspect)
    : height;
  const width = cappedHeight * sourceAspect;

  return (
    <View style={{ width, height, justifyContent: 'flex-end' }}>
      {shadow ? (
        <View
          style={[
            styles.shadow,
            {
              left: width * 0.18,
              bottom: Math.max(1, height * 0.01),
              width: width * 0.64,
              height: Math.max(2, Math.min(9, height * 0.055)),
              borderRadius: width * 0.32,
            },
          ]}
        />
      ) : null}
      <Image
        source={sheet.body}
        resizeMode="stretch"
        tintColor={bodyColor}
        style={[styles.image, crispImageStyle, { width, height: cappedHeight }]}
      />
      <Image
        source={sheet.highlight}
        resizeMode="stretch"
        tintColor={highlightColor}
        style={[styles.image, crispImageStyle, { width, height: cappedHeight }]}
      />
    </View>
  );
}

export function PropSpriteQa({
  bodyColor = '#3e4e34',
  highlightColor = '#a8ac79',
}: {
  bodyColor?: string;
  highlightColor?: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaRoot}>
      {(['willow', 'wagon', 'palm'] as const).map((kind) => (
        <View key={kind} style={styles.qaColumn}>
          <Text style={styles.qaLabel}>{kind}</Text>
          <View style={styles.qaRow}>
            {[30, 55, 100, 170].map((height) => (
              <View key={height} style={styles.qaCell}>
                <View style={styles.qaSpriteFrame}>
                  <PropSprite
                    kind={kind}
                    height={height}
                    bodyColor={bodyColor}
                    highlightColor={highlightColor}
                  />
                </View>
                <Text style={styles.qaSize}>{height}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(4, 5, 12, 0.34)',
  },
  qaRoot: { gap: 28, alignItems: 'flex-end', paddingVertical: 8 },
  qaColumn: { gap: 4 },
  qaLabel: { color: '#7f739e', fontFamily: 'monospace', fontSize: 10 },
  qaRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  qaCell: { alignItems: 'center', gap: 4 },
  qaSpriteFrame: { height: 170, justifyContent: 'flex-end' },
  qaSize: { color: '#7f739e', fontFamily: 'monospace', fontSize: 9 },
});
