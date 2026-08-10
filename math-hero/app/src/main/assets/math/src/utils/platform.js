/**
 * Utility to detect if the game is running inside an Android WebView container.
 */
export function isAndroidApp() {
  if (typeof window === 'undefined') return false;
  return !!(
    window.isAndroid === true ||
    window.location.hostname === 'appassets.androidplatform.net' ||
    window.location.href.includes('androidplatform.net') ||
    (window.location.protocol === 'file:' && /android/i.test(navigator.userAgent)) ||
    /Android/i.test(navigator.userAgent)
  );
}
