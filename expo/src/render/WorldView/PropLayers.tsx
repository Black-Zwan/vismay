import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';

import { DAYPARTS } from '@/src/content/dayparts';
import { hx, mix, sink, type Rgb } from '@/src/core/color';
import type { Daypart } from '@/src/core/time';
import { BIOMES } from '@/src/world/data';
import { propsFromSeed, unitFromSeed } from '@/src/world/generator';
import type { BiomeId, WorldPropKind } from '@/src/world/types';

import { ROAD_SCROLL_PX_PER_SECOND } from './motion';
import { LandmarkApproach } from './LandmarkApproach';
import { isPropSpriteKind, PropSprite, PropSpriteQa } from './PropSprite';

const HORIZON = 0.54;
const HORIZON_PCT = (1 - HORIZON) * 100;
const STRIP_WIDTH = 1_200;
const PALETTE_EASE_MS = 1_400;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const LAYERS = {
  far: {
    seed: 11.1,
    speed: 0.28,
    count: 15,
    size: [22, 36],
    bottom: [HORIZON_PCT - 1.5, HORIZON_PCT + 2],
    opacity: 0.7,
  },
  mid: {
    seed: 37.9,
    speed: 0.55,
    count: 12,
    size: [42, 68],
    bottom: [29, 38.5],
    opacity: 0.88,
  },
  near: {
    seed: 63.3,
    speed: 0.85,
    count: 10,
    size: [82, 120],
    bottom: [20.5, 26],
    opacity: 1,
  },
  foreground: {
    seed: 91.7,
    speed: 1.5,
    count: 7,
    size: [138, 200],
    bottom: [-4.5, -1],
    opacity: 0.95,
  },
} as const;

const PROP_HEIGHT_MULTIPLIER: Record<WorldPropKind, number> = {
  pine: 1,
  lantern: 0.95,
  shrine: 0.62,
  post: 0.54,
  shroom: 0.32,
  stone: 0.58,
  willow: 1,
  deadtree: 1,
  boulder: 0.7,
  bone: 0.42,
  spire: 0.7,
  obelisk: 0.7,
  palm: 1,
  wagon: 0.68,
  driftwood: 0.34,
  hull: 0.72,
  fern: 0.52,
  vine: 0.88,
};

type LayerKey = keyof typeof LAYERS;

const SWAY_DURATION_MS: Partial<Record<WorldPropKind, number>> = {
  pine: 7_000,
  willow: 6_000,
  palm: 7_000,
  fern: 5_000,
  vine: 5_000,
};

const SWAY_DEPTH: Record<LayerKey, number> = {
  far: 0.28,
  mid: 0.5,
  near: 0.75,
  foreground: 1,
};

type PropPlacement = {
  x: number;
  kind: WorldPropKind;
  height: number;
  bottom: number;
};

type PropPalette = {
  far: Rgb;
  near: Rgb;
  foreground: Rgb;
  accent: Rgb;
  highlight: Rgb;
};

type PropLayersProps = {
  daypart: Daypart;
  seed: number;
  biome: BiomeId;
  archetypeId: string;
  walkProgress: number;
  accentHex: string;
  tintHex?: string;
  walking: boolean;
  reducedMotion: boolean;
  sceneProgress: number;
  sceneProps: readonly WorldPropKind[] | null;
  children: React.ReactNode;
  cairns?: readonly { id: string; position: number }[];
  onCairnPress?: (id: string) => void;
};

export function PropLayers({
  daypart,
  seed,
  biome,
  archetypeId,
  walkProgress,
  accentHex,
  tintHex,
  walking,
  reducedMotion,
  sceneProgress,
  sceneProps,
  children,
  cairns = [],
  onCairnPress,
}: PropLayersProps) {
  const palette = useEasedPropPalette(daypart, biome, accentHex, tintHex);

  return (
    <View style={styles.root}>
      <ParallaxBand layer="far" seed={seed} biome={biome} sceneProps={sceneProps} fill={rgbCss(palette.far)} highlight={rgbCss(palette.highlight)} accent={rgbCss(palette.accent)} walking={walking && !reducedMotion} reducedMotion={reducedMotion} />
      <ParallaxBand layer="mid" seed={seed} biome={biome} sceneProps={sceneProps} fill={rgbCss(palette.far)} highlight={rgbCss(palette.highlight)} accent={rgbCss(palette.accent)} walking={walking && !reducedMotion} reducedMotion={reducedMotion} />
      <ParallaxBand layer="near" seed={seed} biome={biome} sceneProps={sceneProps} fill={rgbCss(palette.near)} highlight={rgbCss(palette.highlight)} accent={rgbCss(palette.accent)} walking={walking && !reducedMotion} reducedMotion={reducedMotion} cairns={cairns} onCairnPress={onCairnPress} />
      <LandmarkApproach
        archetypeId={archetypeId}
        walkProgress={sceneProgress}
        bodyColor={rgbCss(palette.near)}
        highlightColor={rgbCss(palette.highlight)}
        arrived={!walking}
        reducedMotion={reducedMotion}
      />
      <AmbientFireflies
        accent={rgbCss(palette.accent)}
        daypart={daypart}
        reducedMotion={reducedMotion}
        seed={seed}
      />
      {children}
      <ParallaxBand layer="foreground" seed={seed} biome={biome} sceneProps={sceneProps} fill={rgbCss(palette.foreground)} highlight={rgbCss(palette.highlight)} accent={rgbCss(palette.accent)} walking={walking && !reducedMotion} reducedMotion={reducedMotion} />
    </View>
  );
}

export function WorldPropSpriteQa({
  daypart,
  biome,
  accentHex,
}: {
  daypart: Daypart;
  biome: BiomeId;
  accentHex: string;
}) {
  const palette = makePropPalette(daypart, biome, accentHex);
  return (
    <PropSpriteQa
      bodyColor={rgbCss(palette.near)}
      highlightColor={rgbCss(palette.highlight)}
    />
  );
}

function ParallaxBand({
  layer,
  seed,
  biome,
  sceneProps,
  fill,
  highlight,
  accent,
  walking,
  reducedMotion,
  cairns = [],
  onCairnPress,
}: {
  layer: LayerKey;
  seed: number;
  biome: BiomeId;
  sceneProps: readonly WorldPropKind[] | null;
  fill: string;
  highlight: string;
  accent: string;
  walking: boolean;
  reducedMotion: boolean;
  cairns?: readonly { id: string; position: number }[];
  onCairnPress?: (id: string) => void;
}) {
  const config = LAYERS[layer];
  const placements = useMemo(
    () => makeLayer(seed, biome, layer, sceneProps),
    [biome, layer, sceneProps, seed],
  );
  const translateX = useParallaxOffset(config.speed, walking);

  return (
    <Animated.View
      style={[
        styles.band,
        {
          width: STRIP_WIDTH * 2,
          opacity: config.opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      {[0, STRIP_WIDTH].map((offset) =>
        placements.map((prop, index) => (
          <View
            key={`${offset}-${index}`}
            style={[
              styles.prop,
              { left: prop.x + offset, bottom: `${prop.bottom}%` },
            ]}
          >
            <SwayingProp
              kind={prop.kind}
              height={prop.height}
              layer={layer}
              phase={index}
              reducedMotion={reducedMotion}
            >
              <FlickeringProp kind={prop.kind} phase={index} reducedMotion={reducedMotion}>
                <PropArt kind={prop.kind} height={prop.height} fill={fill} highlight={highlight} accent={accent} sprite={layer === 'near'} />
              </FlickeringProp>
            </SwayingProp>
          </View>
        )),
      )}
      {layer === 'near' ? [0, STRIP_WIDTH].flatMap((offset) =>
        cairns.map((cairn) => (
          <Pressable
            key={`cairn-${offset}-${cairn.id}`}
            accessibilityRole="button"
            accessibilityLabel="A cairn, recently stacked"
            onPress={() => onCairnPress?.(cairn.id)}
            style={({ pressed }) => [
              styles.cairn,
              { left: cairn.position * STRIP_WIDTH + offset },
              pressed && styles.cairnPressed,
            ]}
          >
            <View style={[styles.cairnGlow, { backgroundColor: accent }]} />
            <View style={[styles.cairnStone, styles.cairnStoneTop, { backgroundColor: highlight }]} />
            <View style={[styles.cairnStone, styles.cairnStoneMiddle, { backgroundColor: fill }]} />
            <View style={[styles.cairnStone, styles.cairnStoneBase, { backgroundColor: fill }]} />
          </Pressable>
        )),
      ) : null}
    </Animated.View>
  );
}

function FlickeringProp({
  children,
  kind,
  phase,
  reducedMotion,
}: {
  children: React.ReactNode;
  kind: WorldPropKind;
  phase: number;
  reducedMotion: boolean;
}) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(reducedMotion ? 0.78 : 0.55);
    scale.setValue(1);
    if (kind !== 'lantern' || reducedMotion) return;

    const duration = [1_100, 1_600, 2_000, 2_600][phase % 4];
    const keyframes = [
      { opacity: 1, scale: 1.12, share: 0.4 },
      { opacity: 0.7, scale: 1.04, share: 0.22 },
      { opacity: 0.95, scale: 1.09, share: 0.18 },
      { opacity: 0.55, scale: 1, share: 0.2 },
    ];
    const loop = Animated.loop(Animated.sequence(keyframes.map((frame) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: frame.opacity,
          duration: duration * frame.share,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(scale, {
          toValue: frame.scale,
          duration: duration * frame.share,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    )));
    const motion = Animated.sequence([Animated.delay(phase === 0 ? 300 : 0), loop]);
    motion.start();
    return () => motion.stop();
  }, [kind, opacity, phase, reducedMotion, scale]);

  if (kind !== 'lantern') return <>{children}</>;
  return <Animated.View style={{ opacity, transform: [{ scale }] }}>{children}</Animated.View>;
}

function AmbientFireflies({
  accent,
  daypart,
  reducedMotion,
  seed,
}: {
  accent: string;
  daypart: Daypart;
  reducedMotion: boolean;
  seed: number;
}) {
  if (DAYPARTS[daypart].stars <= 0.2) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 7 }, (_, index) => (
        <Firefly
          key={index}
          accent={accent}
          delay={unitFromSeed(seed, 600 + index) * 5_000}
          driftDuration={6_000 + unitFromSeed(seed, 700 + index) * 5_000}
          glowDuration={(2 + index % 3) * 1_000}
          left={8 + unitFromSeed(seed, 800 + index) * 84}
          bottom={20 + unitFromSeed(seed, 900 + index) * 26}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}

function Firefly({
  accent,
  bottom,
  delay,
  driftDuration,
  glowDuration,
  left,
  reducedMotion,
}: {
  accent: string;
  bottom: number;
  delay: number;
  driftDuration: number;
  glowDuration: number;
  left: number;
  reducedMotion: boolean;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.05)).current;

  useEffect(() => {
    drift.stopAnimation();
    glow.stopAnimation();
    drift.setValue(0);
    glow.setValue(reducedMotion ? 0.45 : 0.05);
    if (reducedMotion) return;

    const driftLoop = Animated.loop(Animated.timing(drift, {
      toValue: 1,
      duration: driftDuration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: USE_NATIVE_DRIVER,
    }));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, {
        toValue: 0.85,
        duration: glowDuration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(glow, {
        toValue: 0.05,
        duration: glowDuration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]));
    const motion = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([driftLoop, glowLoop]),
    ]);
    motion.start();
    return () => motion.stop();
  }, [delay, drift, driftDuration, glow, glowDuration, reducedMotion]);

  const translateX = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 7, -5, 6, 0],
  });
  const translateY = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -11, -19, -8, 0],
  });

  return (
    <Animated.View style={{ position: 'absolute', left: `${left}%`, bottom: `${bottom}%`, transform: [{ translateX }, { translateY }] }}>
      <Animated.View style={[styles.fireflyGlow, { backgroundColor: accent, opacity: glow }]} />
      <Animated.View style={[styles.firefly, { backgroundColor: accent, opacity: glow }]} />
    </Animated.View>
  );
}

function SwayingProp({
  children,
  height,
  kind,
  layer,
  phase,
  reducedMotion,
}: {
  children: React.ReactNode;
  height: number;
  kind: WorldPropKind;
  layer: LayerKey;
  phase: number;
  reducedMotion: boolean;
}) {
  const sway = useRef(new Animated.Value(0)).current;
  const duration = SWAY_DURATION_MS[kind];
  const amplitude = 1.4 * SWAY_DEPTH[layer];

  useEffect(() => {
    sway.stopAnimation();
    sway.setValue(0);
    if (!duration || reducedMotion) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: duration / 4,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: duration / 4,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    const motion = Animated.sequence([
      Animated.delay(phase * 800),
      loop,
    ]);
    motion.start();
    return () => motion.stop();
  }, [duration, phase, reducedMotion, sway]);

  if (!duration || reducedMotion) return <>{children}</>;

  return (
    <Animated.View
      style={{
        height,
        transform: [
          { translateY: height / 2 },
          {
            rotate: sway.interpolate({
              inputRange: [-1, 1],
              outputRange: [`-${amplitude}deg`, `${amplitude}deg`],
            }),
          },
          { translateY: -height / 2 },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function useParallaxOffset(speed: number, walking: boolean): Animated.Value {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!walking) {
      offset.stopAnimation();
      return;
    }

    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;
    const pixelsPerSecond = ROAD_SCROLL_PX_PER_SECOND * speed;

    const run = () => {
      offset.stopAnimation((current) => {
        if (cancelled) return;
        const traveled = ((-current % STRIP_WIDTH) + STRIP_WIDTH) % STRIP_WIDTH;
        const remaining = STRIP_WIDTH - traveled;
        animation = Animated.timing(offset, {
          toValue: -STRIP_WIDTH,
          duration: (remaining / pixelsPerSecond) * 1_000,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        animation.start(({ finished }) => {
          if (!finished || cancelled) return;
          offset.setValue(0);
          run();
        });
      });
    };

    run();
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [offset, speed, walking]);

  return offset;
}

function makeLayer(
  seed: number,
  biome: BiomeId,
  layer: LayerKey,
  sceneProps: readonly WorldPropKind[] | null,
): PropPlacement[] {
  const config = LAYERS[layer];
  const layerIndex = Object.keys(LAYERS).indexOf(layer);

  return Array.from({ length: config.count }, (_, index) => {
    const slot = layerIndex * 100 + index;
    const placement = propsFromSeed(seed, slot, biome);
    const random = (salt: number) => unitFromSeed(seed, slot * 11 + salt);
    const kind = sceneProps?.[Math.floor(random(9) * sceneProps.length)] ?? placement.kind;
    const size = config.size[0] + placement.size / 1.3 * (config.size[1] - config.size[0]);

    return {
      x: (index / config.count) * STRIP_WIDTH + placement.x * (STRIP_WIDTH / config.count) * 0.7,
      kind,
      height: size * PROP_HEIGHT_MULTIPLIER[kind],
      bottom: config.bottom[0] + random(4) * (config.bottom[1] - config.bottom[0]),
    };
  });
}

function PropArt({
  kind,
  height,
  fill,
  highlight,
  accent,
  sprite,
}: {
  kind: WorldPropKind;
  height: number;
  fill: string;
  highlight: string;
  accent: string;
  sprite: boolean;
}) {
  if (sprite && isPropSpriteKind(kind)) {
    return (
      <PropSprite
        kind={kind}
        height={height}
        bodyColor={fill}
        highlightColor={highlight}
      />
    );
  }

  if (kind === 'stone' || kind === 'boulder') {
    return <Stone height={height} fill={fill} highlight={highlight} broad={kind === 'boulder'} />;
  }

  if (kind === 'bone') return <Bone height={height} fill={fill} highlight={highlight} />;

  if (kind === 'shrine') {
    return (
      <Svg width={height * 0.72} height={height} viewBox="0 0 40 56">
        <Path d="M3 14 Q20 1 37 14 L33 19 Q20 10 7 19 Z" fill={fill} />
        <Path d="M9 17 L14 17 L13 53 L8 56 Z M27 17 L32 17 L33 56 L27 53 Z" fill={fill} />
        <Path d="M13 22 Q20 18 27 22 M12 49 Q20 45 28 49" fill="none" stroke={highlight} strokeWidth="1.4" opacity={0.55} />
        <Circle cx="20" cy="31" r="6" fill={accent} opacity={0.1} />
        <Circle cx="20" cy="31" r="2.4" fill={accent} />
        <Path d="M18 31 L20 27 L22 31 L20 35 Z" fill={highlight} opacity={0.7} />
      </Svg>
    );
  }

  if (kind === 'post') return <Waypost height={height} fill={fill} highlight={highlight} accent={accent} />;
  if (kind === 'obelisk') return <Obelisk height={height} fill={fill} highlight={highlight} accent={accent} />;
  if (kind === 'spire') return <Spire height={height} fill={fill} highlight={highlight} />;
  if (kind === 'lantern') return <Lantern height={height} fill={fill} highlight={highlight} accent={accent} />;

  if (kind === 'shroom') {
    return (
      <Svg width={height * 0.9} height={height} viewBox="0 0 36 40">
        <Rect x="15" y="18" width="6" height="22" rx="2" fill={fill} />
        <Path d="M2 20 Q 18 -6 34 20 Q 18 14 2 20 Z" fill={fill} />
        <Circle cx="10" cy="14" r="1.8" fill={accent} opacity={0.85} />
        <Circle cx="22" cy="10" r="1.5" fill={accent} opacity={0.85} />
        <Circle cx="27" cy="15" r="1.2" fill={accent} opacity={0.85} />
      </Svg>
    );
  }

  const tree = <Pine height={height} fill={fill} highlight={highlight} />;
  if (kind === 'pine') return tree;
  if (kind === 'willow') return <Willow height={height} fill={fill} highlight={highlight} />;
  if (kind === 'deadtree') return <DeadTree height={height} fill={fill} highlight={highlight} />;
  if (kind === 'palm') return <Palm height={height} fill={fill} highlight={highlight} />;
  if (kind === 'wagon') {
    return <Wagon height={height} fill={fill} highlight={highlight} accent={accent} />;
  }

  if (kind === 'driftwood') {
    return (
      <Svg width={height * 1.8} height={height} viewBox="0 0 90 50">
        <Path d="M3 39 Q24 27 43 31 Q62 34 87 14 L83 24 Q63 42 40 39 Q20 36 5 47 Z" fill={fill} />
        <Path d="M42 32 Q34 17 21 11" fill="none" stroke={highlight} strokeWidth="4" />
      </Svg>
    );
  }
  if (kind === 'hull') {
    return (
      <Svg width={height * 1.25} height={height} viewBox="0 0 75 60">
        <Path d="M4 28 Q37 48 71 20 Q65 55 39 58 Q13 54 4 28 Z" fill={fill} />
        <Path d="M16 31 Q38 42 61 26 M24 37 L20 50 M43 39 L45 54" fill="none" stroke={highlight} strokeWidth="3" />
      </Svg>
    );
  }
  if (kind === 'fern') {
    return (
      <Svg width={height} height={height} viewBox="0 0 60 60">
        <Path d="M30 58 Q29 29 31 7 M30 30 Q17 20 5 23 M30 37 Q44 25 55 29 M30 44 Q17 37 8 42" fill="none" stroke={fill} strokeWidth="6" />
      </Svg>
    );
  }
  if (kind === 'vine') {
    return (
      <Svg width={height * 0.48} height={height} viewBox="0 0 30 90">
        <Path d="M12 0 Q27 18 10 35 Q-2 49 17 66 Q26 76 15 90" fill="none" stroke={fill} strokeWidth="5" />
        <Circle cx="19" cy="21" r="5" fill={highlight} /><Circle cx="8" cy="53" r="4" fill={highlight} />
      </Svg>
    );
  }

  return (
    <View style={{ width: height * 0.62, height }}>
      {tree}
      {[
        [0.2, 0.2],
        [0.38, 0.48],
        [0.14, 0.6],
      ].map(([left, top], index) => (
        <View
          key={index}
          style={[
            styles.light,
            { left: height * left, top: height * top, backgroundColor: accent },
          ]}
        />
      ))}
    </View>
  );
}

function Pine({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 0.62} height={height} viewBox="0 0 62 100">
      <Path d="M29 62 Q31 78 27 100 L36 100 Q32 78 34 61 Z" fill={fill} opacity={0.82} />
      <Path d="M31 1 Q38 12 34 19 Q45 21 53 31 Q44 31 36 35 Q51 39 59 51 Q47 49 38 55 Q55 60 61 72 Q48 69 38 76 Q51 77 57 84 Q43 81 32 89 Q23 80 5 83 Q12 74 24 69 Q13 68 1 72 Q10 59 25 54 Q17 51 6 54 Q13 41 27 35 Q21 32 11 34 Q18 22 28 19 Q24 12 31 1 Z" fill={fill} />
      <Path d="M31 9 Q27 26 30 41 Q25 56 31 81" fill="none" stroke={highlight} strokeWidth="1.8" opacity={0.5} />
      <Path d="M21 30 L31 25 L41 29 M12 50 L30 42 L50 48 M7 68 L31 58 L56 66 M12 79 L31 70 L51 78" fill="none" stroke={highlight} strokeWidth="1" opacity={0.28} />
    </Svg>
  );
}

function Willow({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 0.9} height={height} viewBox="0 0 90 100">
      <Path d="M43 48 Q48 65 38 100 L54 100 Q48 72 53 48 Z" fill={fill} opacity={0.86} />
      <Path d="M47 10 Q24 7 17 27 Q6 28 4 48 Q17 39 28 44 Q14 52 16 76 Q29 63 38 65 Q42 84 47 91 Q50 73 54 64 Q66 64 77 77 Q79 54 65 45 Q77 41 88 49 Q85 29 72 27 Q66 8 47 10 Z" fill={fill} />
      <Path d="M25 25 Q21 48 20 72 M37 17 Q34 47 34 78 M53 15 Q57 43 54 73 M67 25 Q72 45 74 69" fill="none" stroke={highlight} strokeWidth="2.2" opacity={0.44} />
      <Path d="M47 13 Q42 43 47 88" fill="none" stroke={highlight} strokeWidth="1.4" opacity={0.35} />
    </Svg>
  );
}

function DeadTree({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 0.78} height={height} viewBox="0 0 78 100">
      <Path d="M34 100 Q40 71 35 54 Q31 39 34 5 L42 4 Q40 27 44 38 Q49 30 59 17 L64 20 Q52 36 46 49 Q55 49 70 40 L73 45 Q58 57 47 60 Q50 76 52 100 Z" fill={fill} />
      <Path d="M36 48 Q25 37 11 29 L15 24 Q29 31 36 36 M35 59 Q24 59 7 50 L5 56 Q23 67 38 68 M44 39 Q47 23 45 10" fill="none" stroke={fill} strokeWidth="6" strokeLinecap="round" />
      <Path d="M39 12 Q37 40 43 58 Q46 72 45 92" fill="none" stroke={highlight} strokeWidth="1.5" opacity={0.5} />
      <Circle cx="63" cy="18" r="2" fill={highlight} opacity={0.5} />
    </Svg>
  );
}

function Palm({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 0.92} height={height} viewBox="0 0 92 100">
      <Path d="M45 100 Q38 68 51 31 L59 32 Q46 70 54 100 Z" fill={fill} />
      <Path d="M54 33 Q37 13 7 16 Q29 22 48 39 Z M55 32 Q52 9 35 1 Q43 17 50 39 Z M57 32 Q69 8 88 10 Q70 20 60 39 Z M57 34 Q80 25 92 39 Q73 35 58 42 Z M53 36 Q28 29 13 43 Q35 37 53 44 Z" fill={fill} />
      <Path d="M56 35 Q46 66 50 94 M53 31 Q34 18 13 18 M59 30 Q72 17 86 13" fill="none" stroke={highlight} strokeWidth="1.4" opacity={0.45} />
    </Svg>
  );
}

function Stone({ height, fill, highlight, broad }: { height: number; fill: string; highlight: string; broad: boolean }) {
  const width = broad ? height * 0.92 : height * 0.66;
  return (
    <Svg width={width} height={height * 0.55} viewBox="0 0 90 55">
      <Path d="M3 48 L10 23 L31 5 L66 9 L87 32 L81 51 Z" fill={fill} />
      <Polygon points="10,23 31,5 39,31 3,48" fill={highlight} opacity={0.28} />
      <Polygon points="31,5 66,9 56,31 39,31" fill={highlight} opacity={0.14} />
      <Path d="M39 31 L56 31 L81 51 M39 31 L31 5" fill="none" stroke={highlight} strokeWidth="1.2" opacity={0.38} />
      <Ellipse cx="45" cy="51" rx="40" ry="3" fill={fill} opacity={0.45} />
    </Svg>
  );
}

function Bone({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 1.1} height={height * 0.5} viewBox="0 0 80 38">
      <Path d="M13 27 Q5 31 3 24 Q1 18 8 16 Q3 9 10 6 Q17 4 20 12 L61 23 Q66 15 73 19 Q80 23 75 29 Q80 34 73 37 Q66 40 62 32 L18 22 Q19 27 13 27 Z" fill={fill} />
      <Path d="M20 14 L60 25" stroke={highlight} strokeWidth="2" opacity={0.45} />
    </Svg>
  );
}

function Waypost({ height, fill, highlight, accent }: { height: number; fill: string; highlight: string; accent: string }) {
  return (
    <Svg width={height * 0.82} height={height} viewBox="0 0 50 80">
      <Path d="M22 11 L28 10 L30 80 L20 80 Z" fill={fill} />
      <Path d="M5 16 L41 12 L48 23 L11 27 Z" fill={fill} />
      <Path d="M8 18 L39 15 M24 14 L25 76" stroke={highlight} strokeWidth="1.5" opacity={0.5} />
      <Path d="M12 31 L40 34 L34 44 L8 41 Z" fill={fill} opacity={0.92} />
      <Circle cx="25" cy="8" r="4" fill={accent} opacity={0.7} />
      <Circle cx="25" cy="8" r="8" fill={accent} opacity={0.08} />
    </Svg>
  );
}

function Lantern({ height, fill, highlight, accent }: { height: number; fill: string; highlight: string; accent: string }) {
  return (
    <Svg width={height * 0.62} height={height} viewBox="0 0 50 90">
      <Path d="M16 90 Q22 51 18 14 L25 12 Q28 49 25 90 Z" fill={fill} />
      <Path d="M20 18 Q35 7 43 18 L40 22 Q34 14 23 24" fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <Line x1="40" y1="19" x2="40" y2="30" stroke={highlight} strokeWidth="1.5" />
      <Path d="M34 30 L46 30 L48 48 L32 48 Z" fill={fill} />
      <Rect x="35" y="33" width="10" height="11" rx="2" fill={accent} opacity={0.82} />
      <Circle cx="40" cy="39" r="11" fill={accent} opacity={0.1} />
      <Path d="M20 57 Q11 64 7 73" fill="none" stroke={highlight} strokeWidth="1.2" opacity={0.45} />
    </Svg>
  );
}

function Obelisk({ height, fill, highlight, accent }: { height: number; fill: string; highlight: string; accent: string }) {
  return (
    <Svg width={height * 0.52} height={height} viewBox="0 0 42 90">
      <Polygon points="21,1 34,17 31,82 10,82 8,17" fill={fill} />
      <Polygon points="21,1 21,82 10,82 8,17" fill={highlight} opacity={0.2} />
      <Path d="M13 29 L28 29 M12 61 L30 61 M21 13 L21 75" stroke={highlight} strokeWidth="1" opacity={0.34} />
      <Path d="M17 40 L21 34 L25 40 L21 48 Z" fill={accent} opacity={0.72} />
      <Ellipse cx="21" cy="84" rx="18" ry="4" fill={fill} opacity={0.5} />
    </Svg>
  );
}

function Spire({ height, fill, highlight }: { height: number; fill: string; highlight: string }) {
  return (
    <Svg width={height * 0.7} height={height} viewBox="0 0 56 90">
      <Path d="M4 87 L18 42 L29 2 L38 47 L53 87 Z" fill={fill} />
      <Path d="M18 42 L29 2 L28 83 L4 87 Z" fill={highlight} opacity={0.22} />
      <Path d="M14 58 L28 48 L39 64 M11 76 L29 69 L46 79" fill="none" stroke={highlight} strokeWidth="1.2" opacity={0.35} />
    </Svg>
  );
}

function Wagon({ height, fill, highlight, accent }: { height: number; fill: string; highlight: string; accent: string }) {
  return (
    <Svg width={height * 1.35} height={height * 0.72} viewBox="0 0 110 62">
      <Path d="M14 14 L90 17 L98 43 L9 42 Z" fill={fill} />
      <Path d="M17 18 L87 21 M22 27 L92 29 M13 37 L96 38" stroke={highlight} strokeWidth="1.3" opacity={0.42} />
      <Circle cx="31" cy="47" r="13" fill={fill} stroke={highlight} strokeWidth="2" />
      <Circle cx="31" cy="47" r="3" fill={accent} opacity={0.7} />
      <Path d="M31 35 L31 59 M19 47 L43 47 M22 38 L40 56 M40 38 L22 56" stroke={highlight} strokeWidth="1" opacity={0.5} />
      <Path d="M93 39 L108 55 M13 41 L2 52" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <Path d="M22 14 Q25 4 31 1 M50 16 Q53 4 59 5 M75 17 Q78 8 86 7" fill="none" stroke={highlight} strokeWidth="2" opacity={0.5} />
    </Svg>
  );
}

function useEasedPropPalette(
  daypart: Daypart,
  biome: BiomeId,
  accentHex: string,
  tintHex?: string,
): PropPalette {
  const target = useMemo(
    () => makePropPalette(daypart, biome, accentHex, tintHex),
    [accentHex, biome, daypart, tintHex],
  );
  const currentRef = useRef<PropPalette>(target);
  const [current, setCurrent] = useState<PropPalette>(target);

  useEffect(() => {
    const from = currentRef.current;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / PALETTE_EASE_MS);
      const eased = Easing.inOut(Easing.ease)(progress);
      const next = mixPropPalette(from, target, eased);
      currentRef.current = next;
      setCurrent(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return current;
}

function makePropPalette(
  daypart: Daypart,
  biome: BiomeId,
  accentHex: string,
  tintHex?: string,
): PropPalette {
  const sky = DAYPARTS[daypart].sky.map(hx) as [Rgb, Rgb, Rgb];
  const tint = tintHex ? hx(tintHex) : null;
  const biomePlane = hx(BIOMES[biome].ground[1]);
  const plane = tint ? mix(biomePlane, tint, 0.32) : biomePlane;
  const tintedSky = tint ? sky.map((color) => mix(color, tint, 0.45)) as [Rgb, Rgb, Rgb] : sky;
  const far = mix(mix(tintedSky[1], plane, 0.5), tintedSky[2], 0.28);
  return {
    far,
    near: sink(plane, 0.38),
    foreground: sink(plane, 0.68),
    accent: hx(accentHex),
    highlight: mix(far, plane, 0.35),
  };
}

function mixPropPalette(from: PropPalette, to: PropPalette, amount: number): PropPalette {
  return {
    far: mix(from.far, to.far, amount),
    near: mix(from.near, to.near, amount),
    foreground: mix(from.foreground, to.foreground, amount),
    accent: mix(from.accent, to.accent, amount),
    highlight: mix(from.highlight, to.highlight, amount),
  };
}

function rgbCss([red, green, blue]: Rgb): string {
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'box-none',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'box-none',
  },
  prop: {
    position: 'absolute',
  },
  light: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  cairn: {
    alignItems: 'center',
    bottom: '30%',
    height: 54,
    justifyContent: 'flex-end',
    paddingBottom: 4,
    position: 'absolute',
    width: 54,
  },
  cairnPressed: {
    opacity: 0.68,
  },
  cairnGlow: {
    borderRadius: 24,
    bottom: 0,
    height: 42,
    opacity: 0.15,
    position: 'absolute',
    width: 42,
  },
  cairnStone: {
    borderRadius: 8,
    marginTop: -2,
  },
  cairnStoneTop: {
    height: 8,
    width: 13,
  },
  cairnStoneMiddle: {
    height: 10,
    opacity: 0.9,
    width: 21,
  },
  cairnStoneBase: {
    height: 11,
    opacity: 0.75,
    width: 29,
  },
  firefly: {
    borderRadius: 1.5,
    height: 3,
    width: 3,
  },
  fireflyGlow: {
    borderRadius: 7,
    height: 14,
    left: -5.5,
    position: 'absolute',
    top: -5.5,
    width: 14,
  },
});
