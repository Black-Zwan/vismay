/**
 * WorldView placeholder implementation.
 *
 * Renders a plain colored View with the landmark name as text.
 * This file will be replaced wholesale by the design pass — keep it isolated.
 * Nothing outside this folder knows how it draws.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/src/ui/Text';
import { colors } from '@/src/ui/tokens';
import { getWaymark } from '@/src/content/waymarks';
import type { Daypart } from '@/src/core/time';
import type { WorldViewProps } from './types';

const DAYPART_BG: Record<Daypart, string> = {
  dawn: '#F3E9DC',
  morning: '#E8EDF2',
  noon: '#DDE7F0',
  afternoon: '#E2D7C8',
  dusk: '#D4B896',
  night: '#1E2230',
};

export function WorldView({ daypart, waymarkId, walkProgress, accentHex }: WorldViewProps) {
  const wm = getWaymark(waymarkId);
  const bg = DAYPART_BG[daypart] ?? colors.bg;
  const isNight = daypart === 'night';
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Text style={{ color: isNight ? '#D8D6D0' : colors.ink }}>
        {wm ? wm.name : 'Waymark'}
      </Text>
      <Text variant="caption" style={{ color: isNight ? '#9A9AA0' : colors.inkMuted, marginTop: 4 }}>
        {`progress ${Math.round(walkProgress * 100)}%`}
      </Text>
      <View
        style={[
          styles.dot,
          { backgroundColor: accentHex, left: `${Math.round(walkProgress * 90)}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: 40,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default WorldView;
