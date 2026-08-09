import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { rippleWindow } from '@/src/ui/cardRevealRippleTiming';
import { motion } from '@/src/ui/motionConfig';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

const RIPPLE_COUNT = 3;
const STREAKS = [34, 86, 142, 196] as const;

/**
 * A one-shot wave emitted by the card's vertical edges as the flip passes its
 * narrowest point. Every visible element reaches zero opacity before the card
 * becomes interactive; the resolved card has no persistent halo.
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
      <EdgeFlare side="left" accent={accent} progress={progress} />
      <EdgeFlare side="right" accent={accent} progress={progress} />
      {(['left', 'right'] as const).map((side) => (
        <View key={side} style={[styles.emitter, side === 'left' ? styles.emitterLeft : styles.emitterRight]}>
          {Array.from({ length: RIPPLE_COUNT }, (_, index) => (
            <RippleArc
              key={index}
              accent={accent}
              index={index}
              progress={progress}
              side={side}
            />
          ))}
          {STREAKS.map((top, index) => (
            <RippleStreak
              key={top}
              accent={accent}
              index={index}
              progress={progress}
              side={side}
              top={top}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function RippleArc({
  accent,
  index,
  progress,
  side,
}: {
  accent: string;
  index: number;
  progress: Animated.Value;
  side: 'left' | 'right';
}) {
  const window = rippleWindow(index);
  const opacity = progress.interpolate({
    inputRange: [0, window.start, window.crest, window.end, 1],
    outputRange: [0, 0, 0.52 - index * 0.1, 0, 0],
  });
  const translateX = progress.interpolate({
    inputRange: [0, window.start, window.end, 1],
    outputRange: [0, 0, side === 'left' ? -62 - index * 12 : 62 + index * 12, side === 'left' ? -62 - index * 12 : 62 + index * 12],
  });
  const scaleX = progress.interpolate({
    inputRange: [0, window.start, window.end, 1],
    outputRange: [0.15, 0.15, 1.35 + index * 0.22, 1.35 + index * 0.22],
  });
  const scaleY = progress.interpolate({
    inputRange: [0, window.start, window.end, 1],
    outputRange: [0.82, 0.82, 1.08 + index * 0.07, 1.08 + index * 0.07],
  });

  return (
    <Animated.View
      style={[
        styles.arc,
        side === 'left' ? styles.arcLeft : styles.arcRight,
        {
          borderColor: accent,
          opacity,
          transform: [{ translateX }, { scaleX }, { scaleY }],
        },
      ]}
    />
  );
}

function RippleStreak({
  accent,
  index,
  progress,
  side,
  top,
}: {
  accent: string;
  index: number;
  progress: Animated.Value;
  side: 'left' | 'right';
  top: number;
}) {
  const start = 0.09 + index * 0.055;
  const crest = start + 0.18;
  const end = start + 0.46;
  const direction = side === 'left' ? -1 : 1;
  return (
    <Animated.View
      style={[
        styles.streak,
        side === 'left' ? styles.streakLeft : styles.streakRight,
        {
          top,
          backgroundColor: accent,
          opacity: progress.interpolate({
            inputRange: [0, start, crest, end, 1],
            outputRange: [0, 0, 0.38, 0, 0],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, start, end, 1],
                outputRange: [0, 0, direction * (48 + index * 7), direction * (48 + index * 7)],
              }),
            },
            {
              scaleX: progress.interpolate({
                inputRange: [0, start, crest, end, 1],
                outputRange: [0.2, 0.2, 1, 0.45, 0.45],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function EdgeFlare({
  accent,
  progress,
  side,
}: {
  accent: string;
  progress: Animated.Value;
  side: 'left' | 'right';
}) {
  return (
    <Animated.View
      style={[
        styles.edgeFlare,
        side === 'left' ? styles.edgeFlareLeft : styles.edgeFlareRight,
        {
          backgroundColor: accent,
          opacity: progress.interpolate({
            inputRange: [0, 0.04, 0.2, 0.48, 1],
            outputRange: [0, 0, 0.7, 0, 0],
          }),
          transform: [{
            scaleY: progress.interpolate({
              inputRange: [0, 0.04, 0.24, 0.48, 1],
              outputRange: [0.1, 0.1, 1, 0.72, 0.72],
            }),
          }],
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
  emitter: {
    position: 'absolute',
    top: -18,
    width: 132,
    height: 262,
    overflow: 'hidden',
  },
  emitterLeft: { right: '100%' },
  emitterRight: { left: '100%' },
  arc: {
    position: 'absolute',
    top: 15,
    width: 106,
    height: 232,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 116,
  },
  arcLeft: { right: -53 },
  arcRight: { left: -53 },
  edgeFlare: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 2,
    borderRadius: 1,
  },
  edgeFlareLeft: { left: -1 },
  edgeFlareRight: { right: -1 },
  streak: {
    position: 'absolute',
    width: 34,
    height: 1,
  },
  streakLeft: { right: 0, transformOrigin: 'right center' },
  streakRight: { left: 0, transformOrigin: 'left center' },
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
