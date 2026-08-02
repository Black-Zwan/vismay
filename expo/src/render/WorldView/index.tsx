import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BUFFER_ASPECT_RATIO,
  createWorldRenderer,
  type WorldRenderer,
} from './renderer';
import { CharacterSprite } from './CharacterSprite';
import type { WorldViewProps } from './types';

export function WorldView({
  daypart,
  waymarkId,
  walkProgress,
  characterId,
  accentHex,
}: WorldViewProps) {
  const rendererRef = useRef<WorldRenderer | null>(null);
  const inputsRef = useRef({ daypart, waymarkId, walkProgress, accentHex });
  const [rendererFailed, setRendererFailed] = useState(false);

  inputsRef.current = { daypart, waymarkId, walkProgress, accentHex };

  useEffect(() => {
    rendererRef.current?.update(inputsRef.current);
  }, [accentHex, daypart, walkProgress, waymarkId]);

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
      <View style={styles.character}>
        <CharacterSprite
          characterId={characterId}
          accentHex={accentHex}
          walking={walkProgress < 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    aspectRatio: BUFFER_ASPECT_RATIO,
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
