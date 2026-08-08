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
  type ViewStyle,
} from 'react-native';

import { CHARACTER_WALK_FPS } from './motion';

const CELL = { width: 128, height: 176 } as const;
const ANCHOR_Y = 172;
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
  reducedMotion?: boolean;
  scale?: number;
};

type CharacterPreviewProps = {
  characterId: string;
  accentHex: string;
  fallback: React.ReactNode;
  reducedMotion?: boolean;
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
  scale,
  frameCount,
}: {
  sheet: Sheet;
  ramp: [string, string, string];
  offset: Animated.Value;
  scale: number;
  frameCount: number;
}) {
  const imageStyle = [
    styles.sheet,
    crispImageStyle,
    {
      width: CELL.width * frameCount * scale,
      height: CELL.height * scale,
      transform: [{ translateX: offset }],
    },
  ];

  return (
    <>
      <Animated.Image source={sheet.highlight} resizeMode="stretch" tintColor={ramp[0]} style={imageStyle} />
      <Animated.Image source={sheet.mid} resizeMode="stretch" tintColor={ramp[1]} style={imageStyle} />
      <Animated.Image source={sheet.shadow} resizeMode="stretch" tintColor={ramp[2]} style={imageStyle} />
    </>
  );
}

export function CharacterSprite({
  characterId,
  accentHex,
  walking,
  reducedMotion = false,
  scale = STAGE_SCALE,
}: CharacterSpriteProps) {
  const sheet = SHEETS_BY_CHARACTER[characterId];
  const frameOffset = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
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
    if (reducedMotion) {
      setTransition({ from: next, to: next });
      fade.setValue(1);
      return;
    }
    setTransition({ from, to: next });
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: ACCENT_FADE_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [accentHex, fade, reducedMotion]);

  useEffect(() => {
    if (!sheet || !walking || reducedMotion) {
      frameOffset.setValue(0);
      return;
    }

    const frameCount = inferFrameCount(sheet.base);
    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % frameCount;
      frameOffset.setValue(-frame * CELL.width * scale);
    }, 1_000 / CHARACTER_WALK_FPS);

    return () => clearInterval(timer);
  }, [frameOffset, reducedMotion, scale, sheet, walking]);

  useEffect(() => {
    bob.stopAnimation();
    tilt.stopAnimation();

    if (reducedMotion) {
      bob.setValue(0);
      tilt.setValue(0);
      return;
    }

    const distance = walking ? -3 : -4;
    const duration = walking ? 180 : 1_800;
    const startTilt = walking ? -0.6 : 0;
    const peakTilt = walking ? 0.8 : 0;
    bob.setValue(0);
    tilt.setValue(startTilt);
    const motion = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bob, {
            toValue: distance,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(tilt, {
            toValue: peakTilt,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.parallel([
          Animated.timing(bob, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(tilt, {
            toValue: startTilt,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]),
    );
    motion.start();
    return () => motion.stop();
  }, [bob, reducedMotion, tilt, walking]);

  if (!sheet) return null;

  const fromOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const frameCount = inferFrameCount(sheet.base);
  const rootStyle: ViewStyle = {
    width: CELL.width * scale,
    height: ANCHOR_Y * scale,
  };
  const sheetStyle = {
    width: CELL.width * frameCount * scale,
    height: CELL.height * scale,
  };

  return (
    <Animated.View
      style={[
        styles.root,
        rootStyle,
        {
          transform: [
            { translateY: bob },
            { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.shadow,
          {
            left: 37 * scale,
            width: 54 * scale,
            height: 10 * scale,
            borderRadius: 27 * scale,
          },
        ]}
      />
      <Animated.Image
        source={sheet.base}
        resizeMode="stretch"
        style={[
          styles.sheet,
          crispImageStyle,
          sheetStyle,
          { transform: [{ translateX: frameOffset }] },
        ]}
      />
      <Animated.View style={[styles.layer, { opacity: fromOpacity }]}>
        <AccentLayers
          sheet={sheet}
          ramp={transition.from}
          offset={frameOffset}
          scale={scale}
          frameCount={frameCount}
        />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: fade }]}>
        <AccentLayers
          sheet={sheet}
          ramp={transition.to}
          offset={frameOffset}
          scale={scale}
          frameCount={frameCount}
        />
      </Animated.View>
    </Animated.View>
  );
}

export function CharacterPreview({
  characterId,
  accentHex,
  fallback,
  reducedMotion = false,
}: CharacterPreviewProps) {
  if (!SHEETS_BY_CHARACTER[characterId]) return <>{fallback}</>;

  return (
    <CharacterSprite
      characterId={characterId}
      accentHex={accentHex}
      walking={false}
      reducedMotion={reducedMotion}
      scale={0.5}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
});
