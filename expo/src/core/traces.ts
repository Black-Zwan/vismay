/** Wayside trace selection and prose assembly. Pure: no platform imports. */

export interface TracePayload {
  leg_id: number;
  day_index: number;
  hour_bucket: number;
  sign: number;
  lens: number;
  card: number;
}

export type TraceSource = 'real' | 'procedural';
export type TraceDensity = 'auto' | 'low' | 'high';

export interface TraceObservation {
  payload: TracePayload;
  createdAt: number;
  source: TraceSource;
}

export interface LegCairn extends TraceObservation {
  id: string;
  /** Normalized position inside the renderer's near parallax strip. */
  position: number;
}

export interface SelectLegCairnsOptions {
  realTraces: readonly TraceObservation[];
  seed: number;
  now: number;
  legId: number;
  dayIndex: number;
  playerSign: number;
  signCount: number;
  lensCount: number;
  cardCount: number;
  interestingCardIndexes?: readonly number[];
  density?: TraceDensity;
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const REAL_WINDOW_MS = 48 * 60 * 60 * 1_000;
const MAX_CAIRNS = 3;

/** Payload validation is the client-side mirror of the database RLS boundary. */
export function isTracePayload(value: unknown): value is TracePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (keys.join(',') !== 'card,day_index,hour_bucket,leg_id,lens,sign') return false;
  return integerIn(candidate.leg_id, 0, 10_000)
    && integerIn(candidate.day_index, 0, 100_000)
    && integerIn(candidate.hour_bucket, 0, 24)
    && integerIn(candidate.sign, 0, 12)
    && integerIn(candidate.lens, 0, 18)
    && integerIn(candidate.card, 0, 78);
}

export function selectLegCairns(options: SelectLegCairnsOptions): LegCairn[] {
  const density = options.density ?? 'auto';
  const target = density === 'high'
    ? 3
    : density === 'low'
      ? 2
      : 2 + (hashUint(options.seed, 0x2ca1) % 2);
  const interestingCards = new Set(options.interestingCardIndexes ?? []);
  const real = density === 'low'
    ? []
    : options.realTraces
      .filter((trace) => (
        trace.source === 'real'
        && isTracePayload(trace.payload)
        && trace.createdAt <= options.now
        && options.now - trace.createdAt <= REAL_WINDOW_MS
      ))
      .sort((a, b) => {
        const scoreA = interestScore(a.payload, options.playerSign, interestingCards);
        const scoreB = interestScore(b.payload, options.playerSign, interestingCards);
        return scoreB - scoreA || b.createdAt - a.createdAt;
      })
      // Reserve one slot for the procedural floor even on a busy road. This
      // keeps every observation inside the same ambiguity set.
      .slice(0, Math.max(0, target - 1));

  const selected: TraceObservation[] = [...real];
  while (selected.length < target) {
    selected.push(makeProceduralTrace(options, selected.length));
  }

  return selected.slice(0, MAX_CAIRNS).map((trace, index, traces) => ({
    ...trace,
    id: traceId(trace, index),
    position: cairnPosition(options.seed, index, traces.length),
  }));
}

export function makeProceduralTrace(
  options: Omit<SelectLegCairnsOptions, 'realTraces'>,
  index: number,
): TraceObservation {
  const ageDays = 2 + (hashUint(options.seed, 0x51d0 + index) % 5);
  const safeSignCount = Math.max(1, options.signCount);
  const safeLensCount = Math.max(1, options.lensCount);
  const safeCardCount = Math.max(1, options.cardCount);
  return {
    source: 'procedural',
    createdAt: options.now - ageDays * DAY_MS,
    payload: {
      leg_id: clampInteger(options.legId, 0, 9_999),
      day_index: clampInteger(
        options.dayIndex - ageDays - (hashUint(options.seed, 0x6d31 + index) % 4),
        0,
        99_999,
      ),
      hour_bucket: hashUint(options.seed, 0x7b20 + index) % 24,
      sign: hashUint(options.seed, 0x8e40 + index) % safeSignCount,
      lens: hashUint(options.seed, 0x9f50 + index) % safeLensCount,
      card: hashUint(options.seed, 0xaf60 + index) % safeCardCount,
    },
  };
}

/** Fuzzy time keeps clock precision out of the fiction. */
export function fuzzyTraceTime(trace: TraceObservation, now: number): string {
  if (trace.source === 'procedural') return 'Days ago';
  const ageHours = Math.max(0, Math.floor((now - trace.createdAt) / (60 * 60 * 1_000)));
  if (ageHours < 2) return 'Recently';
  if (ageHours <= 12) return `${numberWord(ageHours)} hours ago`;
  if (trace.payload.hour_bucket < 6 || trace.payload.hour_bucket >= 21) return 'In the night';
  return 'Two days past';
}

export function formatTracePassage(
  trace: TraceObservation,
  now: number,
  signName: string,
  lensLabel: string,
  cardName: string,
): string {
  const time = fuzzyTraceTime(trace, now);
  return `${time}, a ${signName} passed this way. They asked of ${lensLabel.toLowerCase()}, and the road answered with ${titleCase(cardName)}.`;
}

function interestScore(
  payload: TracePayload,
  playerSign: number,
  interestingCards: ReadonlySet<number>,
): number {
  return (payload.sign === playerSign ? 2 : 0) + (interestingCards.has(payload.card) ? 3 : 0);
}

function cairnPosition(seed: number, index: number, count: number): number {
  const lane = (index + 1) / (count + 1);
  const jitter = (hashUint(seed, 0xc170 + index) / 0x1_0000_0000 - 0.5) * 0.12;
  return Math.max(0.12, Math.min(0.88, lane + jitter));
}

function traceId(trace: TraceObservation, index: number): string {
  const payload = trace.payload;
  return `cairn_${trace.source}_${hashUint(
    payload.leg_id ^ payload.day_index ^ trace.createdAt,
    payload.sign * 10_000 + payload.lens * 100 + payload.card + index,
  ).toString(16)}`;
}

function hashUint(seed: number, salt: number): number {
  let value = ((seed >>> 0) ^ Math.imul((salt >>> 0) + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function integerIn(value: unknown, min: number, maxExclusive: number): boolean {
  return Number.isInteger(value) && Number(value) >= min && Number(value) < maxExclusive;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numberWord(value: number): string {
  const words = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
    'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  ];
  return words[value] ?? String(value);
}
