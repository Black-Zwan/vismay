/**
 * ID generation. Pure, no platform imports.
 */

let counter = 0;

/**
 * Generate a unique-ish ID with a prefix. Uses timestamp + monotonic counter
 * for uniqueness within a session. Sufficient for local-only state.
 */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
