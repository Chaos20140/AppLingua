/**
 * Belohnungs-Ereignisse für die UI (Celebration-Overlay, Toasts).
 * Aktionen melden neue Abzeichen und Level-Aufstiege hier – auch solche, die verzögert
 * entstehen (z. B. Song-Abzeichen, sobald der Song-Katalog geladen ist).
 */
export type RewardEvent =
  | { type: 'badges'; badgeIds: string[] }
  | { type: 'level-up'; level: number; title: string }
  | { type: 'xp'; amount: number; reason: string };

type Listener = (e: RewardEvent) => void;
const listeners = new Set<Listener>();

/** Abonnieren; gibt eine Abmeldefunktion zurück. */
export function onReward(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitReward(e: RewardEvent) {
  for (const l of listeners) {
    try { l(e); } catch (err) { console.error('[rewards] Listener-Fehler', err); }
  }
}
