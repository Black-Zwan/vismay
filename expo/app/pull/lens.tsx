/**
 * Lens screen. Choose a topic before drawing. Starts the pull flow.
 */

import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { LENSES } from '@/src/content/lenses';
import { useStore } from '@/src/state/store';

export default function LensScreen() {
  const beginPull = useStore((s) => s.beginPull);
  const chooseLens = useStore((s) => s.chooseLens);
  const phase = useStore((s) => s.phase);

  React.useEffect(() => {
    if (phase === 'arrive') beginPull();
  }, [phase, beginPull]);

  return (
    <View style={styles.root}>
      <Text muted style={styles.sub}>What do you want to ask the card?</Text>

      <View style={{ gap: spacing.sm }}>
        {LENSES.map((l) => (
          <Pressable
            key={l.id}
            accessibilityRole="button"
            onPress={() => {
              chooseLens(l.id);
              router.push('/pull/draw');
            }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          >
            <Panel>
              <Text variant="display">{l.label}</Text>
            </Panel>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  sub: { marginBottom: spacing.md },
  row: {},
});
