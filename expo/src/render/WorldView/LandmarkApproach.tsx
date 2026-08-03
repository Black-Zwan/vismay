import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PropSprite } from './PropSprite';

const APPROACH_START = 0.55;

export function LandmarkApproach({
  archetypeId,
  walkProgress,
  bodyColor,
  highlightColor,
}: {
  archetypeId: string;
  walkProgress: number;
  bodyColor: string;
  highlightColor: string;
}) {
  if (archetypeId !== 'willow' || walkProgress < APPROACH_START) return null;

  const rawProgress = Math.min(1, (walkProgress - APPROACH_START) / (1 - APPROACH_START));
  const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
  const height = 30 + 190 * progress;
  const left = 72 - 12 * progress;
  const bottom = 43 - 21 * progress;

  return (
    <View
      style={[
        styles.root,
        {
          left: `${left}%`,
          bottom: `${bottom}%`,
          opacity: 0.15 + Math.min(0.85, rawProgress * 4),
        },
      ]}
    >
      <PropSprite
        kind="willow"
        height={height}
        bodyColor={bodyColor}
        highlightColor={highlightColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
});
