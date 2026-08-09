import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { rippleWindow } from '@/src/ui/cardRevealRippleTiming';
import { motion } from '@/src/ui/motionConfig';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

const RIPPLE_COUNT = 4;

/**
 * A one-shot ripple centered behind the card as the flip passes its narrowest
 * point. The card occludes the center of each ellipse, so the waves first
 * become visible as they clear its edges and continue outward. Every ring is
 * gone before the card becomes interactive.
 */
export function CardRevealRipple({ accent }: { accent: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (reducedMotion) return;

    const animation = Animated.timing(progress, {
      toValue: 1,
      delay: motion.revealDelay + Math.round(motion.revealFlip * 0.26),
      duration: 1_080,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <View pointerEvents="none" style={styles.root}>
      {Array.from({ length: RIPPLE_COUNT }, (_, index) => (
        <RippleRing
          key={index}
          accent={accent}
          index={index}
          progress={progress}
        />
      ))}
    </View>
  );
}

function RippleRing({
  accent,
  index,
  progress,
}: {
  accent: string;
  index: number;
  progress: Animated.Value;
}) {
  const window = rippleWindow(index);
  const opacity = progress.interpolate({
    inputRange: [0, window.start, window.crest, window.end, 1],
    outputRange: [0, 0, 0.46 - index * 0.055, 0, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, window.start, window.crest, window.end, 1],
    outputRange: [0.42, 0.42, 1.08, 2.48, 2.48],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: accent,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

/** A single foil-like pass over the revealed face, timed to the latter half of the flip. */
export function CardRevealSheen({ accent }: { accent: string }) {
  const reducedMotion = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sweep.stopAnimation();
    sweep.setValue(0);
    if (reducedMotion) return;
    const animation = Animated.timing(sweep, {
      toValue: 1,
      delay: motion.revealDelay + Math.round(motion.revealFlip * 0.48),
      duration: 680,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, sweep]);

  if (reducedMotion) return null;

  return (
    <View pointerEvents="none" style={styles.sheenClip}>
      <Animated.View
        style={[
          styles.sheen,
          {
            backgroundColor: accent,
            opacity: sweep.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.12, 0] }),
            transform: [
              { rotate: '16deg' },
              { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    left: -16,
    top: 72,
    width: 180,
    height: 82,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 90,
  },
  sheenClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 10,
  },
  sheen: {
    position: 'absolute',
    top: -42,
    bottom: -42,
    left: 52,
    width: 26,
  },
});
