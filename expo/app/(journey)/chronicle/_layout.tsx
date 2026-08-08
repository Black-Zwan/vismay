import { Stack } from 'expo-router';
import React from 'react';

import { useAccentColor } from '@/src/ui/AccentColor';
import { NavigationTitle } from '@/src/ui/NavigationTitle';
import { colors } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

export default function ChronicleLayout() {
  const accent = useAccentColor();
  const reducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        animation: reducedMotion ? 'none' : 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: accent,
        headerTitle: ({ children }) => <NavigationTitle>{children}</NavigationTitle>,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Chronicle', headerShown: false }} />
      <Stack.Screen name="[entryId]" options={{ title: 'Entry' }} />
    </Stack>
  );
}
