import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { motion } from '@/src/ui/motionConfig';

export type { MotionPreference } from '@/src/ui/motionConfig';
export { motion, resolveMotionDuration } from '@/src/ui/motionConfig';

export function RiseIn({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: motion.rise,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [distance, 0],
            }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Floaty({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    offset.stopAnimation();
    offset.setValue(0);
    if (reducedMotion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(offset, {
        toValue: -5,
        duration: motion.float / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration: motion.float / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]));
    const animation = Animated.sequence([Animated.delay(1_000), loop]);
    animation.start();
    return () => animation.stop();
  }, [offset, reducedMotion]);

  return (
    <Animated.View style={[style, { transform: [{ translateY: offset }] }]}>
      {children}
    </Animated.View>
  );
}

export function FadeGlow({ accent, style }: { accent: string; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 0.42 : 0.05)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(0.42);
      return;
    }
    opacity.setValue(0.05);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 2_000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.05,
        duration: 2_000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View pointerEvents="none" style={[styles.glow, style, { opacity }]}>
      <View style={[styles.glowColor, { backgroundColor: accent }]} />
    </Animated.View>
  );
}

export function GlowPulse({
  accent,
  children,
  style,
}: {
  accent: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 0.18 : 0.08)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(0.18);
      return;
    }
    opacity.setValue(0.08);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.34,
        duration: motion.glowPulse / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.08,
        duration: motion.glowPulse / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]));
    const delayed = Animated.sequence([Animated.delay(1_000), animation]);
    delayed.start();
    return () => delayed.stop();
  }, [opacity, reducedMotion]);

  return (
    <View style={[styles.pulseRoot, style]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pulseHalo, { borderColor: accent, backgroundColor: accent, opacity }]}
      />
      {children}
    </View>
  );
}

export function ModalEnter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.modal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{
            translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Crossfade({
  identity,
  children,
  style,
}: {
  identity: string | number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.crossfade,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [identity, opacity, reducedMotion]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -42,
    right: -42,
    bottom: -42,
    left: -42,
  },
  glowColor: {
    flex: 1,
    borderRadius: 96,
    opacity: 0.16,
  },
  pulseRoot: {
    position: 'relative',
  },
  pulseHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1,
    transform: [{ scale: 1.035 }],
  },
});
