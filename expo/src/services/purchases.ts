/**
 * Purchases service. Stub only — no implementation yet.
 * Reserved for future subscription/paywall logic. The isPlus flag on
 * JourneyState is the single source of truth for plus status; this service
 * will eventually keep it in sync with a store. Not wired to any backend.
 */

export async function isPlusUser(): Promise<boolean> {
  return false;
}

export async function purchasePlus(): Promise<boolean> {
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
