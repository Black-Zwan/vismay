import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getWaymark } from '@/src/content/waymarks';
import { Text } from '@/src/ui/Text';
import { createWorldRenderer, type WorldRenderer } from './renderer';
import type { WorldViewProps } from './types';

export function WorldView({ daypart, waymarkId, walkProgress, accentHex }: WorldViewProps) {
  const wm = getWaymark(waymarkId);
  const rendererRef = useRef<WorldRenderer | null>(null);
  const inputsRef = useRef({ daypart, walkProgress, accentHex });
  const [rendererFailed, setRendererFailed] = useState(false);

  inputsRef.current = { daypart, walkProgress, accentHex };

  useEffect(() => {
    rendererRef.current?.update(inputsRef.current);
  }, [accentHex, daypart, walkProgress]);

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
      <View style={styles.waymarkLabel}>
        <Text variant="caption" style={styles.waymarkText}>
          {wm?.name ?? 'Waymark'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  waymarkLabel: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    maxWidth: '48%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(12, 9, 20, 0.74)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235, 222, 194, 0.28)',
  },
  waymarkText: {
    color: '#e9dfcf',
    textAlign: 'right',
  },
});

export default WorldView;
