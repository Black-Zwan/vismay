/**
 * Props for WorldView. The render boundary contract.
 * Nothing outside this folder should know how WorldView draws.
 */

import type { Daypart } from '@/src/core/time';
import type { BiomeId, SceneId } from '@/src/world/types';

export interface WorldViewProps {
  daypart: Daypart;
  seed: number;
  biome: BiomeId;
  archetypeId: string;
  walkProgress: number; // 0..1
  walking?: boolean;
  reducedMotion?: boolean;
  characterId: string;
  accentHex: string;
  tintHex?: string;
  cairns?: readonly { id: string; position: number }[];
  onCairnPress?: (id: string) => void;
  rareId?: string | null;
  forcedSceneId?: SceneId | null;
  forcedApproachProgress?: number;
  onFps?: (fps: number) => void;
}
