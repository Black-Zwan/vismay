import { getRareLocation } from '@/src/world/data';
import type { BiomeId, SceneId, WorldPropKind } from '@/src/world/types';

export const SCENE_IDS: readonly SceneId[] = [
  'default',
  'shore',
  'stillwater',
  'canyon',
  'starfall',
  'highpass',
  'saltflat',
  'span',
  'canopy',
];

export const GROUND_TEXTURE = {
  meadow: 0,
  sand: 1,
  scree: 2,
  salt: 3,
  void: 4,
  loam: 5,
  snow: 6,
} as const;

export const WATER_STYLE = {
  river: 0,
  waves: 1,
  still: 2,
} as const;

export interface SceneFrame {
  ridgeCount: number;
  ridgeAmp: number;
  ridgeRough: number;
  ridgeNearOnly: number;
  ridgeDepthOffset: number;
  waterAmount: number;
  waterFrom: number;
  waterTo: number;
  waterStyle: number;
  groundTexture: number;
  groundFog: number;
  mirror: number;
  mirrorSquash: number;
  skyCompress: number;
  hazeLift: number;
  starBoost: number;
  occludeTop: number;
  shafts: number;
  hazeTint: number;
  roadAmount: number;
  roadDeck: number;
  roadRails: number;
  groundGlow: number;
}

interface SceneDefinition extends SceneFrame {
  props: readonly [WorldPropKind, WorldPropKind, WorldPropKind, WorldPropKind] | null;
}

const DEFAULT: SceneDefinition = {
  ridgeCount: 3,
  ridgeAmp: 1,
  ridgeRough: 1,
  ridgeNearOnly: 0,
  ridgeDepthOffset: 0,
  waterAmount: 0,
  waterFrom: 0.9,
  waterTo: 1,
  waterStyle: WATER_STYLE.river,
  groundTexture: GROUND_TEXTURE.meadow,
  groundFog: 0,
  mirror: 0,
  mirrorSquash: 0.85,
  skyCompress: 1,
  hazeLift: 0,
  starBoost: 0,
  occludeTop: 0,
  shafts: 0,
  hazeTint: 0,
  roadAmount: 1,
  roadDeck: 0,
  roadRails: 0,
  groundGlow: 0,
  props: null,
};

export const SCENES: Record<SceneId, SceneDefinition> = {
  default: DEFAULT,
  shore: {
    ...DEFAULT,
    ridgeCount: 0,
    ridgeAmp: 0,
    waterAmount: 1,
    waterFrom: 0.54,
    waterTo: 0.74,
    waterStyle: WATER_STYLE.waves,
    groundTexture: GROUND_TEXTURE.sand,
    hazeLift: 0.1,
    props: ['driftwood', 'post', 'hull', 'stone'],
  },
  stillwater: {
    ...DEFAULT,
    ridgeCount: 2,
    ridgeAmp: 0.48,
    ridgeRough: 0.35,
    waterAmount: 0.92,
    waterFrom: 0.58,
    waterTo: 0.76,
    waterStyle: WATER_STYLE.still,
    hazeLift: 0.16,
    props: ['willow', 'stone', 'post', 'lantern'],
  },
  canyon: {
    ...DEFAULT,
    ridgeCount: 2,
    ridgeAmp: 3.2,
    ridgeRough: 2.4,
    ridgeNearOnly: 1,
    groundTexture: GROUND_TEXTURE.scree,
    skyCompress: 0.62,
    props: ['boulder', 'spire', 'post', 'stone'],
  },
  starfall: {
    ...DEFAULT,
    starBoost: 1.25,
    groundGlow: 1,
    props: ['stone', 'spire', 'obelisk', 'post'],
  },
  highpass: {
    ...DEFAULT,
    ridgeCount: 3,
    ridgeAmp: 2.25,
    ridgeRough: 1.65,
    ridgeNearOnly: 0.35,
    skyCompress: 0.78,
    hazeLift: 0.08,
    groundTexture: GROUND_TEXTURE.snow,
    props: ['pine', 'obelisk', 'boulder', 'shrine'],
  },
  saltflat: {
    ...DEFAULT,
    ridgeCount: 2,
    ridgeAmp: 0.55,
    ridgeRough: 0.45,
    groundTexture: GROUND_TEXTURE.salt,
    mirror: 1,
    mirrorSquash: 0.85,
    hazeLift: 0.08,
    props: ['post', 'stone', 'spire', 'bone'],
  },
  span: {
    ...DEFAULT,
    ridgeCount: 2,
    ridgeAmp: 0.7,
    ridgeRough: 0.7,
    ridgeDepthOffset: 0.22,
    groundTexture: GROUND_TEXTURE.void,
    groundFog: 0.7,
    hazeLift: 0.06,
    roadDeck: 1,
    roadRails: 1,
    props: ['post', 'obelisk', 'stone', 'lantern'],
  },
  canopy: {
    ...DEFAULT,
    ridgeCount: 1,
    ridgeAmp: 0.5,
    ridgeRough: 0.6,
    groundTexture: GROUND_TEXTURE.loam,
    occludeTop: 0.42,
    shafts: 0.6,
    hazeTint: 1,
    props: ['fern', 'vine', 'spire', 'stone'],
  },
};

export function sceneIdForRare(rareId: string | null | undefined): SceneId {
  return rareId ? getRareLocation(rareId)?.sceneId ?? 'default' : 'default';
}

/** The same smoothstep used by the landmark approach, mapped over 55–100%. */
export function sceneApproachAmount(walkProgress: number): number {
  const raw = clamp01((walkProgress - 0.55) / 0.45);
  return raw * raw * (3 - 2 * raw);
}

export function resolveSceneFrame(
  sceneId: SceneId,
  walkProgress: number,
  biome: BiomeId,
): SceneFrame {
  const amount = sceneId === 'default' ? 0 : sceneApproachAmount(walkProgress);
  const base = baseForBiome(biome);
  const target = SCENES[sceneId];
  return {
    ridgeCount: lerp(base.ridgeCount, target.ridgeCount, amount),
    ridgeAmp: lerp(base.ridgeAmp, target.ridgeAmp, amount),
    ridgeRough: lerp(base.ridgeRough, target.ridgeRough, amount),
    ridgeNearOnly: lerp(base.ridgeNearOnly, target.ridgeNearOnly, amount),
    ridgeDepthOffset: lerp(base.ridgeDepthOffset, target.ridgeDepthOffset, amount),
    waterAmount: lerp(base.waterAmount, target.waterAmount, amount),
    waterFrom: lerp(base.waterFrom, target.waterFrom, amount),
    waterTo: lerp(base.waterTo, target.waterTo, amount),
    waterStyle: amount > 0 ? target.waterStyle : base.waterStyle,
    groundTexture: amount > 0 ? target.groundTexture : base.groundTexture,
    groundFog: lerp(base.groundFog, target.groundFog, amount),
    mirror: lerp(base.mirror, target.mirror, amount),
    mirrorSquash: lerp(base.mirrorSquash, target.mirrorSquash, amount),
    skyCompress: lerp(base.skyCompress, target.skyCompress, amount),
    hazeLift: lerp(base.hazeLift, target.hazeLift, amount),
    starBoost: lerp(base.starBoost, target.starBoost, amount),
    occludeTop: lerp(base.occludeTop, target.occludeTop, amount),
    shafts: lerp(base.shafts, target.shafts, amount),
    hazeTint: lerp(base.hazeTint, target.hazeTint, amount),
    roadAmount: lerp(base.roadAmount, target.roadAmount, amount),
    roadDeck: lerp(base.roadDeck, target.roadDeck, amount),
    roadRails: lerp(base.roadRails, target.roadRails, amount),
    groundGlow: lerp(base.groundGlow, target.groundGlow, amount),
  };
}

export function sceneProps(sceneId: SceneId, walkProgress: number): readonly WorldPropKind[] | null {
  return sceneId !== 'default' && walkProgress > 0.55 ? SCENES[sceneId].props : null;
}

function baseForBiome(biome: BiomeId): SceneDefinition {
  return biome === 'river_vale'
    ? { ...DEFAULT, waterAmount: 1 }
    : DEFAULT;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
