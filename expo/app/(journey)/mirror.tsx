/**
 * Mirror screen. Six aspect scores + satchel of curios.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';
import { ASPECT_LIST } from '@/src/content/aspects';
import { useStore } from '@/src/state/store';
import { getCurio } from '@/src/content/curios';
import { getRareLocation } from '@/src/world/data';

export default function MirrorScreen() {
  const mirror = useStore((s) => s.mirror);
  const raresFound = useStore((s) => s.raresFound);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Panel>
        <Text variant="label" muted>Aspects</Text>
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {ASPECT_LIST.map((a) => {
            const score = mirror.aspects[a.id];
            return (
              <View key={a.id}>
                <View style={styles.row}>
                  <Text>{a.name}</Text>
                  <Text muted>{score}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Panel>

      <Panel>
        <Text variant="label" muted>Satchel</Text>
        {mirror.satchel.length === 0 ? (
          <Text muted style={{ marginTop: spacing.sm }}>Empty.</Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {mirror.satchel.map((id) => {
              const c = getCurio(id);
              return (
                <View key={id}>
                  <Text>{c?.name ?? id}</Text>
                  {c ? <Text variant="caption" muted>{c.description}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </Panel>

      <Panel>
        <Text variant="label" muted>Rare places</Text>
        {raresFound.length === 0 ? (
          <Text muted style={{ marginTop: spacing.sm }}>None found.</Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {raresFound.map((id) => (
              <Text key={id}>{getRareLocation(id)?.name ?? id}</Text>
            ))}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
