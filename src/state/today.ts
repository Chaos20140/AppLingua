/**
 * „Heute“ als reaktiver Wert: aktualisiert sich um Mitternacht und beim Zurückkehren in die App
 * (iOS friert Timer im Hintergrund ein).
 */
import { useSyncExternalStore } from 'react';
import { msUntilNextLocalMidnight, todayKey, type DayKey } from '../engine/dates';

const listeners = new Set<() => void>();
let current: DayKey = todayKey();
let timer: ReturnType<typeof setTimeout> | null = null;

function check() {
  const t = todayKey();
  if (t !== current) {
    current = t;
    listeners.forEach((l) => l());
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { check(); schedule(); }, msUntilNextLocalMidnight());
}

const onVisible = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') { check(); schedule(); } };

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    schedule();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined') window.addEventListener('focus', onVisible);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      if (timer) clearTimeout(timer);
      timer = null;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onVisible);
    }
  };
}

const getSnapshot = () => {
  // Beim Rendern nach langer Pause sofort korrekt sein
  const t = todayKey();
  if (t !== current) current = t;
  return current;
};

/** Heutiger lokaler Kalendertag ("YYYY-MM-DD"), reaktiv. */
export function useToday(): DayKey {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
