import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { DAYPARTS } from '@/src/content/dayparts';
import { hx, mix, sink, type Rgb } from '@/src/core/color';
import type { Daypart } from '@/src/core/time';
import { BIOMES } from '@/src/world/data';
import { propsFromSeed, unitFromSeed } from '@/src/world/generator';
import type { BiomeId, WorldPropKind } from '@/src/world/types';

import { ROAD_SCROLL_PX_PER_SECOND } from './motion';

const HORIZON = 0.54;
const HORIZON_PCT = (1 - HORIZON) * 100;
const STRIP_WIDTH = 1_200;
const PALETTE_EASE_MS = 1_400;

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
};

type LayerKey = keyof typeof LAYERS;

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
};

type PropLayersProps = {
  daypart: Daypart;
  seed: number;
  biome: BiomeId;
  accentHex: string;
  tintHex?: string;
  walking: boolean;
  children: React.ReactNode;
};

export function PropLayers({
  daypart,
  seed,
  biome,
  accentHex,
  tintHex,
  walking,
  children,
}: PropLayersProps) {
  const palette = useEasedPropPalette(daypart, biome, accentHex, tintHex);

  return (
    <View style={styles.root}>
      <ParallaxBand layer="far" seed={seed} biome={biome} fill={rgbCss(palette.far)} accent={rgbCss(palette.accent)} walking={walking} />
      <ParallaxBand layer="mid" seed={seed} biome={biome} fill={rgbCss(palette.far)} accent={rgbCss(palette.accent)} walking={walking} />
      <ParallaxBand layer="near" seed={seed} biome={biome} fill={rgbCss(palette.near)} accent={rgbCss(palette.accent)} walking={walking} />
      {children}
      <ParallaxBand layer="foreground" seed={seed} biome={biome} fill={rgbCss(palette.foreground)} accent={rgbCss(palette.accent)} walking={walking} />
    </View>
  );
}

function ParallaxBand({
  layer,
  seed,
  biome,
  fill,
  accent,
  walking,
}: {
  layer: LayerKey;
  seed: number;
  biome: BiomeId;
  fill: string;
  accent: string;
  walking: boolean;
}) {
  const config = LAYERS[layer];
  const placements = useMemo(() => makeLayer(seed, biome, layer), [biome, layer, seed]);
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
            <PropArt kind={prop.kind} height={prop.height} fill={fill} accent={accent} />
          </View>
        )),
      )}
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

function makeLayer(seed: number, biome: BiomeId, layer: LayerKey): PropPlacement[] {
  const config = LAYERS[layer];
  const layerIndex = Object.keys(LAYERS).indexOf(layer);

  return Array.from({ length: config.count }, (_, index) => {
    const slot = layerIndex * 100 + index;
    const placement = propsFromSeed(seed, slot, biome);
    const random = (salt: number) => unitFromSeed(seed, slot * 11 + salt);
    const kind = placement.kind;
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
  accent,
}: {
  kind: WorldPropKind;
  height: number;
  fill: string;
  accent: string;
}) {
  if (kind === 'stone' || kind === 'boulder' || kind === 'bone') {
    return (
      <View
        style={{
          width: height * 0.55,
          height: height * 0.38,
          borderRadius: height * 0.2,
          backgroundColor: fill,
        }}
      />
    );
  }

  if (kind === 'shrine') {
    return (
      <Svg width={height * 0.72} height={height} viewBox="0 0 40 56">
        <Path d="M4 14 Q20 2 36 14 L33 18 Q20 8 7 18 Z" fill={fill} />
        <Rect x="9" y="16" width="4" height="36" fill={fill} />
        <Rect x="27" y="16" width="4" height="36" fill={fill} />
        <Circle cx="20" cy="30" r="3" fill={accent} />
      </Svg>
    );
  }

  if (kind === 'post' || kind === 'obelisk' || kind === 'spire') {
    return (
      <Svg width={height * 0.6} height={height} viewBox="0 0 30 60">
        <Rect x="13" y="6" width="4" height="54" fill={fill} />
        <Rect x="4" y="10" width="22" height="6" rx="2" fill={fill} />
        <Circle cx="15" cy="4" r="2.5" fill={accent} />
      </Svg>
    );
  }

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

  const tree = <Pine height={height} fill={fill} />;
  if (kind === 'pine' || kind === 'willow' || kind === 'deadtree') return tree;

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

function Pine({ height, fill }: { height: number; fill: string }) {
  return (
    <Svg width={height * 0.62} height={height} viewBox="0 0 62 100">
      <Path
        d="M31 2 Q44 16 35 23 Q52 32 37 41 Q56 54 39 61 Q60 76 31 81 Q2 76 23 61 Q6 54 25 41 Q10 32 27 23 Q18 16 31 2 Z"
        fill={fill}
      />
      <Path d="M29 80 L28 100 L34 100 L33 80 Z" fill={fill} opacity={0.65} />
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
  };
}

function mixPropPalette(from: PropPalette, to: PropPalette, amount: number): PropPalette {
  return {
    far: mix(from.far, to.far, amount),
    near: mix(from.near, to.near, amount),
    foreground: mix(from.foreground, to.foreground, amount),
    accent: mix(from.accent, to.accent, amount),
  };
}

function rgbCss([red, green, blue]: Rgb): string {
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
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
});
