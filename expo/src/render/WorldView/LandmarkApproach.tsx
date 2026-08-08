import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

import { PropSprite } from './PropSprite';

const APPROACH_START = 0.55;

export function LandmarkApproach({
  archetypeId,
  walkProgress,
  bodyColor,
  highlightColor,
  arrived,
  reducedMotion,
}: {
  archetypeId: string;
  walkProgress: number;
  bodyColor: string;
  highlightColor: string;
  arrived: boolean;
  reducedMotion: boolean;
}) {
  const arrival = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    arrival.stopAnimation();
    if (!arrived || reducedMotion) {
      arrival.setValue(1);
      return;
    }
    arrival.setValue(0);
    const motion = Animated.timing(arrival, {
      toValue: 1,
      duration: 2_200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    motion.start();
    return () => motion.stop();
  }, [arrival, arrived, reducedMotion]);

  if (archetypeId !== 'willow' || walkProgress < APPROACH_START) return null;

  const rawProgress = Math.min(1, (walkProgress - APPROACH_START) / (1 - APPROACH_START));
  const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
  const height = 30 + 190 * progress;
  const left = 72 - 12 * progress;
  const bottom = 43 - 21 * progress;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          left: `${left}%`,
          bottom: `${bottom}%`,
          opacity: 0.15 + Math.min(0.85, rawProgress * 4),
        },
      ]}
    >
      <Animated.View
        style={{
          opacity: arrival.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
          transform: [
            { translateX: arrival.interpolate({ inputRange: [0, 1], outputRange: [95, 0] }) },
            { translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
            { scale: arrival.interpolate({ inputRange: [0, 1], outputRange: [0.52, 1] }) },
          ],
        }}
      >
        <PropSprite
          kind="willow"
          height={height}
          bodyColor={bodyColor}
          highlightColor={highlightColor}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
  },
});
