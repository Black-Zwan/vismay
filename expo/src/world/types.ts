export type BiomeId =
  | 'pinelands'
  | 'river_vale'
  | 'ashen_waste'
  | 'fungal_deep'
  | 'high_country';

export type WorldPropKind =
  | 'pine'
  | 'stone'
  | 'post'
  | 'shrine'
  | 'willow'
  | 'lantern'
  | 'deadtree'
  | 'boulder'
  | 'bone'
  | 'shroom'
  | 'spire'
  | 'obelisk'
  | 'palm'
  | 'wagon';

export interface BiomeDefinition {
  id: BiomeId;
  props: readonly [WorldPropKind, WorldPropKind, WorldPropKind, WorldPropKind];
  adjectives: readonly string[];
  ground: readonly [string, string, string];
  path: readonly [string, string, string];
  light: number;
}

export interface ArchetypeDefinition {
  id: string;
  noun: string;
  biomes: readonly BiomeId[];
}

export interface RareLocationDefinition {
  id: string;
  name: string;
  departText: string;
}

export interface WorldPlace {
  seed: number;
  biome: BiomeId;
  archetypeId: string;
  adjectiveIndex: number;
  name: string;
  isRare: boolean;
  rareId: string | null;
  bucketKey: string;
  departText: string;
}

export interface PropPlacement {
  kind: WorldPropKind;
  x: number;
  size: number;
  depth: number;
  offset: number;
}
