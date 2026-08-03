import type {
  ArchetypeDefinition,
  BiomeDefinition,
  BiomeId,
  RareLocationDefinition,
} from './types';

export const BIOME_IDS: readonly BiomeId[] = [
  'pinelands',
  'river_vale',
  'ashen_waste',
  'fungal_deep',
  'high_country',
];

function todoAdjectives(biome: BiomeId): string[] {
  const code: Record<BiomeId, string> = {
    pinelands: 'P',
    river_vale: 'R',
    ashen_waste: 'A',
    fungal_deep: 'F',
    high_country: 'H',
  };
  return Array.from(
    { length: 16 },
    (_, index) => `TODO ${code[biome]}${String(index + 1).padStart(2, '0')}`,
  );
}

/**
 * Palette values are implementation placeholders for visual tuning. Authored
 * names deliberately remain obvious TODOs until the owner supplies copy.
 */
export const BIOMES: Record<BiomeId, BiomeDefinition> = {
  pinelands: {
    id: 'pinelands',
    props: ['pine', 'stone', 'wagon', 'shrine'],
    adjectives: todoAdjectives('pinelands'),
    ground: ['#171d27', '#2e3840', '#59605d'],
    path: ['#292a33', '#4b4950', '#77706d'],
    light: 0.86,
  },
  river_vale: {
    id: 'river_vale',
    props: ['willow', 'stone', 'wagon', 'lantern'],
    adjectives: todoAdjectives('river_vale'),
    ground: ['#13232b', '#29444c', '#527076'],
    path: ['#27343d', '#52626a', '#7b8587'],
    light: 0.92,
  },
  ashen_waste: {
    id: 'ashen_waste',
    props: ['palm', 'boulder', 'post', 'bone'],
    adjectives: todoAdjectives('ashen_waste'),
    ground: ['#24191c', '#493335', '#75524b'],
    path: ['#33282a', '#604b49', '#8d7068'],
    light: 0.78,
  },
  fungal_deep: {
    id: 'fungal_deep',
    props: ['shroom', 'stone', 'lantern', 'spire'],
    adjectives: todoAdjectives('fungal_deep'),
    ground: ['#181426', '#342c49', '#5e4d6b'],
    path: ['#282238', '#514660', '#7e6c86'],
    light: 0.72,
  },
  high_country: {
    id: 'high_country',
    props: ['pine', 'obelisk', 'boulder', 'shrine'],
    adjectives: todoAdjectives('high_country'),
    ground: ['#1d222b', '#3c444e', '#697079'],
    path: ['#30343d', '#5d6068', '#8a898d'],
    light: 1,
  },
};

// Nouns reuse owner-authored waymark vocabulary already present in the repo.
export const ARCHETYPES: readonly ArchetypeDefinition[] = [
  { id: 'pines', noun: 'Pines', biomes: ['pinelands', 'high_country'] },
  { id: 'shrine', noun: 'Shrine', biomes: ['pinelands', 'river_vale'] },
  { id: 'crossing', noun: 'Crossing', biomes: ['river_vale', 'high_country'] },
  { id: 'stones', noun: 'Stones', biomes: ['pinelands', 'ashen_waste'] },
  { id: 'tree', noun: 'Tree', biomes: ['river_vale', 'fungal_deep'] },
  { id: 'church', noun: 'Church', biomes: ['high_country', 'ashen_waste'] },
  { id: 'gate', noun: 'Gate', biomes: ['ashen_waste', 'high_country'] },
  { id: 'bell', noun: 'Bell', biomes: ['river_vale', 'ashen_waste'] },
  { id: 'willow', noun: 'Willow', biomes: ['river_vale', 'fungal_deep'] },
  { id: 'camp', noun: 'Camp', biomes: ['pinelands', 'ashen_waste'] },
  { id: 'watchtower', noun: 'Watchtower', biomes: ['high_country', 'pinelands'] },
  { id: 'hollow', noun: 'Hollow', biomes: ['fungal_deep', 'pinelands'] },
  { id: 'waymark', noun: 'Waymark', biomes: ['fungal_deep'] },
];

export const RARE_LOCATIONS: readonly RareLocationDefinition[] = [
  {
    id: 'vansh_sea',
    name: 'the Vansh Sea',
    departText: 'TODO: copy',
    sceneId: 'shore',
    biome: 'river_vale',
    archetypeId: 'crossing',
  },
  {
    id: 'gardner_lake',
    name: 'Gardner Lake',
    departText: 'TODO: copy',
    sceneId: 'stillwater',
    biome: 'river_vale',
    archetypeId: 'willow',
  },
  {
    id: 'rare_canyon',
    name: 'TODO: rare canyon name',
    departText: 'TODO: copy',
    sceneId: 'canyon',
    biome: 'ashen_waste',
    archetypeId: 'gate',
  },
  {
    id: 'nova_reach',
    name: 'Nova Reach',
    departText: 'TODO: copy',
    sceneId: 'starfall',
    biome: 'high_country',
    archetypeId: 'watchtower',
  },
  {
    id: 'rare_highpass',
    name: 'TODO: rare high-pass name',
    departText: 'TODO: copy',
    sceneId: 'highpass',
    biome: 'high_country',
    archetypeId: 'crossing',
  },
  {
    id: 'rare_saltflat',
    name: 'TODO: rare salt-flat name',
    departText: 'TODO: copy',
    sceneId: 'saltflat',
    biome: 'ashen_waste',
    archetypeId: 'stones',
  },
  {
    id: 'rare_span',
    name: 'TODO: rare span name',
    departText: 'TODO: copy',
    sceneId: 'span',
    biome: 'high_country',
    archetypeId: 'watchtower',
  },
  {
    id: 'rare_canopy',
    name: 'TODO: rare canopy name',
    departText: 'TODO: copy',
    sceneId: 'canopy',
    biome: 'fungal_deep',
    archetypeId: 'hollow',
  },
];

export function getRareLocation(id: string): RareLocationDefinition | undefined {
  return RARE_LOCATIONS.find((location) => location.id === id);
}
