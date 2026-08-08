/**
 * Onboarding layout. A simple stack for character + sign selection.
 */

import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

export default function OnboardingLayout() {
  const reducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        animation: reducedMotion ? 'none' : 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="character" options={{ title: 'Character' }} />
      <Stack.Screen name="sign" options={{ title: 'Sign' }} />
    </Stack>
  );
}
