/**
 * Root layout. Wires providers, notification config, store hydration, and
 * the root Stack that gates between onboarding and the journey.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useStore } from '@/src/state/store';
import { setNotificationSideEffect } from '@/src/state/store';
import {
  configureNotifications,
  requestNotificationPermission,
  rescheduleNotifications,
} from '@/src/services/notifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const onboarded = useStore((s) => s.onboarded);
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(journey)" options={{ headerShown: false }} />
      <Stack.Screen name="pull" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops' }} />
      {/* index.tsx is the gate; redirect handled there */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);

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
    if (hydrated) {
      SplashScreen.hideAsync();
    }
  }, [hydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
