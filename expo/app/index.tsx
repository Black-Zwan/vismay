/**
 * Gate screen. Redirects to onboarding if incomplete, else to the journey.
 */

import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '@/src/state/store';

export default function Gate() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding/character" />;
  }
  return <Redirect href="/(journey)" />;
}
