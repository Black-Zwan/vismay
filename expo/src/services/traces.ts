/**
 * Traces service. Stub only — no implementation yet.
 * Reserved for future analytics/telemetry tracing. Not wired to any backend.
 */

export interface TraceEvent {
  name: string;
  properties?: Record<string, unknown>;
  at: number;
}

/** Record a trace event. Stub: no-op. */
export function trace(_event: TraceEvent): void {
  // no-op
}

/** Flush buffered traces. Stub: no-op. */
export async function flushTraces(): Promise<void> {
  // no-op
}
