import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/src/ui/Text';
import { colors, radius, spacing } from '@/src/ui/tokens';

export type RitualOverlayProps = {
  children: React.ReactNode;
  alignment?: 'center' | 'lower';
  tone?: 'transparent' | 'dimmed';
  style?: StyleProp<ViewStyle>;
};

export function RitualOverlay({
  children,
  alignment = 'center',
  tone = 'dimmed',
  style,
}: RitualOverlayProps) {
  return (
    <View
      style={[
        styles.ritualOverlay,
        alignment === 'lower' && styles.ritualLower,
        tone === 'dimmed' && styles.ritualDimmed,
        style,
      ]}
    >
      {tone === 'dimmed' ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,6,14,0.9)', 'rgba(8,6,14,0.52)', 'rgba(8,6,14,0.92)']}
          locations={[0, 0.46, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

export function WorldVignette() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(8,6,14,0.64)', 'rgba(8,6,14,0)']}
        style={[styles.edge, styles.edgeTop]}
      />
      <LinearGradient
        colors={['rgba(8,6,14,0)', 'rgba(8,6,14,0.7)']}
        style={[styles.edge, styles.edgeBottom]}
      />
      <LinearGradient
        colors={['rgba(8,6,14,0.5)', 'rgba(8,6,14,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.sideEdge, styles.edgeLeft]}
      />
      <LinearGradient
        colors={['rgba(8,6,14,0)', 'rgba(8,6,14,0.5)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.sideEdge, styles.edgeRight]}
      />
    </View>
  );
}

export function Ornament({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.ornamentRow, style]}>
      <View style={styles.ornamentRule} />
      <Text variant="ornament" muted>✦</Text>
      <View style={styles.ornamentRule} />
    </View>
  );
}

export function CompactPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.compactPanel, style]}>{children}</View>;
}

export function ModalCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.modalCard, style]}>{children}</View>;
}

export function AccentFrame({
  accent,
  children,
  style,
  insetStyle,
}: {
  accent: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  insetStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.accentFrame, { borderColor: accent }, style]}>
      <View style={[styles.accentInset, { borderColor: accent }, insetStyle]}>{children}</View>
    </View>
  );
}

export function ContextAction({
  label,
  style,
  ...props
}: Omit<PressableProps, 'children'> & { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.contextAction, style, pressed && styles.pressed]}
      {...props}
    >
      <Text style={styles.contextActionText}>{label}</Text>
    </Pressable>
  );
}

export function ScreenFrame({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const horizontal = width < 360 ? 14 : spacing.lg;
  return (
    <View style={[styles.screenFrame, { paddingHorizontal: horizontal }, style]}>
      <View style={styles.screenFrameInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  ritualOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    paddingHorizontal: 28,
    paddingTop: 76,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualLower: {
    justifyContent: 'flex-end',
    paddingBottom: 88,
  },
  ritualDimmed: {
    backgroundColor: 'rgba(8, 6, 14, 0.38)',
  },
  edge: {
    position: 'absolute',
    right: 0,
    left: 0,
    height: '28%',
  },
  edgeTop: { top: 0 },
  edgeBottom: { bottom: 0 },
  sideEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '18%',
  },
  edgeLeft: { left: 0 },
  edgeRight: { right: 0 },
  ornamentRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ornamentRule: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textMuted,
  },
  compactPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(92,79,128,0.48)',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: 'rgba(10,8,18,0.8)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(17,14,28,0.96)',
  },
  accentFrame: {
    padding: 7,
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(17,14,28,0.96)',
  },
  accentInset: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  contextAction: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  contextActionText: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.textMuted,
  },
  pressed: { opacity: 0.65 },
  screenFrame: {
    width: '100%',
    alignItems: 'center',
  },
  screenFrameInner: {
    width: '100%',
    maxWidth: 560,
  },
});
