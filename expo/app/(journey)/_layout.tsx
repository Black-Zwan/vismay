/**
 * Journey layout. Bottom tabs: Road, Chronicle, Mirror, Settings.
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAccentColor } from '@/src/ui/AccentColor';
import { DebugBar } from '@/src/ui/DebugBar';
import { NavigationTitle } from '@/src/ui/NavigationTitle';
import { colors, fonts } from '@/src/ui/tokens';

export default function JourneyLayout() {
  const accent = useAccentColor();

  return (
    <View style={styles.root}>
      <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
          letterSpacing: 0.8,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: accent,
        headerTitle: ({ children }) => <NavigationTitle>{children}</NavigationTitle>,
        headerShown: true,
      }}
      >
        <Tabs.Screen name="road" options={{ title: 'Road' }} />
        <Tabs.Screen name="chronicle" options={{ title: 'Chronicle', headerShown: false }} />
        <Tabs.Screen name="mirror" options={{ title: 'Mirror' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
      <DebugBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
