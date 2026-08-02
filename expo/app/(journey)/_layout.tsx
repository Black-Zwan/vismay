/**
 * Journey layout. Bottom tabs: Road, Chronicle, Mirror, Settings.
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { colors } from '@/src/ui/tokens';

export default function JourneyLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        headerShown: true,
      }}
    >
      <Tabs.Screen name="road" options={{ title: 'Road' }} />
      <Tabs.Screen name="chronicle/index" options={{ title: 'Chronicle', href: null }} />
      <Tabs.Screen
        name="mirror"
        options={{ title: 'Mirror' }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
