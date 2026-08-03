export type CairnKind = 'mark' | 'passage' | 'blessing';
export type CairnPayload = Record<string, unknown> | null;

export interface CairnRecord {
  id: string;
  bucketKey: string;
  kind: CairnKind;
  payload: CairnPayload;
  createdAt: number;
}

export interface CairnService {
  list(bucketKey: string): Promise<CairnRecord[]>;
  leave(bucketKey: string, kind: CairnKind, payload: CairnPayload): Promise<void>;
}

/** Offline implementation. A network-backed service may replace this later. */
export const cairns: CairnService = {
  async list(_bucketKey) {
    return [];
  },
  async leave(_bucketKey, _kind, _payload) {
    // Deliberate no-op: Work Order 5 defines the seam but connects no backend.
  },
};
