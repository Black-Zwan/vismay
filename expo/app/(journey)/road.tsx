/**
 * Home / the road. The world stays mounted through the complete pull ritual;
 * each phase is a translucent overlay inside this screen, never a route.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARDS, getCard } from '@/src/content/cards';
import { getCharacter } from '@/src/content/characters';
import { LENSES, getLens } from '@/src/content/lenses';
import { SIGNS, getSign } from '@/src/content/signs';
import { getCurio } from '@/src/content/curios';
import { Button } from '@/src/ui/Button';
import { CardBack, CardFace } from '@/src/ui/CardFace';
import { Text } from '@/src/ui/Text';
import { FadeGlow, Floaty, GlowPulse, ModalEnter, RiseIn, motion } from '@/src/ui/motion';
import {
  CompactPanel,
  ContextAction,
  ModalCard,
  Ornament,
  RitualOverlay,
  WorldVignette,
} from '@/src/ui/presentation';
import {
  hapticArrival,
  hapticDraw,
  hapticLensSelection,
  hapticRevealSettled,
} from '@/src/ui/ritualHaptics';
import { useClock } from '@/src/ui/useClock';
import { useReducedMotion } from '@/src/ui/useReducedMotion';
import { colors, spacing } from '@/src/ui/tokens';
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
import { formatTracePassage, type LegCairn } from '@/src/core/traces';

const DEPARTURE_MS = 1_200;

export default function RoadScreen() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const tick = useStore((state) => state.tick);
  const phase = useStore((state) => state.phase);
  const journey = useStore((state) => state.journey);
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
  const roadCairns = useStore((state) => state.roadCairns);
  const chronicleCount = useStore((state) => state.chronicle.length);
  const curioNoticeId = useStore((state) => state.curioNoticeId);
  const dismissCurioNotice = useStore((state) => state.dismissCurioNotice);
  const [selectedCairnId, setSelectedCairnId] = useState<string | null>(null);
  const previousPhase = useRef(phase);
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

  useEffect(() => {
    if (phase === 'arrive' && previousPhase.current !== 'arrive' && !reducedMotion) {
      void hapticArrival();
    }
    previousPhase.current = phase;
  }, [phase, reducedMotion]);

  const handleChooseLens = (lensId: string) => {
    if (!reducedMotion) void hapticLensSelection();
    chooseLens(lensId);
  };
  const handleDraw = () => {
    if (!reducedMotion) void hapticDraw();
    drawCard();
  };

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
          reducedMotion={reducedMotion}
          characterId={journey.characterId}
          accentHex={characterAccent}
          tintHex={tintHex}
          cairns={roadCairns}
          onCairnPress={setSelectedCairnId}
          rareId={place.rareId}
          forcedSceneId={devSceneId}
          forcedApproachProgress={devApproachProgress}
          onFps={setRenderFps}
        />
      </View>
      <WorldVignette />

      <LinearGradient
        colors={['rgba(8, 6, 14, 0.74)', 'rgba(8, 6, 14, 0)']}
        locations={[0, 1]}
        style={[styles.headerScrim, { height: insets.top + 72 }]}
        pointerEvents="none"
      />
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.headerSide}>
          <Text variant="screenRubric" style={styles.headerRubric}>
            {`Day ${journey.dayIndex} · ${daypart}`}
          </Text>
          <Text variant="placeName" style={[styles.headerPlace, { color: characterAccent }]}>
            {walking ? 'On the road' : place.name}
          </Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Text variant="screenRubric" style={styles.headerRubric}>
            {`${journey.stepsWalked.toLocaleString()} steps`}
          </Text>
          <ContextAction
            accessibilityLabel={`Open Chronicle, ${chronicleCount} entries`}
            label={`Chronicle (${chronicleCount})`}
            onPress={() => router.push('/(journey)/chronicle')}
          />
        </View>
      </View>

      {(phase === 'traveling' || phase === 'arrive') ? (
        <View
          style={[
            styles.statusArea,
            phase === 'traveling' && styles.travelStatusArea,
          ]}
        >
          <CompactPanel style={styles.statusPanel}>
            <Text variant="screenRubric" muted>
              {phase === 'arrive' ? 'At the waymark' : `${character?.name ?? 'The wanderer'} ${sign ? `${sign.glyph}\uFE0E` : ''}`}
            </Text>
            <Text variant="caption" muted style={styles.statusLine}>
              {phase === 'arrive'
                ? `The path waits.${journey.bankedArrivals > 1 ? ` ${journey.bankedArrivals} arrivals wait on the road.` : ''}`
                : `Walking to ${place.name}.`}
            </Text>

            {phase === 'arrive' ? (
              <GlowPulse accent={characterAccent} style={styles.statusAction}>
                <Button label="Begin today's pull" onPress={beginPull} />
              </GlowPulse>
            ) : (
              <Text variant="caption" style={[styles.statusAction, { color: characterAccent }]}>
                {`You reach ${place.name} in ${formatRemaining(journey.arrivalAt - now)}`}
              </Text>
            )}
          </CompactPanel>
        </View>
      ) : null}

      {curioNoticeId && (phase === 'traveling' || phase === 'arrive') ? (
        <CurioNotice curioId={curioNoticeId} onDismiss={dismissCurioNotice} />
      ) : null}

      {selectedCairnId ? (
        <CairnPopover
          cairn={roadCairns.find((candidate) => candidate.id === selectedCairnId)}
          now={Date.now()}
          onDismiss={() => setSelectedCairnId(null)}
        />
      ) : null}

      {phase === 'question' ? (
        <QuestionOverlay onChoose={handleChooseLens} />
      ) : null}
      {phase === 'draw' && pullDraft ? (
        <DrawOverlay
          accent={characterAccent}
          lensLabel={getLens(pullDraft.lensId)?.label ?? ''}
          onDraw={handleDraw}
        />
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

function CairnPopover({
  cairn,
  now,
  onDismiss,
}: {
  cairn?: LegCairn;
  now: number;
  onDismiss: () => void;
}) {
  if (!cairn) return null;
  const sign = SIGNS[cairn.payload.sign];
  const lens = LENSES[cairn.payload.lens];
  const card = CARDS[cairn.payload.card];
  if (!sign || !lens || !card) return null;
  return (
    <View style={styles.traceScrim}>
      <ModalEnter style={styles.modalWidth}>
        <ModalCard style={styles.tracePanel}>
          <Text variant="screenRubric" muted>A cairn, recently stacked.</Text>
          <Ornament style={styles.modalOrnament} />
          <Text variant="passage" style={styles.tracePassage}>
            {formatTracePassage(cairn, now, sign.name, lens.label, card.name)}
          </Text>
          <Button label="Dismiss" variant="ghost" onPress={onDismiss} style={styles.traceDismiss} />
        </ModalCard>
      </ModalEnter>
    </View>
  );
}

function CurioNotice({ curioId, onDismiss }: { curioId: string; onDismiss: () => void }) {
  const curio = getCurio(curioId);
  if (!curio) return null;
  return (
    <View style={styles.curioArea}>
      <ModalEnter style={styles.modalWidth}>
        <ModalCard style={styles.curioPanel}>
          <Text variant="screenRubric" muted>Found on the road</Text>
          <Text variant="placeName" style={styles.curioName}>{curio.name}</Text>
          <Text variant="passage" muted>{curio.description}</Text>
          <ContextAction label="Dismiss" onPress={onDismiss} style={styles.curioDismiss} />
        </ModalCard>
      </ModalEnter>
    </View>
  );
}

function QuestionOverlay({ onChoose }: { onChoose: (lensId: string) => void }) {
  return (
    <RitualOverlay>
      <RiseIn>
        <Text variant="ritualTitle" style={styles.prompt}>What do you carry today?</Text>
      </RiseIn>
      <RiseIn delay={150}>
        <Text variant="caption" muted style={styles.questionSupport}>
          The card answers what you ask it.
        </Text>
        <Ornament style={styles.questionOrnament} />
      </RiseIn>
      <View style={styles.lensList}>
        {LENSES.map((lens, index) => (
          <RiseIn key={lens.id} delay={300 + index * 55}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChoose(lens.id)}
              style={({ pressed }) => [styles.lensButton, pressed && styles.pressed]}
            >
              <CompactPanel style={styles.lensPanel}>
                <Text variant="buttonLabel" style={styles.lensText}>{lens.label}</Text>
                <Text style={styles.lensGlyph}>{lens.glyph}</Text>
              </CompactPanel>
            </Pressable>
          </RiseIn>
        ))}
      </View>
    </RitualOverlay>
  );
}

function DrawOverlay({
  accent,
  lensLabel,
  onDraw,
}: {
  accent: string;
  lensLabel: string;
  onDraw: () => void;
}) {
  return (
    <RitualOverlay>
      <RiseIn>
        <Text variant="screenRubric" muted style={styles.drawRubric}>
          {`You ask about · ${lensLabel.toLowerCase()}`}
        </Text>
        <Text variant="ritualTitle" style={styles.drawTitle}>Draw your card</Text>
      </RiseIn>
      <RiseIn delay={150}>
        <Floaty>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Draw from the deck"
            onPress={onDraw}
            style={({ pressed }) => [styles.cardPressTarget, pressed && styles.pressed]}
          >
            <CardBack accent={accent} />
          </Pressable>
        </Floaty>
      </RiseIn>
      <RiseIn delay={300}>
        <Text variant="screenRubric" muted style={styles.deckHint}>Tap the deck</Text>
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
  const revealOpacity = useRef(new Animated.Value(reducedMotion ? 0 : 1)).current;
  const [ready, setReady] = useState(reducedMotion);

  useEffect(() => {
    setReady(false);
    if (reducedMotion) {
      flip.setValue(1);
      revealOpacity.setValue(0);
      const crossfade = Animated.timing(revealOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      });
      crossfade.start(({ finished }) => {
        if (finished) setReady(true);
      });
      return () => crossfade.stop();
    }
    flip.setValue(0);
    revealOpacity.setValue(1);
    const animation = Animated.timing(flip, {
      toValue: 1,
      delay: motion.revealDelay,
      duration: motion.revealFlip,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        setReady(true);
        void hapticRevealSettled();
      }
    });
    return () => animation.stop();
  }, [flip, reducedMotion, revealOpacity]);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.name}. Read the card.`}
          disabled={!ready}
          onPress={onReveal}
          style={styles.flipFrame}
        >
          <FadeGlow accent={card.accentHex} />
          <Animated.View
            style={[
              styles.flipSide,
              { opacity: revealOpacity, transform: [{ perspective: 900 }, { rotateY: backRotation }] },
            ]}
          >
            <CardBack accent={card.accentHex} />
          </Animated.View>
          <Animated.View
            style={[
              styles.flipSide,
              { opacity: revealOpacity, transform: [{ perspective: 900 }, { rotateY: faceRotation }] },
            ]}
          >
            <CardFace card={card} />
          </Animated.View>
        </Pressable>
      </RiseIn>
      {ready ? (
        <RiseIn>
          <Text variant="screenRubric" muted style={styles.revealHint}>Tap the card</Text>
        </RiseIn>
      ) : null}
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
    <RitualOverlay>
      <ScrollView
        style={styles.readingScroll}
        contentContainerStyle={styles.readingContent}
        showsVerticalScrollIndicator={false}
      >
        <RiseIn>
          <View style={styles.readingCard}>
            <CardFace card={card} />
          </View>
        </RiseIn>
        <RiseIn delay={150} style={styles.readingWidth}>
          <CompactPanel style={[styles.readingPanel, { borderColor: `${card.accentHex}66` }]}>
            <Text variant="screenRubric" style={{ color: card.accentHex }}>
              {`On the matter of ${lensLabel.toLowerCase()}`}
            </Text>
            {openerText ? <Text style={styles.readingOpener}>{openerText}</Text> : null}
            <Text variant="passage" style={styles.readingAnswer}>{answerText}</Text>
          </CompactPanel>
        </RiseIn>
        {departText ? (
          <RiseIn delay={300} style={styles.readingWidth}>
            <Text variant="reading" muted style={styles.departText}>{departText}</Text>
          </RiseIn>
        ) : null}
        <RiseIn delay={300} style={styles.readingWidth}>
          <Button label="Walk on →" onPress={onOnward} style={styles.onward} />
        </RiseIn>
      </ScrollView>
    </RitualOverlay>
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
    <RitualOverlay>
      <ScrollView
        style={styles.skyScroll}
        contentContainerStyle={styles.skyContent}
        showsVerticalScrollIndicator={false}
      >
        <RiseIn style={styles.skyWidth}>
          <CompactPanel style={styles.skyPanel}>
            <Text variant="screenRubric" muted>{`The Sky · ${signGlyph}\uFE0E ${signName}`}</Text>
            <Ornament style={styles.skyOrnament} />
            {departText ? (
              <Text variant="reading" muted style={styles.skyDeparture}>{departText}</Text>
            ) : null}
            {horoscopeText ? (
              <Text variant="passage" style={styles.horoscope}>{horoscopeText}</Text>
            ) : null}
            <View style={styles.watchBlock}>
              <Text variant="screenRubric" muted>On the Road Ahead</Text>
              {watchForSignName ? (
                <Text variant="placeName" style={styles.watchSign}>
                  {`${watchForSignGlyph ?? ''}\uFE0E ${watchForSignName}`}
                </Text>
              ) : null}
            </View>
            <Button label="Set out" onPress={onSetOut} style={styles.onward} />
          </CompactPanel>
        </RiseIn>
      </ScrollView>
    </RitualOverlay>
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
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSide: {
    maxWidth: '58%',
  },
  headerRight: {
    maxWidth: '42%',
    alignItems: 'flex-end',
  },
  headerRubric: {
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(207, 198, 232, 0.72)',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  headerPlace: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 19,
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
    pointerEvents: 'box-none',
  },
  statusPanel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(17, 14, 28, 0.76)',
  },
  travelStatusArea: {
    top: 72,
    bottom: 'auto',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  statusLine: {
    marginTop: spacing.xs,
  },
  statusAction: {
    marginTop: spacing.md,
  },
  prompt: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  questionSupport: {
    textAlign: 'center',
  },
  questionOrnament: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  lensList: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
  },
  lensButton: {
    alignSelf: 'stretch',
  },
  lensPanel: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 14, 28, 0.78)',
  },
  lensText: {
    fontSize: 14,
    letterSpacing: 2.5,
    lineHeight: 22,
    flex: 1,
  },
  lensGlyph: {
    fontSize: 15,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.65,
  },
  drawRubric: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  drawTitle: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  cardPressTarget: {
    minWidth: 172,
    minHeight: 246,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckHint: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  flipFrame: {
    width: 148,
    height: 226,
  },
  flipSide: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  revealHint: {
    marginTop: 20,
    textAlign: 'center',
  },
  readingScroll: {
    alignSelf: 'stretch',
  },
  readingContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  readingCard: {
    width: 148,
    height: 226,
  },
  readingWidth: {
    width: '100%',
    maxWidth: 360,
  },
  readingPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.86)',
  },
  readingOpener: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  readingAnswer: {
    marginTop: spacing.sm,
  },
  departText: {
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
  onward: {
    marginTop: spacing.lg,
  },
  skyWidth: {
    width: '100%',
    maxWidth: 390,
  },
  skyScroll: {
    alignSelf: 'stretch',
  },
  skyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  skyPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.9)',
  },
  skyOrnament: {
    marginVertical: spacing.sm,
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
    marginTop: spacing.sm,
  },
  traceScrim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 6, 14, 0.58)',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 30,
  },
  tracePanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.96)',
  },
  modalWidth: {
    width: '100%',
    maxWidth: 420,
  },
  modalOrnament: {
    marginTop: spacing.sm,
  },
  tracePassage: {
    marginTop: spacing.md,
  },
  traceDismiss: {
    marginTop: spacing.lg,
  },
  curioArea: {
    alignItems: 'center',
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    top: 88,
    zIndex: 12,
  },
  curioPanel: {
    backgroundColor: 'rgba(17, 14, 28, 0.9)',
  },
  curioName: {
    marginTop: spacing.xs,
  },
  curioDismiss: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    padding: spacing.xs,
  },
});
