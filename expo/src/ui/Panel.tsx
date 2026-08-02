/**
 * Plain Panel primitive. A bordered container. No styling flourish.
 */

import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/src/ui/tokens';

export interface PanelProps extends ViewProps {
  padded?: boolean;
}

export function Panel({ padded = true, style, ...rest }: PanelProps) {
  return (
    <View
      style={[styles.base, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgPanel,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  padded: {
    padding: spacing.md,
  },
});
