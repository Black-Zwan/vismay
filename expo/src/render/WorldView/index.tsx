import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  createWorldRenderer,
  type WorldRenderer,
} from './renderer';
import { CharacterSprite } from './CharacterSprite';
import { PropLayers } from './PropLayers';
import type { WorldViewProps } from './types';

export { CharacterPreview } from './CharacterSprite';

export function WorldView({
  daypart,
  waymarkId,
  walkProgress,
  walking: walkingOverride,
  characterId,
  accentHex,
  tintHex,
}: WorldViewProps) {
  const rendererRef = useRef<WorldRenderer | null>(null);
  const inputsRef = useRef({ daypart, waymarkId, walkProgress, accentHex, tintHex });
  const [rendererFailed, setRendererFailed] = useState(false);
  const walking = walkingOverride ?? walkProgress < 1;

  inputsRef.current = { daypart, waymarkId, walkProgress, accentHex, tintHex };

  useEffect(() => {
    rendererRef.current?.update(inputsRef.current);
  }, [accentHex, daypart, tintHex, walkProgress, waymarkId]);

  useEffect(() => () => rendererRef.current?.dispose(), []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      rendererRef.current?.dispose();
      rendererRef.current = createWorldRenderer(gl, inputsRef.current);
      setRendererFailed(false);
    } catch (error) {
      console.warn('[WorldView] GL renderer unavailable', error);
      setRendererFailed(true);
    }
  }, []);

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
        waymarkId={waymarkId}
        accentHex={tintHex ?? accentHex}
        tintHex={tintHex}
        walking={walking}
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
