import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text } from '@/src/ui/Text';
import { colors, radius, spacing } from '@/src/ui/tokens';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const accent = useAccentColor();
  const bg =
    variant === 'ghost'
      ? 'transparent'
      : variant === 'danger'
        ? colors.danger
        : accent;
  const fg = variant === 'ghost' ? accent : colors.background;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={(pressableState) => [
        styles.base,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressableState.pressed ? 0.7 : 1,
        },
        typeof style === 'function' ? style(pressableState) : style,
      ]}
      {...rest}
    >
      <Text
        variant="label"
        style={{ color: fg, letterSpacing: variant === 'primary' ? 3 : 1.5, textAlign: 'center' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    minHeight: 44,
    justifyContent: 'center',
  },
});
