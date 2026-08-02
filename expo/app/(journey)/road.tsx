/**
 * Home / the road. Shows the WorldView placeholder and current journey status.
 * When an arrival is banked, shows a "Draw a card" button that opens the pull
 * modal flow.
 */

import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { useClock } from '@/src/ui/useClock';
import { colors, spacing } from '@/src/ui/tokens';
import { WorldView } from '@/src/render/WorldView';
import {
  selectCharacterAccent,
  selectCurrentWaymark,
  selectDaypart,
  selectWalkProgress,
  useStore,
} from '@/src/state/store';
import { getCharacter } from '@/src/content/characters';
import { getSign } from '@/src/content/signs';

export default function RoadScreen() {
  const tick = useStore((s) => s.tick);
  const phase = useStore((s) => s.phase);
  const journey = useStore((s) => s.journey);
  const bankedArrivals = useStore((s) => s.journey.bankedArrivals);
  const waymark = useStore(selectCurrentWaymark);
  const accent = useStore(selectCharacterAccent);
  const now = useClock();
  const daypart = selectDaypart(now);
  const progress = selectWalkProgress(journey, now);

  // Tick on focus / mount to credit arrivals.
  useEffect(() => {
    tick();
  }, [tick]);

  const character = getCharacter(journey.characterId);
  const sign = getSign(journey.signId);
  const arrived = phase === 'arrive' || bankedArrivals > 0;

  return (
    <View style={styles.root}>
      <View style={styles.world}>
        <WorldView
          daypart={daypart}
          waymarkId={waymark.id}
          walkProgress={progress}
          characterId={journey.characterId}
          accentHex={accent}
        />
      </View>

      <View style={styles.footer}>
        <Panel>
          <Text variant="caption" muted>{`Day ${journey.dayIndex}`}</Text>
          <Text>{character?.name ?? 'Character'} {sign ? `${sign.glyph}\uFE0E` : ''}</Text>
          <Text variant="caption" muted style={{ marginTop: 4 }}>
            {arrived
              ? `Arrived at ${waymark.name}. ${bankedArrivals > 1 ? `${bankedArrivals} draws waiting.` : ''}`
              : `Walking to ${waymark.name}.`}
          </Text>
          <Text variant="caption" muted>
            {`progress ${Math.round(progress * 100)}%`}
          </Text>

          {arrived ? (
            <Button
              label="Draw a card"
              onPress={() => router.push('/pull/lens')}
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <Text variant="caption" muted style={{ marginTop: spacing.md }}>
              {`Next arrival in ${formatRemaining(journey.arrivalAt - now)}`}
            </Text>
          )}
        </Panel>
      </View>
    </View>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  world: { flex: 1 },
  footer: { padding: spacing.md },
});
