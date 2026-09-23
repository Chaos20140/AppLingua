/** Reduzierte Bewegung: App-Einstellung (data-motion) vor Systemeinstellung. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  const attr = document.documentElement.getAttribute('data-motion');
  if (attr === 'reduce') return true;
  if (attr === 'full') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
