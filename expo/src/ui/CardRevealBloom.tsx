import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { motion } from '@/src/ui/motionConfig';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

const MOTES = [
  { x: 28, y: 44, size: 5, delay: 0.08 },
  { x: 253, y: 62, size: 4, delay: 0.16 },
  { x: 8, y: 159, size: 3, delay: 0.22 },
  { x: 276, y: 172, size: 6, delay: 0.12 },
  { x: 40, y: 278, size: 4, delay: 0.2 },
  { x: 245, y: 298, size: 3, delay: 0.28 },
  { x: 139, y: 12, size: 3, delay: 0.32 },
  { x: 153, y: 326, size: 5, delay: 0.25 },
] as const;

/** One-shot ceremonial bloom behind the card. It rises, turns, and settles. */
export function CardRevealBloom({ accent }: { accent: string }) {
  const reducedMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const turn = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.stopAnimation();
    turn.stopAnimation();
    breathe.stopAnimation();

    if (reducedMotion) {
      reveal.setValue(1);
      turn.setValue(1);
      breathe.setValue(0.35);
      return;
    }

    reveal.setValue(0);
    turn.setValue(0);
    breathe.setValue(0);

    const entrance = Animated.sequence([
      Animated.delay(Math.max(0, motion.revealDelay - 140)),
      Animated.parallel([
        Animated.timing(reveal, {
          toValue: 1,
          duration: 1_460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(turn, {
          toValue: 1,
          duration: 2_100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(breathe, {
        toValue: 1,
        duration: 1_600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(breathe, {
        toValue: 0,
        duration: 1_600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]));

    entrance.start(({ finished }) => {
      if (finished) breathing.start();
    });
    return () => {
      entrance.stop();
      breathing.stop();
    };
  }, [breathe, reducedMotion, reveal, turn]);

  const auraOpacity = Animated.add(
    reveal.interpolate({ inputRange: [0, 0.42, 1], outputRange: [0, 0.2, 0.1] }),
    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.045] }),
  );
  const bloomScale = reveal.interpolate({ inputRange: [0, 0.48, 1], outputRange: [0.42, 1.08, 1] });
  const outerRotation = turn.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '9deg'] });
  const innerRotation = turn.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '-12deg'] });

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View
        style={[
          styles.aura,
          { backgroundColor: accent, opacity: auraOpacity, transform: [{ scale: bloomScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.rayWheel,
          {
            opacity: reveal.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.28, 0.11] }),
            transform: [{ scale: bloomScale }, { rotate: outerRotation }],
          },
        ]}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.ray,
              {
                backgroundColor: accent,
                transform: [{ rotate: `${index * 30}deg` }, { translateY: -126 }],
              },
            ]}
          />
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.outerOrbit,
          {
            borderColor: accent,
            opacity: reveal.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.48, 0.18] }),
            transform: [{ scale: bloomScale }, { rotate: outerRotation }],
          },
        ]}
      >
        <View style={[styles.orbitStar, styles.orbitStarTop, { backgroundColor: accent }]} />
        <View style={[styles.orbitStar, styles.orbitStarBottom, { backgroundColor: accent }]} />
      </Animated.View>
      <Animated.View
        style={[
          styles.innerOrbit,
          {
            borderColor: accent,
            opacity: reveal.interpolate({ inputRange: [0, 0.38, 1], outputRange: [0, 0.38, 0.14] }),
            transform: [{ scale: bloomScale }, { rotate: innerRotation }],
          },
        ]}
      />
      {MOTES.map((mote, index) => {
        const begin = mote.delay;
        return (
          <Animated.View
            key={index}
            style={[
              styles.mote,
              {
                left: mote.x,
                top: mote.y,
                width: mote.size,
                height: mote.size,
                backgroundColor: accent,
                opacity: reveal.interpolate({
                  inputRange: [0, begin, Math.min(0.92, begin + 0.24), 1],
                  outputRange: [0, 0, 0.72, 0.26],
                }),
                transform: [
                  { rotate: '45deg' },
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                  {
                    scale: reveal.interpolate({
                      inputRange: [0, begin, 1],
                      outputRange: [0.2, 0.2, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** A single foil-like pass over the revealed face, timed to the latter half of the flip. */
export function CardRevealSheen({ accent }: { accent: string }) {
  const reducedMotion = useReducedMotion();
  const sweep = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    sweep.stopAnimation();
    if (reducedMotion) {
      sweep.setValue(1);
      return;
    }
    sweep.setValue(0);
    const animation = Animated.timing(sweep, {
      toValue: 1,
      delay: motion.revealDelay + Math.round(motion.revealFlip * 0.48),
      duration: 760,
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
            opacity: sweep.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.16, 0] }),
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
    position: 'absolute',
    top: -58,
    left: -76,
    width: 300,
    height: 342,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: 236,
    height: 286,
    borderRadius: 142,
  },
  rayWheel: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 1,
    height: 34,
    borderRadius: 1,
  },
  outerOrbit: {
    position: 'absolute',
    width: 260,
    height: 300,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 150,
  },
  innerOrbit: {
    position: 'absolute',
    width: 214,
    height: 254,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 128,
  },
  orbitStar: {
    position: 'absolute',
    width: 7,
    height: 7,
    transform: [{ rotate: '45deg' }],
  },
  orbitStarTop: { top: 25, right: 25 },
  orbitStarBottom: { bottom: 25, left: 25 },
  mote: {
    position: 'absolute',
    borderRadius: 1,
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
    width: 30,
  },
});
