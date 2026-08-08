import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function safely(run: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await run();
  } catch {
    // Haptics are enhancement-only and must never interrupt the ritual.
  }
}

export function hapticLensSelection(): Promise<void> {
  return safely(() => Haptics.selectionAsync());
}

export function hapticDraw(): Promise<void> {
  return safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticRevealSettled(): Promise<void> {
  return safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticArrival(): Promise<void> {
  return safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
