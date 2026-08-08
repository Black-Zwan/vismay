/**
 * Journey layout. Bottom tabs: Road, Chronicle, Mirror, Settings.
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/src/ui/AccentColor';
import { DebugBar } from '@/src/ui/DebugBar';
import { NavigationTitle } from '@/src/ui/NavigationTitle';
import { journeyChromeMode } from '@/src/ui/journeyChrome';
import { colors, fonts } from '@/src/ui/tokens';
import { useStore } from '@/src/state/store';

export default function JourneyLayout() {
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();
  const phase = useStore((state) => state.phase);
  const chromeMode = journeyChromeMode(phase);
  const tabBarHeight = Math.max(56, Math.min(64, insets.bottom + 30));

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
          lineHeight: 16,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        },
        tabBarStyle: {
          display: chromeMode === 'ritual' ? 'none' : 'flex',
          height: tabBarHeight,
          paddingTop: 2,
          paddingBottom: insets.bottom,
          backgroundColor: 'rgba(10, 8, 18, 0.94)',
          borderTopColor: colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: accent,
        headerTitle: ({ children }) => <NavigationTitle>{children}</NavigationTitle>,
        headerShown: true,
        }}
      >
        <Tabs.Screen name="road" options={{ title: 'Road', headerShown: false }} />
        <Tabs.Screen name="chronicle" options={{ title: 'Chronicle', headerShown: false }} />
        <Tabs.Screen name="mirror" options={{ title: 'Mirror' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
      <View style={[styles.debugBar, { bottom: chromeMode === 'travel' ? tabBarHeight : 0 }]}>
        <DebugBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  debugBar: {
    position: 'absolute',
    right: 0,
    left: 0,
    zIndex: 100,
  },
});
