/**
 * Gate screen. Redirects to onboarding if incomplete, else to the journey.
 */

import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '@/src/state/store';
import { useAccentColor } from '@/src/ui/AccentColor';
import { colors } from '@/src/ui/tokens';

export default function Gate() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);
  const accent = useAccentColor();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding/character" />;
  }
  return <Redirect href="/(journey)/road" />;
}
