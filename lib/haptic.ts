/**
 * Haptic feedback – vibration on supported devices (e.g. Android Chrome).
 * No-op when unsupported (desktop, iOS Safari).
 */
function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/** Short tap (e.g. button press, tab change) */
export function hapticLight(): void {
  if (isSupported()) navigator.vibrate(10);
}

/** Slightly longer feedback (e.g. success: add country, delete) */
export function hapticSuccess(): void {
  if (isSupported()) navigator.vibrate([10, 50, 10]);
}
