import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { colors, typography } from '@/src/ui/tokens';

type Variant = keyof typeof typography;

export interface TextPropsExtended extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

export function Text({ variant = 'body', muted, style, ...rest }: TextPropsExtended) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: muted ? colors.textMuted : colors.text },
        style,
      ]}
      {...rest}
    />
  );
}
