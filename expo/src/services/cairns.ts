/**
 * Compatibility exports for the WO5 cairn seam. WO8 narrows the only launch
 * cairn kind to enum-only anonymous traces.
 */
export {
  clearTraceSessionCache,
  isTraceNetworkEnabled,
  readRecentTraces,
  setTraceNetworkEnabled,
  writeTrace,
} from './traces';
