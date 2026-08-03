/**
 * Props for WorldView. The render boundary contract.
 * Nothing outside this folder should know how WorldView draws.
 */

import type { Daypart } from '@/src/core/time';

export interface WorldViewProps {
  daypart: Daypart;
  waymarkId: string;
  walkProgress: number; // 0..1
  walking?: boolean;
  characterId: string;
  accentHex: string;
  tintHex?: string;
}
