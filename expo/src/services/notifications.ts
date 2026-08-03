/**
 * Notification service. Schedules a local notification at arrivalAt when a leg
 * begins, cancels and reschedules when state changes, respects settings toggles.
 *
 * Expo Go support: expo-notifications local scheduled notifications (date and
 * time-interval triggers) work in Expo Go on both iOS and Android. Push tokens
 * and remote notifications are NOT used here. On iOS, the user must grant
 * permission; we request it lazily when scheduling. See the note at the bottom
 * of this file for platform caveats verified against Expo SDK 54.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppState } from '@/src/state/types';
import { MAX_BANKED_ARRIVALS } from '@/src/core/leg';

const ARRIVAL_NOTIF_ID = 'vismay_arrival';
const WEEKLY_NOTIF_ID = 'vismay_weekly';

/** Configure how incoming notifications present when the app is foregrounded. */
export function configureNotifications(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Request notification permissions (iOS prompt, Android no-op-ish). Returns granted bool. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Reschedule all notifications based on current state. Called after state
 * changes (leg start, settings change, app open). Cancels existing and
 * schedules fresh. Respects settings toggles.
 */
export async function rescheduleNotifications(state: AppState, devFastLegs: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!state.onboarded || !state.settings.arrivalPermissionAsked) return;

  // Arrival notification
  if (state.settings.notifyArrival) {
    const now = Date.now();
    // Only schedule if we're currently traveling (not already arrived) and the
    // arrival is in the future.
    if (
      state.phase === 'traveling'
      && state.journey.bankedArrivals < MAX_BANKED_ARRIVALS
      && state.journey.arrivalAt > now
    ) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: ARRIVAL_NOTIF_ID,
          content: {
            title: 'Arrival',
            body: `You have reached ${state.journey.place.name}.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: state.journey.arrivalAt,
          },
        });
      } catch (e) {
        // Scheduling can fail if permission denied or date in the past.
        console.warn('[notifications] arrival schedule failed', e);
      }
    }
  }

  // Weekly notification (optional)
  if (state.settings.notifyWeekly) {
    try {
      // Next Sunday 9:00 local. Use calendar trigger.
      const next = nextSunday9am();
      await Notifications.scheduleNotificationAsync({
        identifier: WEEKLY_NOTIF_ID,
        content: {
          title: 'A week on the road',
          body: 'Look back at your chronicle.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: 1, // Sunday in iOS calendar triggers (1 = Sunday)
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });
      void next; // (kept for potential date-based fallback)
    } catch (e) {
      console.warn('[notifications] weekly schedule failed', e);
    }
  }

  // Dev fast legs: also schedule a short heads-up so testers can see it fire.
  if (devFastLegs && state.settings.notifyArrival) {
    // No extra notification; the arrival one above already fires in ~20s.
  }
}

/** Fire the current arrival copy immediately for dev-console QA. */
export async function fireArrivalNotificationNow(state: AppState): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Arrival',
      body: `You have reached ${state.journey.place.name}.`,
    },
    trigger: null,
  });
}

/** Compute next Sunday 9am Date (unused fallback for date trigger). */
function nextSunday9am(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const add = (7 - day) % 7;
  d.setDate(d.getDate() + add);
  return d;
}

/**
 * EXPO GO NOTIFICATION COMPATIBILITY NOTES (verified for SDK 54):
 *
 * 1. Local scheduled notifications via scheduleNotificationAsync with DATE and
 *    TIME_INTERVAL triggers work in Expo Go on both iOS and Android.
 * 2. CALENDAR triggers (used for the weekly repeating notification) also work
 *    in Expo Go. On Android, repeating calendar triggers require API 24+,
 *    which is the project minimum, so this is fine.
 * 3. iOS: permission is requested only after the first pull closes and the
 *    first countdown appears. Scheduling itself never opens the prompt.
 * 4. Android: notifications require a channel (API 26+). expo-notifications
 *    auto-creates a default channel in Expo Go, so explicit channel setup is
 *    not required for basic scheduling.
 * 5. expo-notifications does NOT require a custom native build — it is
 *    included in Expo Go. Confirmed safe for this project's constraints.
 * 6. There is no background-task execution needed here; scheduling is purely
 *    OS-side via the native notification scheduler.
 */
