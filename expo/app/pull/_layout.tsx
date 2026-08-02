/**
 * Pull modal layout. A modal stack for the pull sequence:
 * lens -> draw -> reveal -> reading -> close.
 */

import { Stack } from 'expo-router';
import React from 'react';

export default function PullLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', presentation: 'modal' }}>
      <Stack.Screen name="lens" options={{ title: 'Choose a topic' }} />
      <Stack.Screen name="draw" options={{ title: 'Draw' }} />
      <Stack.Screen name="reveal" options={{ title: 'Reveal' }} />
      <Stack.Screen name="reading" options={{ title: 'Reading' }} />
      <Stack.Screen name="close" options={{ title: 'Departure', headerBackVisible: false }} />
    </Stack>
  );
}
