/**
 * Pull modal layout. A modal stack for the pull sequence:
 * lens -> draw -> reveal -> reading -> close.
 */

import { Stack } from 'expo-router';
import React from 'react';

import { useAccentColor } from '@/src/ui/AccentColor';
import { NavigationTitle } from '@/src/ui/NavigationTitle';
import { colors } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

export default function PullLayout() {
  const accent = useAccentColor();
  const reducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        animation: reducedMotion ? 'none' : 'slide_from_bottom',
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: accent,
        headerTitle: ({ children }) => <NavigationTitle>{children}</NavigationTitle>,
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="lens" options={{ title: 'Choose a topic' }} />
      <Stack.Screen name="draw" options={{ title: 'Draw' }} />
      <Stack.Screen name="reveal" options={{ title: 'Reveal' }} />
      <Stack.Screen name="reading" options={{ title: 'Reading' }} />
      <Stack.Screen name="close" options={{ title: 'Departure', headerBackVisible: false }} />
    </Stack>
  );
}
