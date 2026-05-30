
function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}


export function hapticLight(): void {
  if (isSupported()) navigator.vibrate(10);
}


export function hapticSuccess(): void {
  if (isSupported()) navigator.vibrate([10, 50, 10]);
}
