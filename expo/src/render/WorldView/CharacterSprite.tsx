import { accentRamp, type Rgb } from '@/src/core/color';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

const CELL = { width: 128, height: 176 } as const;
const ANCHOR_Y = 172;
const WALK_FPS = 10;
const STAGE_SCALE = 1.65;
const ACCENT_FADE_MS = 1_400;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Sheet = {
  base: ImageSourcePropType;
  highlight: ImageSourcePropType;
  mid: ImageSourcePropType;
  shadow: ImageSourcePropType;
};

const ALDRIC: Sheet = {
  base: require('../../../assets/sprites/aldric_walk_base.png'),
  highlight: require('../../../assets/sprites/aldric_walk_accent_highlight.png'),
  mid: require('../../../assets/sprites/aldric_walk_accent_mid.png'),
  shadow: require('../../../assets/sprites/aldric_walk_accent_shadow.png'),
};

const LYRA: Sheet = {
  base: require('../../../assets/sprites/lyra_walk_base.png'),
  highlight: require('../../../assets/sprites/lyra_walk_accent_highlight.png'),
  mid: require('../../../assets/sprites/lyra_walk_accent_mid.png'),
  shadow: require('../../../assets/sprites/lyra_walk_accent_shadow.png'),
};

// The app's character table is still placeholder content. Keep that persisted
// contract intact while real art lands a character at a time.
const SHEETS_BY_CHARACTER: Partial<Record<string, Sheet>> = {
  wanderer: ALDRIC,
  scholar: LYRA,
};

type CharacterSpriteProps = {
  characterId: string;
  accentHex: string;
  walking: boolean;
};

type AccentTransition = {
  from: [string, string, string];
  to: [string, string, string];
};

type WebImageStyle = ImageStyle & { imageRendering?: 'pixelated' };

const crispImageStyle: WebImageStyle = Platform.OS === 'web'
  ? { imageRendering: 'pixelated' }
  : {};

function rgbToHex([r, g, b]: Rgb): string {
  const channel = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function makeRamp(accentHex: string): [string, string, string] {
  return accentRamp(accentHex).map(rgbToHex) as [string, string, string];
}

function inferFrameCount(source: ImageSourcePropType): number {
  const directWidth = typeof source === 'object' && !Array.isArray(source) && 'width' in source
    ? source.width
    : undefined;
  const resolveAssetSource = (Image as typeof Image & {
    resolveAssetSource?: (asset: ImageSourcePropType) => { width: number };
  }).resolveAssetSource;
  const width = directWidth ?? resolveAssetSource?.(source).width ?? CELL.width;
  return Math.max(1, Math.round(width / CELL.width));
}

function AccentLayers({
  sheet,
  ramp,
  offset,
}: {
  sheet: Sheet;
  ramp: [string, string, string];
  offset: Animated.Value;
}) {
  const imageStyle = [styles.sheet, crispImageStyle, { transform: [{ translateX: offset }] }];

  return (
    <>
      <Animated.Image source={sheet.highlight} resizeMode="stretch" tintColor={ramp[0]} style={imageStyle} />
      <Animated.Image source={sheet.mid} resizeMode="stretch" tintColor={ramp[1]} style={imageStyle} />
      <Animated.Image source={sheet.shadow} resizeMode="stretch" tintColor={ramp[2]} style={imageStyle} />
    </>
  );
}

export function CharacterSprite({ characterId, accentHex, walking }: CharacterSpriteProps) {
  const sheet = SHEETS_BY_CHARACTER[characterId];
  const frameOffset = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [transition, setTransition] = useState<AccentTransition>(() => {
    const ramp = makeRamp(accentHex);
    return { from: ramp, to: ramp };
  });
  const currentRampRef = useRef(transition.to);

  useEffect(() => {
    const next = makeRamp(accentHex);
    if (next.join() === currentRampRef.current.join()) return;

    const from = currentRampRef.current;
    currentRampRef.current = next;
    setTransition({ from, to: next });
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: ACCENT_FADE_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [accentHex, fade]);

  useEffect(() => {
    if (!sheet || !walking) {
      frameOffset.setValue(0);
      return;
    }

    const frameCount = inferFrameCount(sheet.base);
    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % frameCount;
      frameOffset.setValue(-frame * CELL.width * STAGE_SCALE);
    }, 1_000 / WALK_FPS);

    return () => clearInterval(timer);
  }, [frameOffset, sheet, walking]);

  useEffect(() => {
    const distance = walking ? -2 : -1;
    const duration = walking ? 180 : 1_800;
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: distance,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    motion.start();
    return () => motion.stop();
  }, [bob, walking]);

  if (!sheet) return null;

  const fromOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: bob }] }]}>
      <View style={styles.shadow} />
      <Animated.Image
        source={sheet.base}
        resizeMode="stretch"
        style={[styles.sheet, crispImageStyle, { transform: [{ translateX: frameOffset }] }]}
      />
      <Animated.View style={[styles.layer, { opacity: fromOpacity }]}>
        <AccentLayers sheet={sheet} ramp={transition.from} offset={frameOffset} />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: fade }]}>
        <AccentLayers sheet={sheet} ramp={transition.to} offset={frameOffset} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: CELL.width * STAGE_SCALE,
    height: ANCHOR_Y * STAGE_SCALE,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CELL.width * 24 * STAGE_SCALE,
    height: CELL.height * STAGE_SCALE,
  },
  shadow: {
    position: 'absolute',
    left: 37 * STAGE_SCALE,
    bottom: 0,
    width: 54 * STAGE_SCALE,
    height: 10 * STAGE_SCALE,
    borderRadius: 27 * STAGE_SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
});
