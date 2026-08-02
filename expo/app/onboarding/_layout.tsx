/**
 * Onboarding layout. A simple stack for character + sign selection.
 */

import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="character" options={{ title: 'Choose a character' }} />
      <Stack.Screen name="sign" options={{ title: 'Choose a sign' }} />
    </Stack>
  );
}
