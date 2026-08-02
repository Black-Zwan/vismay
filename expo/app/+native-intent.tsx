/**
 * Native intent redirect. Pass through the path so deep links resolve normally.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path;
}
