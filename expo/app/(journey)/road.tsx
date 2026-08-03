/**
 * Home / the road. The world stays mounted through the complete pull ritual;
 * each phase is a translucent overlay inside this screen, never a route.
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCard } from '@/src/content/cards';
import { getCharacter } from '@/src/content/characters';
import { LENSES, getLens } from '@/src/content/lenses';
import { getSign } from '@/src/content/signs';
import { Button } from '@/src/ui/Button';
import { Panel } from '@/src/ui/Panel';
import { Text } from '@/src/ui/Text';
import { useClock } from '@/src/ui/useClock';
import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { colors, radius, spacing } from '@/src/ui/tokens';
import { WorldView } from '@/src/render/WorldView';
import {
  selectCharacterAccent,
  selectCurrentPlace,
  selectRenderedBiome,
  selectWalkProgress,
  resolveDailySky,
  useStore,
} from '@/src/state/store';
import { daypartFromTimestamp } from '@/src/core/time';

const DEPARTURE_MS = 1_200;

export default function RoadScreen() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const tick = useStore((state) => state.tick);
  const phase = useStore((state) => state.phase);
  const journey = useStore((state) => state.journey);
  const devMode = useStore((state) => state.settings.devMode);
  const devSceneId = useStore((state) => state.devSceneId);
  const devApproachProgress = useStore((state) => state.devApproachProgress);
  const setRenderFps = useStore((state) => state.setRenderFps);
  const pullDraft = useStore((state) => state.pullDraft);
  const beginPull = useStore((state) => state.beginPull);
  const chooseLens = useStore((state) => state.chooseLens);
  const drawCard = useStore((state) => state.drawCard);
  const revealCard = useStore((state) => state.revealCard);
  const finishReading = useStore((state) => state.finishReading);
  const beginDeparture = useStore((state) => state.beginDeparture);
  const closePull = useStore((state) => state.closePull);
  const place = useStore(selectCurrentPlace);
  const characterAccent = useStore(selectCharacterAccent);
  const now = useClock();
  const daypart = daypartFromTimestamp(now);
  const progress = selectWalkProgress(journey, now);
  const renderedBiome = selectRenderedBiome(journey, now);
  const card = pullDraft ? getCard(pullDraft.cardId) : undefined;
  const tintHex = phase === 'reveal' || phase === 'reading' || phase === 'done' || phase === 'walk'
    ? card?.accentHex
    : undefined;
  const walking = phase === 'traveling' || phase === 'walk';

  useEffect(() => {
    tick();
  }, [tick]);

  useEffect(() => {
    if (phase !== 'walk') return;
    const timer = setTimeout(closePull, reducedMotion ? 0 : DEPARTURE_MS);
    return () => clearTimeout(timer);
  }, [closePull, phase, reducedMotion]);

  const character = getCharacter(journey.characterId);
  const sign = getSign(journey.signId);
  const sky = resolveDailySky(journey);
  const watchForSign = sky.watchForSignId ? getSign(sky.watchForSignId) : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.world}>
        <WorldView
          daypart={daypart}
          seed={journey.seed}
          biome={renderedBiome}
          archetypeId={place.archetypeId}
          walkProgress={progress}
          walking={walking}
          characterId={journey.characterId}
          accentHex={characterAccent}
          tintHex={tintHex}
          rareId={place.rareId}
          forcedSceneId={devSceneId}
          forcedApproachProgress={devApproachProgress}
          onFps={setRenderFps}
        />
      </View>

      <LinearGradient
        colors={['rgba(8, 6, 14, 0.74)', 'rgba(8, 6, 14, 0)']}
        locations={[0, 1]}
        style={[styles.headerScrim, { height: insets.top + 72 }]}
        pointerEvents="none"
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text variant="label" style={styles.headerText}>Road</Text>
      </View>

      {(phase === 'traveling' || phase === 'arrive') ? (
        <View style={[styles.statusArea, devMode && styles.statusAreaWithDebug]}>
          <Panel style={styles.statusPanel}>
            <Text variant="caption" muted>{`Day ${journey.dayIndex}`}</Text>
            <Text>{character?.name ?? 'Character'} {sign ? `${sign.glyph}\uFE0E` : ''}</Text>
            <Text variant="caption" muted style={styles.statusLine}>
              {phase === 'arrive'
                ? `Arrived at ${place.name}. ${journey.bankedArrivals > 1 ? `${journey.bankedArrivals} draws waiting.` : ''}`
                : `Walking to ${place.name}.`}
            </Text>
            <Text variant="caption" muted>{`progress ${Math.round(progress * 100)}%`}</Text>

            {phase === 'arrive' ? (
              <Button label="Draw a card" onPress={beginPull} style={styles.statusAction} />
            ) : (
              <Text variant="caption" muted style={styles.statusAction}>
                {`Next arrival in ${formatRemaining(journey.arrivalAt - now)}`}
              </Text>
            )}
          </Panel>
        </View>
      ) : null}

      {phase === 'question' ? (
        <QuestionOverlay onChoose={chooseLens} />
      ) : null}
      {phase === 'draw' && pullDraft ? (
        <DrawOverlay accent={characterAccent} onDraw={drawCard} />
      ) : null}
      {phase === 'reveal' && card ? (
        <RevealOverlay card={card} onReveal={revealCard} />
      ) : null}
      {phase === 'reading' && pullDraft && card ? (
        <ReadingOverlay
          card={card}
          lensLabel={getLens(pullDraft.lensId)?.label ?? ''}
          openerText={pullDraft.openerText}
          answerText={pullDraft.answerText}
          departText={place.departText}
          onOnward={finishReading}
        />
      ) : null}
      {phase === 'done' && sign ? (
        <SkyOverlay
          signName={sign.name}
          signGlyph={sign.glyph}
          horoscopeText={sky.horoscopeText}
          watchForSignName={watchForSign?.name}
          watchForSignGlyph={watchForSign?.glyph}
          departText={place.departText}
          onSetOut={beginDeparture}
        />
      ) : null}
    </View>
  );
}

function QuestionOverlay({ onChoose }: { onChoose: (lensId: string) => void }) {
  return (
    <RitualOverlay>
      <RiseIn>
        <Text muted style={styles.prompt}>What do you want to ask the card?</Text>
      </RiseIn>
      <View style={styles.lensList}>
        {LENSES.map((lens, index) => (
          <RiseIn key={lens.id} delay={index * 75}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChoose(lens.id)}
              style={({ pressed }) => [styles.lensButton, pressed && styles.pressed]}
            >
              <Panel style={styles.lensPanel}>
                <Text variant="display" style={styles.lensText}>
                  {lens.glyph} {lens.label}
                </Text>
              </Panel>
            </Pressable>
          </RiseIn>
        ))}
      </View>
    </RitualOverlay>
  );
}

function DrawOverlay({ accent, onDraw }: { accent: string; onDraw: () => void }) {
  return (
    <RitualOverlay>
      <RiseIn>
        <Text muted style={styles.prompt}>Tap the deck.</Text>
      </RiseIn>
      <RiseIn delay={150}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Draw from the deck"
          onPress={onDraw}
          style={({ pressed }) => [
            styles.deck,
            { borderColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.deckInset, { borderColor: accent }]}>
            <Text variant="numeral" style={{ color: accent }}>✦</Text>
          </View>
        </Pressable>
      </RiseIn>
    </RitualOverlay>
  );
}

function RevealOverlay({
  card,
  onReveal,
}: {
  card: NonNullable<ReturnType<typeof getCard>>;
  onReveal: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const flip = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const [ready, setReady] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      flip.setValue(1);
      setReady(true);
      return;
    }
    Animated.timing(flip, {
      toValue: 1,
      duration: 650,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => setReady(finished));
  }, [flip, reducedMotion]);

  const backRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const faceRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <RitualOverlay>
      <RiseIn>
        <Text muted style={styles.prompt}>Tap the card.</Text>
      </RiseIn>
      <RiseIn delay={150}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.name}. Read the card.`}
          disabled={!ready}
          onPress={onReveal}
          style={styles.flipFrame}
        >
          <Animated.View style={[styles.flipSide, { transform: [{ rotateY: backRotation }] }]}>
            <View style={[styles.deck, { borderColor: card.accentHex }]}>
              <View style={[styles.deckInset, { borderColor: card.accentHex }]}>
                <Text variant="numeral" style={{ color: card.accentHex }}>✦</Text>
              </View>
            </View>
          </Animated.View>
          <Animated.View style={[styles.flipSide, { transform: [{ rotateY: faceRotation }] }]}>
            <CardFace card={card} />
          </Animated.View>
        </Pressable>
      </RiseIn>
    </RitualOverlay>
  );
}

function ReadingOverlay({
  card,
  lensLabel,
  openerText,
  answerText,
  departText,
  onOnward,
}: {
  card: NonNullable<ReturnType<typeof getCard>>;
  lensLabel: string;
  openerText: string;
  answerText: string;
  departText: string;
  onOnward: () => void;
}) {
  return (
    <View style={styles.scrim}>
      <ScrollView
        style={styles.readingScroll}
        contentContainerStyle={styles.readingContent}
        showsVerticalScrollIndicator={false}
      >
        <RiseIn>
          <View style={styles.readingCard}>
            <CardFace card={card} compact />
          </View>
        </RiseIn>
        <RiseIn delay={150} style={styles.readingWidth}>
          <Panel style={styles.readingPanel}>
            <Text variant="label" muted>{lensLabel}</Text>
            <Text style={styles.readingOpener}>{openerText}</Text>
            <Text variant="reading" style={styles.readingAnswer}>{answerText}</Text>
            {departText ? (
              <Text variant="reading" muted style={styles.departText}>{departText}</Text>
            ) : null}
            <Button label="Onward" onPress={onOnward} style={styles.onward} />
          </Panel>
        </RiseIn>
      </ScrollView>
    </View>
  );
}

function SkyOverlay({
  signName,
  signGlyph,
  horoscopeText,
  watchForSignName,
  watchForSignGlyph,
  departText,
  onSetOut,
}: {
  signName: string;
  signGlyph: string;
  horoscopeText?: string;
  watchForSignName?: string;
  watchForSignGlyph?: string;
  departText: string;
  onSetOut: () => void;
}) {
  return (
    <View style={styles.scrim}>
      <RiseIn style={styles.skyWidth}>
        <Panel style={styles.skyPanel}>
          <Text variant="label" muted>{`The Sky · ${signGlyph}\uFE0E ${signName}`}</Text>
          {departText ? (
            <Text variant="reading" muted style={styles.skyDeparture}>{departText}</Text>
          ) : null}
          {horoscopeText ? (
            <Text variant="reading" style={styles.horoscope}>{horoscopeText}</Text>
          ) : null}
          <View style={styles.watchBlock}>
            <Text variant="label" muted>On the Road Ahead</Text>
            {watchForSignName ? (
              <Text style={styles.watchSign}>
                {`${watchForSignGlyph ?? ''}\uFE0E ${watchForSignName}`}
              </Text>
            ) : null}
          </View>
          <Button label="Set out" onPress={onSetOut} style={styles.onward} />
        </Panel>
      </RiseIn>
    </View>
  );
}

function CardFace({
  card,
  compact = false,
}: {
  card: NonNullable<ReturnType<typeof getCard>>;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.cardFace,
        compact && styles.cardFaceCompact,
        { borderColor: card.accentHex },
      ]}
    >
      <Text variant="numeral" style={[compact && styles.compactNumeral, { color: card.accentHex }]}>
        {card.numeral}
      </Text>
      <Text variant={compact ? 'title' : 'display'} style={styles.cardName}>{card.name}</Text>
      <Text variant="caption" style={{ color: card.accentHex }}>✦ ✦ ✦</Text>
    </View>
  );
}

function RitualOverlay({ children }: { children: React.ReactNode }) {
  return <View style={styles.scrim}>{children}</View>;
}

function RiseIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  world: {
    ...StyleSheet.absoluteFillObject,
  },
  headerScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  statusArea: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    padding: spacing.md,
  },
  statusPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.76)',
  },
  statusAreaWithDebug: {
    bottom: 58,
  },
  statusLine: {
    marginTop: spacing.xs,
  },
  statusAction: {
    marginTop: spacing.md,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    paddingHorizontal: 28,
    paddingTop: 76,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 6, 14, 0.72)',
  },
  prompt: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  lensList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  lensButton: {
    alignSelf: 'stretch',
  },
  lensPanel: {
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 14, 28, 0.78)',
  },
  lensText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
  deck: {
    width: 154,
    height: 220,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 14, 28, 0.94)',
  },
  deckInset: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flipFrame: {
    width: 200,
    height: 280,
  },
  flipSide: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  cardFace: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: 'rgba(17, 14, 28, 0.96)',
  },
  cardFaceCompact: {
    width: 112,
    height: 156,
    padding: spacing.sm,
  },
  cardName: {
    textAlign: 'center',
  },
  compactNumeral: {
    fontSize: 24,
    lineHeight: 28,
  },
  readingScroll: {
    alignSelf: 'stretch',
  },
  readingContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  readingCard: {
    width: 112,
    height: 156,
  },
  readingWidth: {
    alignSelf: 'stretch',
  },
  readingPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.86)',
  },
  readingOpener: {
    marginTop: spacing.sm,
  },
  readingAnswer: {
    marginTop: spacing.md,
  },
  departText: {
    marginTop: spacing.md,
  },
  onward: {
    marginTop: spacing.lg,
  },
  skyWidth: {
    alignSelf: 'stretch',
  },
  skyPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.9)',
  },
  skyDeparture: {
    marginTop: spacing.md,
  },
  horoscope: {
    marginTop: spacing.lg,
  },
  watchBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  watchSign: {
    marginTop: spacing.xs,
    fontSize: 20,
  },
});
