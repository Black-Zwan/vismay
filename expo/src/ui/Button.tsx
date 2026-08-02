/**
 * Plain Button primitive. Pressable + tokens. No animations per spec.
 */

import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Text } from '@/src/ui/Text';
import { colors, radius, spacing } from '@/src/ui/tokens';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const bg =
    variant === 'ghost'
      ? 'transparent'
      : variant === 'danger'
        ? colors.danger
        : colors.accent;
  const fg = variant === 'ghost' ? colors.accent : '#FFFFFF';
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
      <Text style={{ color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
});
