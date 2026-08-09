import { describe, expect, it } from 'vitest';

import { BIOMES } from '@/src/world/data';

import { SCENES } from './scenes';
import { propKindsForLayer, type PropLayer } from './propDepth';

const LAYERS: PropLayer[] = ['far', 'mid', 'near', 'foreground'];

describe('prop depth vocabulary', () => {
  it('keeps tall scenery out of the foreground road edge', () => {
    const foreground = propKindsForLayer(
      ['pine', 'willow', 'palm', 'wagon', 'stone', 'fern'],
      'foreground',
    );
    expect(foreground).toEqual(['stone', 'fern']);
  });

  it('gives every biome and rare scene a valid prop at every depth', () => {
    const vocabularies = [
      ...Object.values(BIOMES).map((biome) => biome.props),
      ...Object.values(SCENES).flatMap((scene) => scene.props ? [scene.props] : []),
    ];

    for (const vocabulary of vocabularies) {
      for (const layer of LAYERS) {
        expect(propKindsForLayer(vocabulary, layer).length).toBeGreaterThan(0);
      }
    }
  });
});
