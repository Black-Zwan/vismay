/**
 * Root layout. Wires providers, notification config, store hydration, and
 * the root Stack that gates between onboarding and the journey.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { getCard } from '@/src/content/cards';
import {
  configureNotifications,
  requestNotificationPermission,
  rescheduleNotifications,
} from '@/src/services/notifications';
import { setNotificationSideEffect, useStore } from '@/src/state/store';
import { AccentColorProvider, useAccentColor } from '@/src/ui/AccentColor';
import { NavigationTitle } from '@/src/ui/NavigationTitle';
import { colors, fonts } from '@/src/ui/tokens';
import { useReducedMotion } from '@/src/ui/useReducedMotion';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
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
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(journey)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops' }} />
      {/* index.tsx is the gate; redirect handled there */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require('../assets/fonts/Spectral-Regular.ttf'),
    [fonts.italic]: require('../assets/fonts/Spectral-Italic.ttf'),
    [fonts.semibold]: require('../assets/fonts/Spectral-SemiBold.ttf'),
  });
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const phase = useStore((s) => s.phase);
  const pullCardId = useStore((s) => s.pullDraft?.cardId);
  const chronicle = useStore((s) => s.chronicle);

  const latestEntry = chronicle[chronicle.length - 1];
  const revealedPullCardId = phase === 'reveal' || phase === 'reading' || phase === 'walk'
    ? pullCardId
    : undefined;
  const accent = getCard(revealedPullCardId ?? latestEntry?.cardId ?? '')?.accentHex;

  useEffect(() => {
    configureNotifications();
    // Register the notification side-effect so the store reschedules on changes.
    setNotificationSideEffect((state, devFastLegs) => {
      void rescheduleNotifications(state, devFastLegs);
    });
    void requestNotificationPermission();
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  if (fontError) throw fontError;
  if (!fontsLoaded || !hydrated) return null;

  return (
    <AccentColorProvider value={accent}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AccentColorProvider>
  );
}
