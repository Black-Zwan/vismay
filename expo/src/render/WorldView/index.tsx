import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  createWorldRenderer,
  type WorldRenderer,
} from './renderer';
import { CharacterSprite } from './CharacterSprite';
import { PropLayers } from './PropLayers';
import { sceneIdForRare, sceneProps } from './scenes';
import type { WorldViewProps } from './types';

export { CharacterPreview } from './CharacterSprite';
export { WorldPropSpriteQa } from './PropLayers';
export { PassageShareCard, SHARE_CARD_SIZE, type ShareCardShape } from './PassageShareCard';
export { SCENE_IDS } from './scenes';

export function WorldView({
  daypart,
  seed,
  biome,
  archetypeId,
  walkProgress,
  walking: walkingOverride,
  characterId,
  accentHex,
  tintHex,
  rareId,
  forcedSceneId,
  forcedApproachProgress,
  onFps,
}: WorldViewProps) {
  const realSceneId = sceneIdForRare(rareId);
  const sceneId = forcedSceneId ?? realSceneId;
  const sceneProgress = forcedSceneId ? forcedApproachProgress ?? 1 : walkProgress;
  const props = sceneProps(sceneId, sceneProgress);
  const rendererRef = useRef<WorldRenderer | null>(null);
  const inputsRef = useRef({ daypart, seed, biome, walkProgress: sceneProgress, accentHex, tintHex, sceneId });
  const [rendererFailed, setRendererFailed] = useState(false);
  const walking = walkingOverride ?? walkProgress < 1;

  inputsRef.current = { daypart, seed, biome, walkProgress: sceneProgress, accentHex, tintHex, sceneId };

  useEffect(() => {
    rendererRef.current?.update(inputsRef.current);
  }, [accentHex, biome, daypart, sceneId, sceneProgress, seed, tintHex]);

  useEffect(() => () => rendererRef.current?.dispose(), []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      rendererRef.current?.dispose();
      rendererRef.current = createWorldRenderer(gl, inputsRef.current, onFps);
      setRendererFailed(false);
    } catch (error) {
      console.warn('[WorldView] GL renderer unavailable', error);
      setRendererFailed(true);
    }
  }, [onFps]);

  return (
    <View style={styles.root}>
      {!rendererFailed ? (
        <GLView
          msaaSamples={0}
          onContextCreate={onContextCreate}
          style={styles.canvas}
        />
      ) : (
        <View style={styles.fallback} />
      )}
      <PropLayers
        daypart={daypart}
        seed={seed}
        biome={biome}
        archetypeId={archetypeId}
        walkProgress={walkProgress}
        accentHex={tintHex ?? accentHex}
        tintHex={tintHex}
        walking={walking}
        sceneProgress={sceneProgress}
        sceneProps={props}
      >
        <View style={styles.character}>
          <CharacterSprite
            characterId={characterId}
            accentHex={tintHex ?? accentHex}
            walking={walking}
          />
        </View>
      </PropLayers>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#0c0f24',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#15152a',
  },
  character: {
    position: 'absolute',
    left: '22%',
    bottom: '12.5%',
  },
});

export default WorldView;
