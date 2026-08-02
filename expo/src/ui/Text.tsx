/**
 * Plain Text primitive. No styling beyond tokens — design pass comes later.
 */

import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { colors, type } from '@/src/ui/tokens';

type Variant = keyof typeof type;

export interface TextPropsExtended extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

export function Text({ variant = 'body', muted, style, ...rest }: TextPropsExtended) {
  return (
    <RNText
      style={[
        type[variant],
        { color: muted ? colors.inkMuted : colors.ink },
        style,
      ]}
      {...rest}
    />
  );
}
